import type { Database } from '../../db/types.ts';
import { buddyPromptVersion, validateBuddy, validateBuddyQuestion } from '../../domain/buddy.ts';

export type BuddyChat = { id: string; title: string; created_at: string; updated_at: string };
export type BuddyTurn = { id: string; chat_id: string; question: string; answer: string | null; status: 'generating' | 'complete' | 'failed' | 'cancelled' | 'interrupted'; error: string | null; model_version: string; prompt_version: string; prompt_tokens: number | null; omitted_turns: number; created_at: string };
export function createBuddyRepository(database: Database) {
  return {
    async recover() { await database.runAsync("UPDATE buddy_turns SET status='interrupted', error='Reply interrupted. Send again to retry.' WHERE status='generating'"); },
    async chats() { return database.getAllAsync<BuddyChat>('SELECT * FROM buddy_chats ORDER BY updated_at DESC,id DESC'); },
    async turns(chat: string) { return database.getAllAsync<BuddyTurn>('SELECT * FROM buddy_turns WHERE chat_id=? ORDER BY created_at,rowid', chat); },
    async begin(chat: string, id: string, question: string, model: string) {
      const text = validateBuddyQuestion(question);
      await database.withExclusiveTransactionAsync(async transaction => {
        const now = new Date().toISOString();
        await transaction.runAsync('INSERT OR IGNORE INTO buddy_chats (id,title,created_at,updated_at) VALUES (?,?,?,?)', chat, text.slice(0, 60), now, now);
        await transaction.runAsync("INSERT INTO buddy_turns (id,chat_id,question,status,model_version,prompt_version,created_at) VALUES (?,?,?,'generating',?,?,?)", id, chat, text, model, buddyPromptVersion, now);
        await transaction.runAsync('UPDATE buddy_chats SET updated_at=? WHERE id=?', now, chat);
      });
    },
    async context(id: string, tokens: number, omitted: number) { await database.runAsync("UPDATE buddy_turns SET prompt_tokens=?, omitted_turns=? WHERE id=? AND status='generating'", tokens, omitted, id); },
    async finish(id: string, text: string) {
      const answer = validateBuddy(text);
      await database.withExclusiveTransactionAsync(async transaction => {
        const row = await transaction.getFirstAsync<BuddyTurn>('SELECT * FROM buddy_turns WHERE id=?', id);
        if (!row || row.status !== 'generating') throw new Error('Reply is not active');
        await transaction.runAsync("UPDATE buddy_turns SET status='complete',answer=?,error=NULL WHERE id=?", answer, id);
        await transaction.runAsync('UPDATE buddy_chats SET updated_at=? WHERE id=?', new Date().toISOString(), row.chat_id);
      });
    },
    async stop(id: string, status: 'failed' | 'cancelled', error: string) { await database.runAsync("UPDATE buddy_turns SET status=?,error=? WHERE id=? AND status='generating'", status, error, id); },
    async remove(chat: string) {
      await database.withExclusiveTransactionAsync(async transaction => {
        if (await transaction.getFirstAsync("SELECT id FROM buddy_turns WHERE chat_id=? AND status='generating'", chat)) throw new Error('Wait for the reply to finish.');
        await transaction.runAsync('DELETE FROM buddy_chats WHERE id=?', chat);
      });
    },
  };
}
export type BuddyRepository = ReturnType<typeof createBuddyRepository>;
