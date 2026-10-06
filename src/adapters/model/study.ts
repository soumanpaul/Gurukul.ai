import { AppState } from 'react-native';
import type { Foundation } from '../../services/foundation';
import { StudyManager } from '../../services/study-manager';
import type { StudyRuntime } from '../../services/study-manager';
import { getModelManager, modelNativeAvailable } from './native';
import { getReader } from '../../t0/native';
import manifest from '../../t0/model.json';
import { claimNativeSlot } from '../../services/native-slot';
import { studySchema } from '../../domain/study';
import type { ModelManifest } from '../../domain/model';
import { validateManifest } from '../../domain/model';
let manager: StudyManager | undefined;
export async function loadGroundedRuntime(foundation: Foundation, schema: object = studySchema, observe?: (measurement: object) => void, candidate?: { manifest: ModelManifest; filename: string }): Promise<StudyRuntime> {
  if (candidate && !getReader().t5CandidateEnabled) throw new Error('Candidate requires the explicit native evaluation flag.');
  if (!modelNativeAvailable) throw new Error('Local generation needs the native build, not Expo Go.');
  const model = getModelManager(foundation.models);
  if (model.snapshot().busy) throw new Error('Teacher setup is busy. Wait before generating.');
  await model.unload();
  const releaseSlot = claimNativeSlot();
  try {
    const record = candidate ?? await foundation.models.read();
    if (!record?.filename) throw new Error('Set up and verify the teacher in Settings first.');
    const selectedManifest = candidate?.manifest ?? manifest;
    validateManifest(selectedManifest);
    const path = await getReader().verifyModel(record.filename, selectedManifest.bytes, selectedManifest.sha256);
    const { initLlama } = await import('llama.rn');
    const loadStart = performance.now();
    const context = await initLlama({ model: path, n_ctx: 2048, n_gpu_layers: 0, n_threads: 2 });
    observe?.({ phase: 'load', elapsedMs: performance.now() - loadStart });
    return {
      async count(messages) {
        const formatted = await context.getFormattedChat(messages, undefined, { enable_thinking: false });
        return (await context.tokenize(formatted.prompt)).tokens.length;
      },
      async generate(messages, outputSchema = schema) {
        const started = performance.now();
        let firstTokenMs: number | null = null;
        const result = await context.completion({ messages, enable_thinking: false, n_predict: 400,
          temperature: 0, seed: 42, stop: ['<|im_end|>', '<|endoftext|>'],
          response_format: { type: 'json_schema', json_schema: { schema: outputSchema } },
        }, observe ? () => { firstTokenMs ??= performance.now() - started; } : undefined);
        observe?.({ phase: 'generation', elapsedMs: performance.now() - started, firstTokenMs, timings: result.timings });
        return { text: result.text, truncated: !!result.stopped_limit };
      },
      stop: () => context.stopCompletion(),
      async release() { await context.release(); releaseSlot(); },
    };
  } catch (error) { releaseSlot(); throw error; }
}
export function getStudyManager(foundation: Foundation) {
  if (manager) return manager;
  manager = new StudyManager(foundation.study, {
    id: () => getReader().newId(), model: `${manifest.id}@${manifest.revision}:${manifest.sha256}/llama.rn-0.9.1`,
    load: () => loadGroundedRuntime(foundation),
  });
  const instance = manager;
  AppState.addEventListener('change', state => { void instance.setForeground(state === 'active').catch(() => {}); });
  void instance.setForeground(AppState.currentState === 'active');
  return manager;
}
