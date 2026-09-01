import asyncio
import re
from google import genai
from google.genai import types
from app.config import settings
from app.db.database import AsyncSessionLocal
from app.models.document import DocumentChunk

client = genai.Client(api_key=settings.gemini_api_key)

SOURCE_FILE = r"D:\legal-ai\legal-docs\acts\hindu_marriage_act_1955.txt"
ACT_NAME = "Hindu Marriage Act, 1955"
PERSONAL_LAW = "hindu"

# Matches section headers like "13B. Divorce by mutual consent.—"
SECTION_PATTERN = re.compile(r'\n(\d+[A-Z]?)\.\s+([^.\n]+)\.—', re.MULTILINE)

def clean_line(line: str) -> bool:
    """Return True if line should be KEPT (not junk)."""
    stripped = line.strip()
    if not stripped:
        return False
    if stripped.isdigit():          # bare page numbers
        return False
    if re.match(r'^\d+\.\s', stripped) and len(stripped) < 15:
        return False                # short footnote reference lines
    return True

def load_and_clean_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    kept = [line for line in lines if clean_line(line)]
    return "\n".join(kept)

def split_into_sections(text: str):
    """Split text into (section_number, section_title, section_text) tuples."""
    matches = list(SECTION_PATTERN.finditer(text))
    sections = []
    for i, match in enumerate(matches):
        section_num = match.group(1)
        section_title = match.group(2).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()
        # Skip absurdly short captures (likely false-positive matches)
        if len(section_text) < 30:
            continue
        sections.append((section_num, section_title, section_text))
    return sections

def embed_text(text: str):
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768
        )
    )
    return result.embeddings[0].values

async def ingest():
    raw_text = load_and_clean_text(SOURCE_FILE)
    sections = split_into_sections(raw_text)

    print(f"Found {len(sections)} sections. Embedding and storing...")

    async with AsyncSessionLocal() as session:
        for section_num, section_title, section_text in sections:
            embedding = embed_text(section_text)

            chunk = DocumentChunk(
                source_type="act",
                personal_law=PERSONAL_LAW,
                title=f"{ACT_NAME} — Section {section_num}",
                citation=f"Section {section_num}, {ACT_NAME}",
                text=section_text,
                embedding=embedding
            )
            session.add(chunk)
            print(f"  Added Section {section_num}: {section_title}")

        await session.commit()

    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(ingest())