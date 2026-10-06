import { ImportFailure } from '../domain/imports.ts';

export async function permittedCapture<Result>(permission: () => Promise<{ granted: boolean }>, capture: () => Promise<Result>) {
  if (!(await permission()).granted) throw new ImportFailure('CAMERA_DENIED');
  return capture();
}
