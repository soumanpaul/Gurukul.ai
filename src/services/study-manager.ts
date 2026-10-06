import { budgetPrompt, insufficient, promptVersion, validateStudy, queryTerms } from '../domain/study.ts';
import type { ChatMessage, StudyAction } from '../domain/study.ts';
import type { StudyRepository } from '../adapters/sqlite/study.ts';
import { safeGenerationError } from '../domain/experience.ts';
export interface StudyRuntime {
  count(messages: ChatMessage[]): Promise<number>;
  generate(messages: ChatMessage[], schema?: object): Promise<{ text: string; truncated: boolean }>;
  stop(): Promise<void>;
  release(): Promise<void>;
}
export class StudyManager {
  private repository: StudyRepository;
  private ports: { id(): string; model: string; load(): Promise<StudyRuntime> };
  private runtime: StudyRuntime | null = null;
  private cancelled = false;
  private foreground = true;
  private listeners = new Set<() => void>();
  private current = { busy: false, progress: '', error: '', notebook: '' };
  constructor(repository: StudyRepository, ports: { id(): string; model: string; load(): Promise<StudyRuntime> }) { this.repository = repository; this.ports = ports; }
  snapshot = () => this.current;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<typeof this.current>) { this.current = { ...this.current, ...patch }; this.listeners.forEach(listener => listener()); }
  private check() { if (this.cancelled || !this.foreground) throw new Error('Cancelled'); }
  async cancel() { this.cancelled = true; this.update({ progress: 'Stopping local generation…' }); await this.runtime?.stop(); }
  async setForeground(active: boolean) { this.foreground = active; if (!active && this.current.busy) await this.cancel(); }
  async run(notebook: string, action: StudyAction, question: string, section?: string) {
    if (this.current.busy || !this.foreground) return;
    this.cancelled = false;
    this.update({ busy: true, notebook, progress: 'Finding selected-source evidence…', error: '' });
    let id = '';
    try {
      if (!question.trim() || question.length > 600 || /[^\x00-\x7F]/.test(question)) throw new Error('Use a short English question (at most 600 characters).');
      if (action === 'summary' && !section) throw new Error('Choose a section to summarize.');
      id = this.ports.id();
      await this.repository.begin({ id, notebook, action, question, model: this.ports.model, prompt: promptVersion });
      const candidates = await this.repository.retrieve(notebook, question, section);
      this.check();
      const relevant = action === 'summary' || candidates.some(item => queryTerms(question).some(term => ((item.text.toLowerCase().match(/[a-z0-9]+/g) ?? []) as string[]).includes(term)));
      if (!candidates.length || !relevant) { await this.repository.finish(id, insufficient); return id; }
      this.update({ progress: 'Verifying and loading the local teacher…' });
      this.runtime = await this.ports.load(); this.check();
      const prompt = await budgetPrompt(action, question, candidates, messages => this.runtime!.count(messages));
      this.check();
      if (!prompt.evidence.length) throw new Error('No excerpt fits the model context. Choose a shorter section.');
      await this.repository.evidence(id, prompt.evidence, prompt.tokens);
      this.check(); this.update({ progress: 'Generating locally; output is hidden until citations validate…' });
      const output = await this.runtime.generate(prompt.messages);
      this.check();
      if (output.truncated) throw new Error('Output reached the token limit. Try a narrower question.');
      let result;
      try { result = validateStudy(output.text, prompt.evidence); }
      catch { throw new Error('The teacher returned an invalid answer or citation. Nothing was published. Retry or choose a different passage.'); }
      this.check(); await this.repository.finish(id, result);
      return id;
    } catch (error) {
      const message = this.cancelled ? 'Generation cancelled; no completed answer was saved.' : safeGenerationError(error);
      if (id) await this.repository.stop(id, this.cancelled ? 'cancelled' : 'failed', message).catch(() => this.update({ error: 'Could not save status. Restart will mark this turn interrupted.' }));
      this.update({ error: this.current.error || message });
    } finally {
      try { await this.runtime?.release(); } catch { this.update({ error: 'Teacher release failed. Restart the app before more native work.' }); }
      this.runtime = null; this.update({ busy: false, progress: '' });
    }
  }
}
