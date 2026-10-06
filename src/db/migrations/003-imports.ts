import type { Migration } from '../types.ts';

export const importsMigration: Migration = {
  version: 3,
  async apply(database) {
    await database.execAsync(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY NOT NULL, notebook_id TEXT NOT NULL REFERENCES notebooks(id),
        title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('txt','pdf','jpg','png')),
        original_name TEXT NOT NULL UNIQUE, sha256 TEXT, byte_size INTEGER, page_count INTEGER,
        status TEXT NOT NULL CHECK(status IN ('copying','extracting','review','indexing','ready','failed','cancelled','interrupted','duplicate')),
        active_revision_id TEXT REFERENCES document_revisions(id), duplicate_of TEXT REFERENCES documents(id),
        selected INTEGER NOT NULL DEFAULT 1 CHECK(selected IN (0,1)), created_at TEXT NOT NULL,
        UNIQUE(notebook_id, sha256)
      );
      CREATE TABLE document_revisions (
        id TEXT PRIMARY KEY NOT NULL, document_id TEXT NOT NULL REFERENCES documents(id),
        extraction_version TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE import_jobs (
        id TEXT PRIMARY KEY NOT NULL, document_id TEXT NOT NULL REFERENCES documents(id), revision_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('copying','extracting','review','indexing','ready','failed','cancelled','interrupted','duplicate')),
        error_code TEXT, updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX import_one_open_job ON import_jobs(document_id) WHERE status NOT IN ('ready','duplicate');
      CREATE TABLE import_pages (
        job_id TEXT NOT NULL REFERENCES import_jobs(id), page_number INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 10),
        raw_text TEXT NOT NULL, reviewed_text TEXT NOT NULL,
        extraction_method TEXT NOT NULL CHECK(extraction_method IN ('text','pdf-text','pdf-ocr','image-ocr')),
        preview_name TEXT, PRIMARY KEY(job_id,page_number)
      );
      CREATE TABLE pages (
        id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL REFERENCES document_revisions(id),
        page_number INTEGER NOT NULL, raw_text TEXT NOT NULL, reviewed_text TEXT NOT NULL,
        extraction_method TEXT NOT NULL, preview_name TEXT, UNIQUE(revision_id,page_number)
      );
      CREATE TABLE chunks (
        id TEXT PRIMARY KEY NOT NULL, page_id TEXT NOT NULL REFERENCES pages(id), ordinal INTEGER NOT NULL,
        text TEXT NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, token_count INTEGER NOT NULL,
        UNIQUE(page_id,ordinal)
      );
      CREATE VIRTUAL TABLE chunk_search USING fts5(chunk_id UNINDEXED, document_id UNINDEXED, text, tokenize='unicode61');
      CREATE INDEX documents_notebook ON documents(notebook_id,created_at);
      CREATE TRIGGER immutable_page BEFORE UPDATE ON pages BEGIN SELECT RAISE(ABORT,'Published pages are immutable'); END;
      CREATE TRIGGER immutable_revision BEFORE UPDATE ON document_revisions BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
      CREATE TRIGGER immutable_chunk BEFORE UPDATE ON chunks BEGIN SELECT RAISE(ABORT,'Published chunks are immutable'); END;
    `);
  },
};
