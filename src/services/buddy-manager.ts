import { buddyPrompt, buddySchema, validateBuddyQuestion } from '../domain/buddy.ts';
import type { BuddyRepository } from '../adapters/sqlite/buddy.ts';
import type { StudyRuntime } from './study-manager.ts';

export class BuddyManager {
  private state = { busy: false, chat: '', progress: '', error: '' };
  private listeners = new Set<() => void>();
  private runtime: StudyRuntime | null = null;
  private cancelled = false;
  private foreground = true;
  private repository: BuddyRepository;
  private ports: { id(): string; model: string; load(): Promise<StudyRuntime> };
  constructor(repository: BuddyRepository, ports: { id(): string; model: string; load(): Promise<StudyRuntime> }) { this.repository = repository; this.ports = ports; }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<typeof this.state>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  async cancel() { this.cancelled = true; this.update({ progress: 'Stopping local reply…' }); await this.runtime?.stop(); }
  async setForeground(active: boolean) { this.foreground = active; if (!active && this.state.busy) await this.cancel(); }
  private check() { if (this.cancelled || !this.foreground) throw new Error('cancelled'); }
  async run(chat: string, question: string) {
    if (this.state.busy || !this.foreground) return;
    this.cancelled = false;
    this.update({ busy: true, chat, progress: 'Preparing local conversation…', error: '' });
    let id = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      validateBuddyQuestion(question);
      const history = await this.repository.turns(chat);
      id = this.ports.id();
      await this.repository.begin(chat, id, question, this.ports.model);
      this.check(); this.update({ progress: 'Verifying and loading your local AI…' });
      this.runtime = await this.ports.load(); this.check();
      const prompt = await buddyPrompt(question, history, messages => this.runtime!.count(messages));
      await this.repository.context(id, prompt.tokens, prompt.omitted); this.check();
      this.update({ progress: 'AI Buddy is replying on this device…' });
      timer = setTimeout(() => { void this.cancel().catch(() => {}); }, 60000);
      const output = await this.runtime.generate(prompt.messages, buddySchema);
      this.check();
      if (output.truncated) throw new Error('truncated');
      await this.repository.finish(id, output.text);
    } catch {
      const error = this.cancelled ? 'Reply stopped or app left the foreground. Send again to retry.' : 'Could not complete a valid local reply. Check teacher setup, shorten the message, or retry. Other local AI/OCR work must finish first.';
      if (id) await this.repository.stop(id, this.cancelled ? 'cancelled' : 'failed', error).catch(() => {});
      this.update({ error });
    } finally {
      clearTimeout(timer);
      try { await this.runtime?.release(); } catch { this.update({ error: 'Could not release local AI. Restart before continuing.' }); }
      this.runtime = null; this.update({ busy: false, progress: '' });
    }
  }
}
