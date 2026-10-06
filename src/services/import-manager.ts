import type { ImportRepository } from '../adapters/sqlite/imports.ts';
import { ImportFailure, importMessage } from '../domain/imports.ts';
import type { DraftPage, SourceInfo, SourceKind } from '../domain/imports.ts';

export interface ImportPorts {
  id(): string;
  copy(input: { uri?: string; text?: string }, filename: string): Promise<void>;
  inspect(filename: string, kind: SourceKind): Promise<SourceInfo>;
  page(filename: string, kind: SourceKind, number: number): Promise<Omit<DraftPage, 'page_number' | 'reviewed_text'>>;
  claim(): () => void;
}
export class ImportManager {
  private repository: ImportRepository;
  private ports: ImportPorts;
  private cancelled = false;
  private foreground = true;
  private listeners = new Set<() => void>();
  private current = { busy: false, progress: '', error: '', jobId: '' };
  constructor(repository: ImportRepository, ports: ImportPorts) { this.repository = repository; this.ports = ports; }
  snapshot = () => this.current;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<typeof this.current>) { this.current = { ...this.current, ...patch }; this.listeners.forEach(listener => listener()); }
  cancel() { this.cancelled = true; this.update({ progress: 'Stopping after the current file/page operation…' }); }
  setForeground(active: boolean) { this.foreground = active; if (!active && this.current.busy) this.cancel(); }
  private checkpoint() { if (this.cancelled || !this.foreground) throw new ImportFailure('INTERRUPTED'); }
  async start(input: { notebookId: string; title: string; kind: SourceKind; uri?: string; text?: string }) {
    return this.run(async () => {
      const id = this.ports.id(); const jobId = this.ports.id(); const revisionId = this.ports.id();
      const filename = `source-${id}.${input.kind}`;
      await this.repository.create({ id, jobId, revisionId, notebookId: input.notebookId, title: input.title, kind: input.kind, filename });
      this.update({ jobId, progress: 'Copying into private storage…' });
      this.checkpoint();
      await this.ports.copy(input, filename);
      this.checkpoint();
      await this.extract(jobId);
      return jobId;
    });
  }
  async retry(jobId: string) {
    return this.run(async () => {
      this.update({ jobId });
      const job = await this.repository.job(jobId);
      if (!['failed','cancelled','interrupted','copying','extracting'].includes(job.status)) return jobId;
      await this.extract(jobId);
      return jobId;
    });
  }
  private async extract(jobId: string) {
    const job = await this.repository.job(jobId);
    const source = await this.repository.source(job.document_id);
    this.update({ progress: 'Checking signature, limits and duplicate content…' });
    const info = await this.ports.inspect(source.original_name, source.kind);
    this.checkpoint();
    const duplicate = await this.repository.inspected(jobId, info);
    if (duplicate) { this.update({ progress: 'Already in this notebook. Reuse the original source.' }); return; }
    const completed = await this.repository.pages(jobId);
    for (let number = 1; number <= info.pages; number++) {
      this.checkpoint();
      if (completed.some(page => page.page_number === number)) continue;
      this.update({ progress: `Reading page ${number} of ${info.pages} locally…` });
      const page = await this.ports.page(source.original_name, source.kind, number);
      this.checkpoint();
      await this.repository.addPage(jobId, { ...page, page_number: number, reviewed_text: page.raw_text });
    }
    this.checkpoint();
    await this.repository.transition(jobId, 'review');
    this.update({ progress: 'Review every page before saving to search.' });
  }
  private async run(work: () => Promise<string>) {
    if (this.current.busy) return null;
    this.cancelled = false;
    this.update({ busy: true, error: '', jobId: '', progress: '' });
    let release: (() => void) | undefined;
    try {
      this.checkpoint();
      try { release = this.ports.claim(); } catch { throw new ImportFailure('BUSY'); }
      return await work();
    } catch (error) {
      const code = error instanceof ImportFailure ? error.code : 'FAILED';
      if (this.current.jobId) {
        try { await this.repository.transition(this.current.jobId, code === 'INTERRUPTED' ? 'cancelled' : 'failed', code); }
        catch { this.update({ error: importMessage('STORAGE') }); }
      }
      this.update({ error: this.current.error || importMessage(code), progress: '' });
      return null;
    } finally { release?.(); this.update({ busy: false }); }
  }
}
