from google import genai
import time
from google.genai import types
from sqlalchemy import select
from app.config import settings
from app.db.database import AsyncSessionLocal
from app.models.document import DocumentChunk

client = genai.Client(api_key=settings.gemini_api_key)


def embed_query(text: str):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY",
                    output_dimensionality=768
                )
            )

            return result.embeddings[0].values

        except Exception as e:
            error = str(e)

            if "429" in error or "RESOURCE_EXHAUSTED" in error:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue

            raise


async def retrieve_relevant_docs(
    question: str,
    state: str = None,
    domain: str | None = None,
    top_k: int = 5,
):
    """
    domain: "family_law" | "criminal_law" | None
    None (the default) searches across all domains — deliberate, since a
    single real question (e.g. "cruelty") can genuinely span both a
    criminal-law provision and a family-law one, and hiding one behind a
    forced single-domain filter would give an incomplete answer.
    """
    query_embedding = embed_query(question)

    async with AsyncSessionLocal() as session:
        stmt = (
            select(DocumentChunk)
            .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )

        if domain is not None:
            stmt = stmt.where(DocumentChunk.domain == domain)

        result = await session.execute(stmt)
        chunks = result.scalars().all()

    return [
        {
            "title": c.title,
            "citation": c.citation,
            "text": c.text,
            "domain": c.domain,
        }
        for c in chunks
    ]