"""
ingest_acts.py

Generic, reusable, idempotent ingestion CLI. Replaces the pattern of writing
one hardcoded script per act.

Usage:
    python ingest_acts.py special_marriage
    python ingest_acts.py --all
    python ingest_acts.py            # lists available act keys

Idempotency: before inserting, it checks which citations already exist for
that act's title in document_chunks and skips them — safe to re-run.
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

import pdfplumber
from google import genai
from google.genai import types
from sqlalchemy import select

# --- Adjust these three imports to match your actual project paths ---
from app.config import settings
from app.db.database import AsyncSessionLocal   # your async session factory
from app.models.document import DocumentChunk
# -----------------------------------------------------------------------

from acts_registry import ACTS, ActConfig, get_act

client = genai.Client(api_key=settings.gemini_api_key)


def extract_text(source_path: str) -> str:
    """
    Pull raw text from the act's source file. Supports both .pdf (fresh
    pdfplumber extraction) and .txt (already-extracted/cleaned text).
    Prefer .txt when one already exists for an act — raw government PDFs
    are full of footnote markers and amendment annotations that pollute
    a naive section-split; a pre-cleaned .txt avoids re-introducing that.
    """
    path = Path(source_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Source file not found: {path}. Download the official text from "
            f"India Code (indiacode.nic.in) and place it there first."
        )

    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8")

    full_text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
    return "\n".join(full_text)


def split_into_sections(text: str, config: ActConfig) -> list[dict]:
    """
    Split raw act text into per-section chunks using the act's configured
    regex. Returns a list of {"num": str, "text": str}.
    """
    pattern = re.compile(config.section_pattern)
    matches = list(pattern.finditer(text))

    if not matches:
        raise ValueError(
            f"No section matches found for '{config.key}'. Open the PDF and check "
            f"how sections are actually numbered — section_pattern in "
            f"acts_registry.py needs to match that layout."
        )

    sections = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()

        if len(section_text) < config.min_section_length:
            continue  # likely a table-of-contents line or a stray match

        if config.section_whitelist is not None and match.group("num") not in config.section_whitelist:
            continue  # not in scope for this product — skip large acts' irrelevant sections

        sections.append({"num": match.group("num"), "text": section_text})

    # Acts with a front-matter "ARRANGEMENT OF SECTIONS" table of contents produce
    # a second, short match for each section number (just the title, no body) in
    # addition to the real section later in the text. Keep only the longest match
    # per section number — the real body text is always far longer than a TOC line.
    longest_by_num: dict[str, dict] = {}
    for section in sections:
        existing = longest_by_num.get(section["num"])
        if existing is None or len(section["text"]) > len(existing["text"]):
            longest_by_num[section["num"]] = section

    return list(longest_by_num.values())


def embed_text(text: str) -> list[float]:
    """
    Embed one chunk at 768 dimensions via Gemini.
    task_type="RETRIEVAL_DOCUMENT" matches retrieval.py's query-side
    task_type="RETRIEVAL_QUERY" — Gemini optimizes the embedding space
    differently for queries vs. documents, so both sides must be set
    correctly (not just consistently) or cosine similarity ranks worse.
    """
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )
    return result.embeddings[0].values


async def ingest_act(config: ActConfig) -> None:
    print(f"\n=== Ingesting: {config.title} ===")

    raw_text = extract_text(config.pdf_path)
    sections = split_into_sections(raw_text, config)
    if config.section_whitelist is not None:
        print(f"Found {len(sections)} sections in whitelist (out of the act's full text).")
    else:
        print(f"Found {len(sections)} candidate sections.")

    async with AsyncSessionLocal() as session:
        existing_result = await session.execute(
            select(DocumentChunk.citation).where(DocumentChunk.title == config.title)
        )
        existing_citations = {row[0] for row in existing_result.all()}

        inserted, skipped = 0, 0

        for section in sections:
            citation = config.citation_template.format(num=section["num"])

            if citation in existing_citations:
                skipped += 1
                continue

            embedding = embed_text(section["text"])

            chunk = DocumentChunk(
                source_type="act",
                domain=config.domain,
                personal_law=config.personal_law,
                title=config.title,
                citation=citation,
                text=section["text"],
                embedding=embedding,
            )
            session.add(chunk)
            inserted += 1

        await session.commit()
        print(f"Inserted {inserted} new sections, skipped {skipped} already present.")


async def main():
    parser = argparse.ArgumentParser(description="Ingest Indian personal-law acts into pgvector.")
    parser.add_argument("act_key", nargs="?", help="Key from acts_registry.py, e.g. 'special_marriage'")
    parser.add_argument("--all", action="store_true", help="Ingest every act currently in the registry")
    args = parser.parse_args()

    if args.all:
        for config in ACTS.values():
            await ingest_act(config)
    elif args.act_key:
        await ingest_act(get_act(args.act_key))
    else:
        print("Specify an act key, or --all. Available acts:")
        for key in ACTS:
            print(f"  - {key}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())