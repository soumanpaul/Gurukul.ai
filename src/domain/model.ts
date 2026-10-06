export type ModelManifest = {
  id: string; revision: string; filename: string; sha256: string; bytes: number;
  license: string; licenseUrl: string; runtime: string; url: string;
};
export type Installation = {
  status: 'absent' | 'downloading' | 'verifying' | 'paused' | 'failed' | 'ready';
  filename: string | null; partial: string | null; received: number;
};
export type ModelState = Installation & {
  phase: Installation['status'] | 'checking' | 'loading' | 'loaded' | 'generating' | 'unloading';
  busy: boolean; message: string;
};
export const emptyInstallation: Installation = { status: 'absent', filename: null, partial: null, received: 0 };
export const storageReserve = 1024 ** 3;
export function requiredModelStorage(bytes: number) { return bytes * 2 + storageReserve; }
export function promotedModelName(manifest: ModelManifest, partial: string) {
  if (!/^download-[A-Za-z0-9-]+\.partial$/.test(partial)) throw new Error('Invalid staging name');
  return `model-${manifest.sha256}-${partial.slice(9, -8)}.gguf`;
}
export function validateManifest(manifest: ModelManifest) {
  if (!/^[a-f0-9]{40}$/.test(manifest.revision) || !/^[a-f0-9]{64}$/.test(manifest.sha256)
    || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.gguf$/.test(manifest.filename) || manifest.filename.includes('..')
    || !Number.isSafeInteger(manifest.bytes) || manifest.bytes <= 0
    || !manifest.url.startsWith('https://huggingface.co/')
    || !manifest.url.includes(`/resolve/${manifest.revision}/`) || !manifest.url.endsWith(`/${manifest.filename}`)) {
    throw new Error('Invalid bundled model manifest');
  }
}
