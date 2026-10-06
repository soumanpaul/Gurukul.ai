import { emptyInstallation, promotedModelName, requiredModelStorage, validateManifest } from '../domain/model.ts';
import type { Installation, ModelManifest, ModelState } from '../domain/model.ts';

export interface LocalContext {
  answer(): Promise<{ answer: string; firstTokenMs: number | null; completionMs: number }>;
  stop(): Promise<void>;
  release(): Promise<void>;
}
export interface ModelPorts {
  read(): Promise<Installation | null>;
  save(record: Installation): Promise<void>;
  exists(name: string): Promise<boolean>;
  freeBytes(): Promise<number>;
  uniqueName(): string;
  download(name: string, progress: (bytes: number) => void, signal: AbortSignal): Promise<void>;
  verify(name: string): Promise<string>;
  promote(partial: string, filename: string): Promise<void>;
  load(path: string): Promise<LocalContext>;
}

export class ModelManager {
  private ports: ModelPorts;
  private manifest: ModelManifest;
  private listeners = new Set<() => void>();
  private context: LocalContext | null = null;
  private interrupted = false;
  private foreground = true;
  private controller: AbortController | null = null;
  private current: ModelState = { ...emptyInstallation, phase: 'absent', busy: false, message: 'Set up the teacher to enable local AI. Notes remain available offline.' };
  constructor(manifest: ModelManifest, ports: ModelPorts) {
    validateManifest(manifest);
    this.manifest = manifest;
    this.ports = ports;
  }
  snapshot = () => this.current;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<ModelState>) {
    this.current = { ...this.current, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private async persist(patch: Partial<Installation>) {
    const { status, filename, partial, received } = { ...this.current, ...patch };
    const record: Installation = { status, filename, partial, received };
    await this.ports.save(record);
    this.update(patch);
  }
  private checkInterrupted() { if (this.interrupted || !this.foreground) throw new Error('Interrupted'); }
  private async operation(work: () => Promise<void>) {
    if (this.current.busy) return;
    if (!this.foreground) { this.update({ message: 'Keep the app open to use the teacher.' }); return; }
    this.interrupted = false;
    this.update({ busy: true, message: '' });
    try { await work(); }
    catch (error) {
      const status = this.current.filename ? 'ready' : this.interrupted ? 'paused' : 'failed';
      let storageFailed = false;
      try { await this.persist({ status }); } catch { storageFailed = true; }
      this.update({ phase: this.context ? 'loaded' : status,
        message: storageFailed ? 'Local model status could not be saved. Check free storage, then check the local model again. No data was reset.'
          : this.interrupted ? 'Stopped. Retry starts a new download; retained partials are never loaded.'
          : error instanceof IntegrityFailure ? 'Model size or SHA-256 verification failed. This file was not loaded. Retry the download; existing files were kept.'
          : error instanceof LoadFailure ? 'Native model load failed. Close other apps to free memory, then retry. The verified model and notes were kept.'
          : 'Could not finish. Check storage or connection for downloads; verify the file again for load failures. Your notes and existing files were kept.' });
    } finally {
      this.controller = null;
      this.update({ busy: false });
      if (!this.foreground && this.context) await this.unload();
    }
  }
  async check() {
    if (this.context) return;
    await this.operation(async () => {
      this.update({ phase: 'checking' });
      const record = await this.ports.read();
      if (record) this.update(record);
      this.update({ filename: null });
      const promoted = record?.partial ? promotedModelName(this.manifest, record.partial) : null;
      const candidates = [...new Set([promoted, record?.filename, this.manifest.filename].filter((name): name is string => !!name))];
      let invalidFile = false;
      for (const filename of candidates) {
        if (!await this.ports.exists(filename)) continue;
        this.update({ phase: 'verifying' });
        try { await this.ports.verify(filename); } catch { invalidFile = true; continue; }
        this.checkInterrupted();
        await this.persist({ filename, status: 'ready', received: this.manifest.bytes });
        this.update({ phase: 'ready', message: filename === this.manifest.filename
          ? 'Verified preinstalled model. No download was performed.' : 'Local model verified and ready.' });
        return;
      }
      const status = invalidFile ? 'failed' : record?.partial ? 'paused' : 'absent';
      await this.persist({ filename: null, status });
      this.update({ phase: status, message: invalidFile
        ? 'Existing model failed size or SHA-256 validation. It was not loaded or removed. Download a fresh copy to recover.' : record?.partial
        ? 'Previous work was interrupted or failed. Retry restarts from zero; old partials stay untouched.'
        : 'No valid teacher found. Download explicitly when online. Your notebooks still work offline.' });
    });
  }
  async removeInstallation(remove: (record: Installation) => Promise<void>) {
    if (this.context) { this.update({ message: 'Unload the teacher before removing its files.' }); return; }
    await this.operation(async () => {
      const record = await this.ports.read();
      if (!record) return;
      await remove(record);
      this.update({ ...emptyInstallation, phase: 'absent', message: 'Selected installation removed. Notes and history stay. Check Storage for pending file cleanup.' });
    });
  }
  async download() {
    if (this.context) return;
    await this.operation(async () => {
      if (await this.ports.freeBytes() < requiredModelStorage(this.manifest.bytes)) {
        this.update({ phase: 'failed', message: `Not enough storage. Free at least ${requiredModelStorage(this.manifest.bytes).toLocaleString()} bytes before retrying. Existing files were kept.` });
        await this.persist({ status: 'failed' });
        return;
      }
      this.checkInterrupted();
      const partial = this.ports.uniqueName();
      await this.persist({ partial, received: 0, status: 'downloading' });
      this.update({ phase: 'downloading' });
      this.controller = new AbortController();
      this.checkInterrupted();
      await this.ports.download(partial, received => {
        if (!Number.isSafeInteger(received) || received < 0 || received > this.manifest.bytes) {
          this.controller?.abort();
        } else this.update({ received });
      }, this.controller.signal);
      this.checkInterrupted();
      await this.persist({ status: 'verifying' });
      this.update({ phase: 'verifying' });
      try { await this.ports.verify(partial); } catch { throw new IntegrityFailure(); }
      this.checkInterrupted();
      const filename = promotedModelName(this.manifest, partial);
      if (await this.ports.exists(filename)) {
        await this.ports.verify(filename);
      } else await this.ports.promote(partial, filename);
      await this.persist({ filename, partial: null, received: this.manifest.bytes, status: 'ready' });
      this.update({ phase: 'ready', message: 'Full SHA-256 verified. Teacher is ready for offline loading.' });
    });
  }
  async load() {
    if (this.context || !this.current.filename) return;
    await this.operation(async () => {
      this.update({ phase: 'verifying' });
      let path: string;
      try { path = await this.ports.verify(this.current.filename!); }
      catch { await this.persist({ filename: null, status: 'failed' }); throw new IntegrityFailure(); }
      this.checkInterrupted();
      this.update({ phase: 'loading' });
      const start = performance.now();
      try { this.context = await this.ports.load(path); } catch { throw new LoadFailure(); }
      if (this.interrupted || !this.foreground) {
        await this.context.release(); this.context = null; this.checkInterrupted();
      }
      this.update({ phase: 'loaded', message: `Loaded locally in ${Math.round(performance.now() - start)} ms.` });
    });
  }
  async answer() {
    if (!this.context) return;
    await this.operation(async () => {
      this.update({ phase: 'generating' });
      const result = await this.context!.answer();
      this.checkInterrupted();
      this.update({ phase: 'loaded', message: `Synthetic check: ${result.answer}\nFirst token ${Math.round(result.firstTokenMs ?? 0)} ms; completion ${Math.round(result.completionMs)} ms. Not a notebook answer.` });
    });
  }
  async cancel() {
    this.interrupted = true;
    this.controller?.abort();
    if (this.context && this.current.phase === 'generating') await this.context.stop().catch(() => { this.update({ message: 'Stopping local work. Keep the app open.' }); });
  }
  async unload() {
    if (this.current.busy || !this.context) return;
    this.update({ busy: true, phase: 'unloading' });
    try {
      await this.context.release(); this.context = null;
      this.update({ phase: 'ready', message: 'Teacher unloaded. Verified file and notes remain on device.' });
    } catch { this.update({ phase: 'loaded', message: 'Could not release the teacher. Retry unload before more work.' }); }
    finally { this.update({ busy: false }); }
  }
  async setForeground(active: boolean) {
    this.foreground = active;
    if (!active) { await this.cancel(); await this.unload(); }
  }
}

class IntegrityFailure extends Error {}
class LoadFailure extends Error {}
