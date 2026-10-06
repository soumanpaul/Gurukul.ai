import type { Database } from '../../db/types.ts';
import { ftsQuery, validateStudy } from '../../domain/study.ts';
import type { Evidence, StudyAction, StudyResult } from '../../domain/study.ts';
export interface StudyTurn {
  id: string; notebook_id: string; action: StudyAction; question: string;
  status: 'generating' | 'complete' | 'insufficient' | 'cancelled' | 'interrupted' | 'failed';
  evidence_json: string; result_json: string | null; coverage: string; model_version: string; prompt_version: string;
  prompt_tokens: number | null; error: string | null; created_at: string;
}
const columns = `c.id AS chunkId, d.id AS documentId, p.revision_id AS revisionId, p.page_number AS pageNumber,
  d.title, c.text, c.start_offset AS start, c.end_offset AS end`;
const joins = `chunks c JOIN pages p ON p.id=c.page_id JOIN documents d ON d.id=(SELECT document_id FROM document_revisions WHERE id=p.revision_id)`;
export function createStudyRepository(database: Database) {
  return {
    async recover() { await database.runAsync("UPDATE study_turns SET status='interrupted', error='Generation was interrupted. Retry creates a new turn.', updated_at=? WHERE status='generating'", new Date().toISOString()); },
    async sections(notebook: string) {
      return database.getAllAsync<Evidence>(`SELECT ${columns} FROM ${joins} WHERE d.notebook_id=? AND d.selected=1 AND d.active_revision_id=p.revision_id ORDER BY d.created_at,p.page_number,c.ordinal LIMIT 100`, notebook);
    },
    async retrieve(notebook: string, question: string, section?: string) {
      if (section) return database.getAllAsync<Evidence>(`SELECT ${columns} FROM ${joins} WHERE d.notebook_id=? AND d.selected=1 AND d.active_revision_id=p.revision_id AND c.id=?`, notebook, section);
      const query = ftsQuery(question);
      if (!query) return [];
      return database.getAllAsync<Evidence>(`SELECT ${columns} FROM ${joins} JOIN chunk_search ON c.id=chunk_search.chunk_id
        WHERE chunk_search MATCH ? AND d.notebook_id=? AND d.selected=1 AND d.active_revision_id=p.revision_id ORDER BY bm25(chunk_search), c.id LIMIT 16`, query, notebook);
    },
    async begin(input: { id: string; notebook: string; action: StudyAction; question: string; model: string; prompt: string }) {
      const now = new Date().toISOString();
      await database.runAsync(`INSERT INTO study_turns (id,notebook_id,action,question,status,evidence_json,coverage,model_version,prompt_version,created_at,updated_at)
        VALUES (?,?,?,?,'generating','[]',?,?,?,?,?)`, input.id,input.notebook,input.action,input.question,
      input.action === 'summary' ? 'Selected section only; not a whole-document summary.' : 'Selected-source lexical excerpts only.', input.model,input.prompt,now,now);
    },
    async evidence(id: string, evidence: Evidence[], tokens: number) {
      await database.runAsync("UPDATE study_turns SET evidence_json=?,prompt_tokens=?,updated_at=? WHERE id=? AND status='generating'", JSON.stringify(evidence),tokens,new Date().toISOString(),id);
    },
    async finish(id: string, result: StudyResult) {
      await database.withExclusiveTransactionAsync(async transaction => {
        const turn = await transaction.getFirstAsync<StudyTurn>('SELECT * FROM study_turns WHERE id=?',id);
        if (!turn || turn.status !== 'generating') throw new Error('Turn is not active');
        const validated = validateStudy(JSON.stringify(result), JSON.parse(turn.evidence_json));
        await transaction.runAsync('UPDATE study_turns SET status=?,result_json=?,updated_at=? WHERE id=?', validated.status === 'answer' ? 'complete' : 'insufficient', JSON.stringify(validated),new Date().toISOString(),id);
      });
    },
    async stop(id: string, status: 'cancelled' | 'failed', error: string) {
      await database.runAsync("UPDATE study_turns SET status=?,error=?,updated_at=? WHERE id=? AND status='generating'",status,error,new Date().toISOString(),id);
    },
    async history(notebook: string) { return database.getAllAsync<StudyTurn>('SELECT * FROM study_turns WHERE notebook_id=? ORDER BY created_at DESC, rowid DESC LIMIT 100',notebook); },
  };
}
export type StudyRepository = ReturnType<typeof createStudyRepository>;
