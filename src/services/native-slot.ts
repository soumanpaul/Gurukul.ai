let occupied = false;
export function claimNativeSlot() {
  if (occupied) throw new Error('Local AI or OCR is busy. Unload the teacher before opening diagnostics.');
  occupied = true;
  let released = false;
  return () => { if (!released) { occupied = false; released = true; } };
}
export async function withNativeSlot<Result>(work: () => Promise<Result>): Promise<Result> {
  const release = claimNativeSlot();
  try { return await work(); } finally { release(); }
}
