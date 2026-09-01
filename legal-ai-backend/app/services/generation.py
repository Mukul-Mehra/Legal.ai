import asyncio
import time
from google import genai
from app.config import settings
from app.models.schemas import AskResponse, SourceDoc

client = genai.Client(api_key=settings.gemini_api_key)

MODEL = "gemini-3.6-flash"


def build_prompt(question: str, docs: list) -> str:
    context = "\n\n".join([d.get("text", "") for d in docs]) or "No documents retrieved yet."

    return f"""You are a legal information assistant for Indian matrimonial law.
Answer the question using ONLY the statutory context provided below.

Context:
{context}

Question: {question}

Write your answer in Markdown with this structure:

**Short answer** - one or two sentences answering the question directly.

## Governing provision
Name the Act and section that applies, with a one-line explanation.

## Requirements
Use a bulleted list - one condition per line, each on its own line.

## Procedure
Use a numbered list for sequential steps. Omit this section if the question isn't about a process.

## Caveats
Anything the provided context does not resolve.

Rules:
- Cite provisions inline as **Section 13B, Hindu Marriage Act, 1955**.
- Never cite a provision that does not appear in the context above.
- If the context does not answer the question, say so plainly instead of guessing.
- Keep paragraphs to 2-3 sentences. Prefer lists over prose for conditions and steps.
- Do not add a disclaimer; the application already shows one.
"""


async def generate_answer(question: str, docs: list) -> AskResponse:
    """Non-streaming answer. Kept for the original /api/ask endpoint."""
    prompt = build_prompt(question, docs)

    max_retries = 3
    response = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt
            )
            break
        except Exception as e:
            if "503" in str(e) and attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise

    sources = [
        SourceDoc(title=d["title"], citation=d["citation"], excerpt=d["text"][:200])
        for d in docs
    ]

    return AskResponse(answer=response.text, sources=sources)


async def stream_answer(question: str, docs: list):
    """Yields answer text in chunks as Gemini produces them."""
    prompt = build_prompt(question, docs)

    max_retries = 3
    for attempt in range(max_retries):
        emitted = False
        try:
            stream = await client.aio.models.generate_content_stream(
                model=MODEL,
                contents=prompt
            )
            async for chunk in stream:
                if chunk.text:
                    emitted = True
                    yield chunk.text
            return
        except Exception as e:
            # Only safe to retry if nothing was sent yet, otherwise the
            # client would receive the answer's opening text twice.
            if "503" in str(e) and not emitted and attempt < max_retries - 1:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            raise