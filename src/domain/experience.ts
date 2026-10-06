export function wideNotebook(width: number, fontScale: number) {
  return width >= 1000 && fontScale < 1.5;
}

export function notebookScrollTarget(offset: number, direction: -1 | 1, viewport: number, content: number) {
  return Math.min(Math.max(0, content - viewport), Math.max(0, offset + direction * viewport * 0.8));
}

const safeMessages = new Set([
  'Use a short English question (at most 600 characters).',
  'Choose a section to summarize.',
  'No excerpt fits the model context. Choose a shorter section.',
  'Output reached the token limit. Try a narrower question.',
  'The teacher returned an invalid answer or citation. Nothing was published. Retry or choose a different passage.',
  'Choose 3 or 5 questions.',
  'Select reviewed sources first. No quiz was invented.',
  'Section or previous questions exceed the token budget. Choose a shorter section.',
  'Local generation timed out. Try a shorter section.',
  'Question validation failed after one repair. No scored quiz was created. Try another section.',
  'Local generation needs the native build, not Expo Go.',
  'Teacher setup is busy. Wait before generating.',
  'Set up and verify the teacher in Settings first.',
]);
export function safeGenerationError(error: unknown) {
  return error instanceof Error && safeMessages.has(error.message) ? error.message
    : 'Local generation could not finish. Check model readiness and storage, then retry. No unvalidated answer was published.';
}
