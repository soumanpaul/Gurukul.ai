import type { Database } from '../../db/types.ts';
import { ImportFailure, importLimits, pageChunks, reviewedText, sourceTitle } from '../../domain/imports.ts';
import type { DraftPage, ImportJob, ImportStatus, Source, SourceInfo, SourceKind } from '../../domain/imports.ts';

export function createImportRepository(database: Database) {
  async function source(id: string) {
    const result = await database.getFirstAsync<Source>('SELECT * FROM documents WHERE id = ?', id);
    if (!result) throw new ImportFailure('MISSING');
    return result;
  }
  async function job(id: string) {
    const result = await database.getFirstAsync<ImportJob>('SELECT * FROM import_jobs WHERE id = ?', id);
    if (!result) throw new ImportFailure('MISSING');
    return result;
  }
  async function pages(jobId: string) {
    return database.getAllAsync<DraftPage>('SELECT page_number,raw_text,reviewed_text,extraction_method,preview_name FROM import_pages WHERE job_id = ? ORDER BY page_number', jobId);
  }
  async function transition(jobId: string, status: ImportStatus, code: string | null = null) {
    await database.withExclusiveTransactionAsync(async transaction => {
      const current = await transaction.getFirstAsync<ImportJob>('SELECT * FROM import_jobs WHERE id = ?', jobId);
      if (!current || current.status === 'ready' || current.status === 'duplicate') throw new ImportFailure('FAILED');
      await transaction.runAsync('UPDATE import_jobs SET status=?,error_code=?,updated_at=? WHERE id=?', status, code, new Date().toISOString(), jobId);
      await transaction.runAsync('UPDATE documents SET status=? WHERE id=?', status, current.document_id);
    });
  }
  return {
    source, job, pages, transition,
    async recover() {
      await database.withExclusiveTransactionAsync(async transaction => {
        await transaction.execAsync(`UPDATE documents SET status='interrupted' WHERE id IN
          (SELECT document_id FROM import_jobs WHERE status IN ('copying','extracting','indexing'));
          UPDATE import_jobs SET status='interrupted', error_code='INTERRUPTED' WHERE status IN ('copying','extracting','indexing');`);
      });
    },
    async createNotebook(id: string, title: string) {
      await database.runAsync('INSERT INTO notebooks (id,title,created_at) VALUES (?,?,?)', id, sourceTitle(title), new Date().toISOString());
    },
    async list(notebookId: string) {
      return database.getAllAsync<Source>('SELECT * FROM documents WHERE notebook_id=? ORDER BY created_at DESC', notebookId);
    },
    async latestJob(documentId: string) {
      const result = await database.getFirstAsync<ImportJob>('SELECT * FROM import_jobs WHERE document_id=? ORDER BY updated_at DESC, rowid DESC LIMIT 1', documentId);
      if (!result) throw new ImportFailure('MISSING');
      return result;
    },
    async create(input: { id: string; jobId: string; revisionId: string; notebookId: string; title: string; kind: SourceKind; filename: string }) {
      await database.withExclusiveTransactionAsync(async transaction => {
        await transaction.runAsync(`INSERT INTO documents (id,notebook_id,title,kind,original_name,status,created_at) VALUES (?,?,?,?,?,'copying',?)`,
          input.id, input.notebookId, sourceTitle(input.title), input.kind, input.filename, new Date().toISOString());
        await transaction.runAsync(`INSERT INTO import_jobs (id,document_id,revision_id,status,updated_at) VALUES (?,?,?,'copying',?)`,
          input.jobId, input.id, input.revisionId, new Date().toISOString());
      });
    },
    async inspected(jobId: string, info: SourceInfo) {
      if (!/^[a-f0-9]{64}$/.test(info.sha256) || !Number.isSafeInteger(info.bytes) || info.bytes < 1 || info.bytes > importLimits.bytes
        || !Number.isInteger(info.pages) || info.pages < 1 || info.pages > importLimits.pages) throw new ImportFailure('LIMIT');
      let duplicate: string | null = null;
      await database.withExclusiveTransactionAsync(async transaction => {
        const current = await transaction.getFirstAsync<Source>('SELECT d.* FROM documents d JOIN import_jobs j ON j.document_id=d.id WHERE j.id=?', jobId);
        if (!current) throw new ImportFailure('MISSING');
        if (current.sha256 && current.sha256 !== info.sha256) throw new ImportFailure('FORMAT');
        const match = await transaction.getFirstAsync<{ id: string }>('SELECT id FROM documents WHERE notebook_id=? AND sha256=? AND id<>?', current.notebook_id, info.sha256, current.id);
        duplicate = match?.id ?? null;
        await transaction.runAsync('UPDATE documents SET sha256=?,byte_size=?,page_count=?,duplicate_of=?,status=? WHERE id=?',
          duplicate ? null : info.sha256, info.bytes, info.pages, duplicate, duplicate ? 'duplicate' : 'extracting', current.id);
        await transaction.runAsync('UPDATE import_jobs SET status=?,error_code=NULL,updated_at=? WHERE id=?', duplicate ? 'duplicate' : 'extracting', new Date().toISOString(), jobId);
      });
      return duplicate;
    },
    async addPage(jobId: string, page: DraftPage) {
      if (page.raw_text.length > importLimits.textCharacters || !['text','pdf-text','pdf-ocr','image-ocr'].includes(page.extraction_method)) throw new ImportFailure('LIMIT');
      await database.runAsync(`INSERT INTO import_pages (job_id,page_number,raw_text,reviewed_text,extraction_method,preview_name)
        VALUES (?,?,?,?,?,?) ON CONFLICT(job_id,page_number) DO NOTHING`, jobId, page.page_number, page.raw_text, page.reviewed_text, page.extraction_method, page.preview_name);
    },
    async saveDraft(jobId: string, pageNumber: number, text: string) {
      if (text.length > importLimits.textCharacters) throw new ImportFailure('LIMIT');
      const result = await database.runAsync(`UPDATE import_pages SET reviewed_text=? WHERE job_id=? AND page_number=?
        AND EXISTS(SELECT 1 FROM import_jobs WHERE id=? AND status='review')`, text, jobId, pageNumber, jobId);
      if (result.changes !== 1) throw new ImportFailure('FAILED');
    },
    async publish(jobId: string) {
      await database.withExclusiveTransactionAsync(async transaction => {
        const current = await transaction.getFirstAsync<ImportJob>('SELECT * FROM import_jobs WHERE id=?', jobId);
        if (!current) throw new ImportFailure('MISSING');
        if (current.status === 'ready') return;
        if (current.status !== 'review') throw new ImportFailure('FAILED');
        const document = await transaction.getFirstAsync<Source>('SELECT * FROM documents WHERE id=?', current.document_id);
        const draft = await transaction.getAllAsync<DraftPage>('SELECT * FROM import_pages WHERE job_id=? ORDER BY page_number', jobId);
        if (!document?.sha256 || draft.length !== document.page_count || draft.some((page, index) => page.page_number !== index + 1)) throw new ImportFailure('FAILED');
        for (const page of draft) reviewedText(page.reviewed_text);
        await transaction.runAsync('INSERT INTO document_revisions VALUES (?,?,?,?)', current.revision_id, document.id, 't3-english-1', new Date().toISOString());
        await transaction.runAsync('DELETE FROM chunk_search WHERE document_id=?', document.id);
        for (const page of draft) {
          const pageId = `${current.revision_id}:${page.page_number}`;
          await transaction.runAsync('INSERT INTO pages VALUES (?,?,?,?,?,?,?)', pageId, current.revision_id, page.page_number, page.raw_text, page.reviewed_text, page.extraction_method, page.preview_name);
          for (const chunk of pageChunks(page.reviewed_text)) {
            const chunkId = `${pageId}:${chunk.ordinal}`;
            await transaction.runAsync('INSERT INTO chunks VALUES (?,?,?,?,?,?,?)', chunkId, pageId, chunk.ordinal, chunk.text, chunk.start, chunk.end, chunk.tokenEstimate);
            await transaction.runAsync('INSERT INTO chunk_search (chunk_id,document_id,text) VALUES (?,?,?)', chunkId, document.id, chunk.text);
          }
        }
        await transaction.runAsync("UPDATE documents SET active_revision_id=?,status='ready' WHERE id=?", current.revision_id, document.id);
        await transaction.runAsync("UPDATE import_jobs SET status='ready',error_code=NULL,updated_at=? WHERE id=?", new Date().toISOString(), jobId);
      });
    },
    async revise(documentId: string, jobId: string, revisionId: string) {
      await database.withExclusiveTransactionAsync(async transaction => {
        const current = await transaction.getFirstAsync<Source>('SELECT * FROM documents WHERE id=?', documentId);
        if (!current?.active_revision_id || current.status !== 'ready') throw new ImportFailure('FAILED');
        await transaction.runAsync("INSERT INTO import_jobs (id,document_id,revision_id,status,updated_at) VALUES (?,?,?,'review',?)", jobId, documentId, revisionId, new Date().toISOString());
        await transaction.runAsync(`INSERT INTO import_pages SELECT ?,page_number,raw_text,reviewed_text,extraction_method,preview_name FROM pages WHERE revision_id=?`, jobId, current.active_revision_id);
        await transaction.runAsync("UPDATE documents SET status='review' WHERE id=?", documentId);
      });
    },
    async select(documentId: string, selected: boolean) { await database.runAsync('UPDATE documents SET selected=? WHERE id=?', selected ? 1 : 0, documentId); },
    async search(notebookId: string, query: string) {
      const terms = query.match(/[A-Za-z0-9]+/g)?.slice(0, 8);
      if (!terms?.length) return [];
      return database.getAllAsync<{ document_id: string; title: string; page_number: number; text: string; revision_id: string }>(`
        SELECT d.id AS document_id,d.title,p.page_number,c.text,p.revision_id FROM chunk_search
        JOIN chunks c ON c.id=chunk_search.chunk_id JOIN pages p ON p.id=c.page_id
        JOIN documents d ON d.id=chunk_search.document_id AND d.active_revision_id=p.revision_id
        WHERE chunk_search MATCH ? AND d.notebook_id=? AND d.selected=1 ORDER BY rank LIMIT 20`,
      terms.map(term => `"${term}"`).join(' AND '), notebookId);
    },
  };
}
export type ImportRepository = ReturnType<typeof createImportRepository>;
