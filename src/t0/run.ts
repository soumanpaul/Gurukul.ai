import { AppState } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import manifest from './feasibility-model.json';
import { getReader } from './native';
import { withNativeSlot } from '../services/native-slot';

export async function runInference(question: string) {
  return withNativeSlot(() => runExclusiveInference(question));
}

async function runExclusiveInference(question: string) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Local AI requires a development build, not Expo Go.');
  }
  if (!question.trim() || question.length > 300) throw new Error('Use a question of 1–300 characters');
  const reader = getReader();
  const { initLlama } = await import('llama.rn');
  const model = await reader.verifyModel(manifest.filename, manifest.bytes, manifest.sha256);
  const memoryBefore = await reader.memory();
  const loadStart = performance.now();
  const context = await initLlama({ model, n_ctx: 2048, n_gpu_layers: 0, n_threads: 2 });
  const loadMs = performance.now() - loadStart;
  let interrupted = AppState.currentState !== 'active';
  const listener = AppState.addEventListener('change', state => {
    if (state !== 'active') {
      interrupted = true;
      void context.stopCompletion().catch(() => undefined);
    }
  });
  try {
    if (interrupted) throw new Error('Keep the spike in the foreground');
    const memoryLoaded = await reader.memory();
    let firstTokenMs: number | null = null;
    const start = performance.now();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'Answer briefly using only this synthetic fact: Plants use sunlight to make food through photosynthesis. If the question is unrelated, say there is insufficient evidence.' },
        { role: 'user', content: question.trim() },
      ],
      enable_thinking: false,
      n_predict: 128,
      temperature: 0,
      seed: 42,
      stop: ['<|im_end|>', '<|endoftext|>'],
    }, data => {
      if (data.token && firstTokenMs === null) firstTokenMs = performance.now() - start;
    });
    const completionMs = performance.now() - start;
    if (interrupted) throw new Error('Generation interrupted by backgrounding');
    const answer = result.text.replace(/^\s*<think>\s*<\/think>\s*/, '').trim();
    if (!answer || answer.length > 4000 || /<\/?think>/.test(answer)) {
      throw new Error('Invalid visible answer');
    }
    return {
      answer,
      modelSha256: manifest.sha256,
      promptVersion: 't0-photosynthesis-1',
      loadMs,
      firstTokenMs,
      completionMs,
      memoryBefore,
      memoryLoaded,
      memoryAfter: await reader.memory(),
      timings: result.timings,
    };
  } finally {
    listener.remove();
    await context.release();
  }
}
