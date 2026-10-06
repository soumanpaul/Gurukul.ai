import { File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import manifest from '../../t0/model.json';
import { getReader, nativeReaderAvailable } from '../../t0/native';
import { claimNativeSlot } from '../../services/native-slot';
import { ModelManager } from '../../services/model-manager';
import type { ModelPorts } from '../../services/model-manager';

export const modelNativeAvailable = nativeReaderAvailable && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let manager: ModelManager | undefined;

export function getModelManager(repository: Pick<ModelPorts, 'read' | 'save'> & { pendingRemoval?(name: string): Promise<boolean> }) {
  if (manager) return manager;
  const reader = getReader();
  async function file(name: string) {
    if (!/^[A-Za-z0-9_.-]+$/.test(name) || name.includes('..')) throw new Error('Invalid model name');
    return new File(await reader.modelDirectory(), name);
  }
  manager = new ModelManager(manifest, {
    ...repository,
    exists: async name => !await repository.pendingRemoval?.(name) && (await file(name)).exists,
    freeBytes: async () => Paths.availableDiskSpace,
    uniqueName: () => `download-${Date.now()}-${Math.random().toString(16).slice(2)}.partial`,
    async download(name, progress, signal) {
      const destination = await file(name);
      if (destination.exists || signal.aborted) throw new Error('Download cannot start');
      const task = File.createDownloadTask(manifest.url, destination, {
        sessionType: 'foreground', headers: { 'Accept-Encoding': 'identity' },
        onProgress: data => progress(data.bytesWritten),
      });
      let pause: Promise<void> | undefined;
      const stop = () => {
        if (task.state === 'active' && !pause) pause = task.pauseAsync();
        void pause?.catch(() => { if (task.state === 'active') task.cancel(); });
      };
      signal.addEventListener('abort', stop, { once: true });
      try {
        await reader.setDownloadAwake(true);
        if (signal.aborted) throw new Error('Download cancelled before start');
        const result = await task.downloadAsync();
        if (pause) await pause;
        if (!result || signal.aborted) throw new Error('Download paused');
      } finally {
        signal.removeEventListener('abort', stop);
        await reader.setDownloadAwake(false);
      }
    },
    verify: name => reader.verifyModel(name, manifest.bytes, manifest.sha256),
    promote: (partial, filename) => reader.promoteModel(partial, filename),
    async load(model) {
      const releaseSlot = claimNativeSlot();
      try {
        const { initLlama } = await import('llama.rn');
        const context = await initLlama({ model, n_ctx: 2048, n_gpu_layers: 0, n_threads: 2 });
        return {
          async answer() {
            let firstTokenMs: number | null = null;
            const start = performance.now();
            const result = await context.completion({
              messages: [
                { role: 'system', content: 'Answer briefly using only this synthetic fact: Plants use sunlight to make food through photosynthesis.' },
                { role: 'user', content: 'How do plants make food?' },
              ], enable_thinking: false, n_predict: 128, temperature: 0, seed: 42,
              stop: ['<|im_end|>', '<|endoftext|>'],
            }, data => { if (data.token && firstTokenMs === null) firstTokenMs = performance.now() - start; });
            const answer = result.text.replace(/^\s*<think>\s*<\/think>\s*/, '').trim();
            if (!answer || answer.length > 4000 || /<\/?think>/.test(answer)) throw new Error('Invalid answer');
            return { answer, firstTokenMs, completionMs: performance.now() - start };
          },
          stop: () => context.stopCompletion(),
          async release() { await context.release(); releaseSlot(); },
        };
      } catch (error) { releaseSlot(); throw error; }
    },
  });
  const instance = manager;
  AppState.addEventListener('change', state => { void instance.setForeground(state === 'active'); });
  void instance.setForeground(AppState.currentState === 'active');
  return manager;
}
