"""
acts_registry.py

Central registry of Indian acts to ingest, across both family law and
(now) criminal law. Add a new act by adding one entry here.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ActConfig:
    key: str                       # CLI identifier
    title: str                     # display title, must match DocumentChunk.title
    domain: str                    # "family_law" | "criminal_law" | "general" | etc.
    personal_law: Optional[str]    # only meaningful for family_law acts; None otherwise
    pdf_path: str
    section_pattern: str           # regex; must capture the section number in group 'num'
    citation_template: str
    min_section_length: int = 30
    section_whitelist: Optional[set[str]] = None
    # If set, ONLY these section numbers are ingested — use this for a large
    # act (like the BNS, 358 sections) where you only want a relevant subset.


ACTS: dict[str, ActConfig] = {
    "hindu_marriage": ActConfig(
        key="hindu_marriage",
        title="Hindu Marriage Act, 1955",
        domain="family_law",
        personal_law="hindu",
        pdf_path="../legal-docs/acts/hindu_marriage_act_1955.txt",
        section_pattern=r"(?m)^\s*(?P<num>\d{1,3}[A-Z]?)\.\s+",
        citation_template="Section {num}, Hindu Marriage Act, 1955",
    ),
    "special_marriage": ActConfig(
        key="special_marriage",
        title="Special Marriage Act, 1954",
        domain="family_law",
        personal_law="special_marriage",
        pdf_path="../legal-docs/acts/special_marriage_act_1954.pdf",
        section_pattern=r"(?m)^\s*(?P<num>\d{1,3}[A-Z]?)\.\s+",
        citation_template="Section {num}, Special Marriage Act, 1954",
    ),
    "dowry_prohibition": ActConfig(
        key="dowry_prohibition",
        title="Dowry Prohibition Act, 1961",
        domain="general",
        personal_law=None,
        pdf_path="../legal-docs/acts/dowry_prohibition_act_1961.pdf",
        section_pattern=r"(?m)^\s*(?P<num>\d{1,2}[A-Z]?)\.\s+",
        citation_template="Section {num}, Dowry Prohibition Act, 1961",
    ),
    # --- New: criminal law, scoped to gender/domestic offences ---
    # Full BNS has 358 sections covering all of criminal law (theft, murder,
    # treason, etc.) — ingesting all of it would dilute retrieval for a
    # product scoped to matrimonial/domestic situations. The whitelist below
    # keeps it to the sections that actually matter for this product.
    "bns_domestic_offences": ActConfig(
        key="bns_domestic_offences",
        title="Bharatiya Nyaya Sanhita, 2023",
        domain="criminal_law",
        personal_law=None,
        pdf_path="../legal-docs/acts/bharatiya_nyaya_sanhita_2023.pdf",
        section_pattern=r"(?m)^\s*(?P<num>\d{1,3}[A-Z]?)\.\s+",
        citation_template="Section {num}, Bharatiya Nyaya Sanhita, 2023",
        section_whitelist={
            "74",   # Assault/criminal force to woman, intent to outrage modesty (was IPC 354)
            "75",   # Sexual harassment (was IPC 354A)
            "76",   # Assault/criminal force with intent to disrobe (was IPC 354B)
            "77",   # Voyeurism (was IPC 354C)
            "78",   # Stalking (was IPC 354D)
            "79",   # Word/gesture/act intended to insult modesty of a woman (was IPC 509)
            "80",   # Dowry death (was IPC 304B)
            "85",   # Cruelty by husband or relatives — the offence (was IPC 498A)
            "86",   # Cruelty — definition (paired with 85; cite together)
            "351",  # Criminal intimidation (was IPC 506)
        },
    ),
}


def get_act(key: str) -> ActConfig:
    if key not in ACTS:
        available = ", ".join(ACTS.keys())
        raise KeyError(f"Unknown act '{key}'. Available: {available}")
    return ACTS[key]