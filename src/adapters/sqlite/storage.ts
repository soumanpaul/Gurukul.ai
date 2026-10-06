import type { Database, SqlExecutor } from '../../db/types.ts';

export type RemovalTarget = { kind: 'source' | 'notebook'; id: string };
type Document = { id: string; notebook_id: string; original_name: string; duplicate_of: string | null };
type Snapshot = { id: string; evidence_json: string };
export function ownedFile(name: string) {
  return /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(name) && !name.includes('..');
}
async function idle(transaction: SqlExecutor) {
  const active = await transaction.getFirstAsync(`SELECT id FROM import_jobs WHERE status IN ('copying','extracting','indexing')
    UNION ALL SELECT id FROM study_turns WHERE status='generating'
    UNION ALL SELECT id FROM quizzes WHERE status='generating' LIMIT 1`);
  if (active) throw new Error('BUSY');
}
async function removalPlan(transaction: SqlExecutor, target: RemovalTarget) {
  await idle(transaction);
  const notebook = target.kind === 'notebook' ? target.id
    : (await transaction.getFirstAsync<Document>('SELECT * FROM documents WHERE id=?', target.id))?.notebook_id;
  if (!notebook || !await transaction.getFirstAsync('SELECT id FROM notebooks WHERE id=?', notebook)) throw new Error('MISSING');
  const documents = await transaction.getAllAsync<Document>('SELECT * FROM documents WHERE notebook_id=? ORDER BY id', notebook);
  const selected = new Set(target.kind === 'notebook' ? documents.map(row => row.id) : [target.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of documents) if (row.duplicate_of && selected.has(row.duplicate_of) && !selected.has(row.id)) { selected.add(row.id); changed = true; }
  }
  function affected(row: Snapshot) {
    if (target.kind === 'notebook') return true;
    const evidence: unknown = JSON.parse(row.evidence_json);
    if (!Array.isArray(evidence) || evidence.some(item => !item || typeof item.documentId !== 'string')) throw new Error('INVALID_HISTORY');
    return evidence.some(item => selected.has(item.documentId));
  }
  const turns = (await transaction.getAllAsync<Snapshot>('SELECT id,evidence_json FROM study_turns WHERE notebook_id=? ORDER BY id', notebook)).filter(affected).map(row => row.id);
  const quizzes = new Set((await transaction.getAllAsync<Snapshot>('SELECT id,evidence_json FROM quizzes WHERE notebook_id=? ORDER BY id', notebook)).filter(affected).map(row => row.id));
  const repeats = await transaction.getAllAsync<{quiz_id: string; parent_quiz_id: string}>('SELECT * FROM quiz_repeats');
  changed = true;
  while (changed) {
    changed = false;
    for (const row of repeats) if (quizzes.has(row.parent_quiz_id) && !quizzes.has(row.quiz_id)) { quizzes.add(row.quiz_id); changed = true; }
  }
  let attempts = 0;
  for (const id of quizzes) attempts += (await transaction.getAllAsync('SELECT id FROM attempts WHERE quiz_id=?', id)).length;
  return { target, documents: documents.filter(row => selected.has(row.id)), turns, quizzes: [...quizzes].sort(), attempts };
}
async function queue(transaction: SqlExecutor, filename: string) {
  if (!ownedFile(filename)) throw new Error('INVALID_FILE');
  await transaction.runAsync('INSERT OR IGNORE INTO file_cleanup(filename,created_at) VALUES (?,?)', filename, new Date().toISOString());
}
export function createStorageRepository(database: Database) {
  return {
    async preview(target: RemovalTarget) {
      let result!: Awaited<ReturnType<typeof removalPlan>>;
      await database.withExclusiveTransactionAsync(async transaction => { result = await removalPlan(transaction, target); });
      return { token: JSON.stringify(result), sources: result.documents.length, turns: result.turns.length, quizzes: result.quizzes.length, attempts: result.attempts };
    },
    async remove(target: RemovalTarget, confirmedToken: string) {
      await database.withExclusiveTransactionAsync(async transaction => {
        const plan = await removalPlan(transaction, target);
        if (JSON.stringify(plan) !== confirmedToken) throw new Error('CHANGED');
        for (const id of plan.quizzes) {
          await transaction.runAsync('DELETE FROM quiz_repeats WHERE quiz_id=? OR parent_quiz_id=?', id, id);
          await transaction.runAsync('DELETE FROM progress_flags WHERE attempt_id IN (SELECT id FROM attempts WHERE quiz_id=?)', id);
          await transaction.runAsync('DELETE FROM responses WHERE attempt_id IN (SELECT id FROM attempts WHERE quiz_id=?)', id);
          await transaction.runAsync('DELETE FROM attempts WHERE quiz_id=?', id);
          await transaction.runAsync('DELETE FROM quiz_items WHERE quiz_id=?', id);
          await transaction.runAsync('DELETE FROM quizzes WHERE id=?', id);
        }
        for (const id of plan.turns) await transaction.runAsync('DELETE FROM study_turns WHERE id=?', id);
        for (const source of plan.documents) await transaction.runAsync('UPDATE documents SET active_revision_id=NULL,duplicate_of=NULL WHERE id=?', source.id);
        for (const source of plan.documents) {
          if (!/^source-[A-Za-z0-9-]+\.(txt|pdf|jpg|png)$/.test(source.original_name)) throw new Error('INVALID_FILE');
          await queue(transaction, source.original_name);
          await queue(transaction, `${source.original_name}.partial`);
          for (let page = 1; page <= 10; page++) await queue(transaction, `${source.original_name}-p${page}.jpg`);
          await transaction.runAsync('DELETE FROM chunk_search WHERE document_id=?', source.id);
          await transaction.runAsync('DELETE FROM chunks WHERE page_id IN (SELECT p.id FROM pages p JOIN document_revisions r ON r.id=p.revision_id WHERE r.document_id=?)', source.id);
          await transaction.runAsync('DELETE FROM pages WHERE revision_id IN (SELECT id FROM document_revisions WHERE document_id=?)', source.id);
          await transaction.runAsync('DELETE FROM document_revisions WHERE document_id=?', source.id);
          await transaction.runAsync('DELETE FROM import_pages WHERE job_id IN (SELECT id FROM import_jobs WHERE document_id=?)', source.id);
          await transaction.runAsync('DELETE FROM import_jobs WHERE document_id=?', source.id);
          await transaction.runAsync('DELETE FROM documents WHERE id=?', source.id);
        }
        if (target.kind === 'notebook') await transaction.runAsync('DELETE FROM notebooks WHERE id=?', target.id);
      });
    },
    async removeModel(id: string, filename: string | null, partial: string | null) {
      await database.withExclusiveTransactionAsync(async transaction => {
        await idle(transaction);
        const record = await transaction.getFirstAsync<{filename: string | null; partial: string | null}>('SELECT filename,partial FROM model_installations WHERE id=?', id);
        if (!record || record.filename !== filename || record.partial !== partial) throw new Error('CHANGED');
        for (const name of [filename, partial]) if (name) {
          if (!ownedFile(name) || !(/\.gguf$/.test(name) || /^download-[A-Za-z0-9-]+\.partial$/.test(name))) throw new Error('INVALID_FILE');
          await queue(transaction, name);
        }
        await transaction.runAsync('DELETE FROM model_installations WHERE id=?', id);
      });
    },
    pending: () => database.getAllAsync<{filename: string; attempts: number; error_code: string | null}>('SELECT filename,attempts,error_code FROM file_cleanup ORDER BY created_at,filename'),
    async cleanup(removeFile: (filename: string) => Promise<void>) {
      const jobs = await database.getAllAsync<{filename: string}>('SELECT filename FROM file_cleanup ORDER BY created_at,filename');
      for (const job of jobs) {
        try {
          if (!ownedFile(job.filename)) throw new Error('INVALID_FILE');
          await removeFile(job.filename);
          await database.runAsync('DELETE FROM file_cleanup WHERE filename=?', job.filename);
        } catch {
          await database.runAsync("UPDATE file_cleanup SET attempts=attempts+1,error_code='CLEANUP_FAILED' WHERE filename=?", job.filename);
        }
      }
    },
  };
}
