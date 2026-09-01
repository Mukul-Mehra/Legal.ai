-- migration: add_domain_column.sql
-- Adds a domain dimension so document_chunks can hold more than family law.
-- personal_law stays as-is but becomes optional (criminal law has no personal_law).

ALTER TABLE document_chunks
    ADD COLUMN domain VARCHAR(50);

-- Backfill existing rows — everything ingested so far is family law
UPDATE document_chunks
    SET domain = 'family_law'
    WHERE domain IS NULL;

-- Make personal_law nullable if it currently has a NOT NULL constraint
ALTER TABLE document_chunks
    ALTER COLUMN personal_law DROP NOT NULL;

-- Optional but recommended: index for the new filter dimension
CREATE INDEX IF NOT EXISTS idx_document_chunks_domain ON document_chunks (domain);
