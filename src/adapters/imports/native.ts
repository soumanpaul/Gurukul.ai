import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppState } from 'react-native';
import { getReader, nativeReaderAvailable } from '../../t0/native';
import { claimNativeSlot } from '../../services/native-slot';
import { ImportManager } from '../../services/import-manager';
import type { ImportRepository } from '../sqlite/imports';
import { ImportFailure, importLimits, kindFromName } from '../../domain/imports';
import { permittedCapture } from '../../services/camera-permission';

export const importNativeAvailable = nativeReaderAvailable && typeof getReader().inspectSource === 'function';
let manager: ImportManager | undefined;
export function importId() { return getReader().newId(); }
export async function sourceUri(name: string) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name) || name.includes('..')) throw new ImportFailure('FORMAT');
  return new File(await getReader().modelDirectory(), name).uri;
}
function nativeFailure(error: unknown): never {
  const match = String(error).match(/IMPORT_(FORMAT|LIMIT|MISSING|STORAGE)/);
  throw new ImportFailure(match?.[1] ?? 'FAILED');
}
export function getImportManager(repository: ImportRepository) {
  if (manager) return manager;
  manager = new ImportManager(repository, {
    id: importId,
    claim: claimNativeSlot,
    async copy(input, filename) {
      if (Paths.availableDiskSpace < importLimits.bytes * 2 + 128 * 1024 * 1024) throw new ImportFailure('STORAGE');
      const destination = new File(await sourceUri(filename));
      const staging = new File(await sourceUri(`${filename}.partial`));
      if (destination.exists || staging.exists) throw new ImportFailure('STORAGE');
      if (input.text !== undefined) {
        if (!input.text.trim() || input.text.length > importLimits.textCharacters) throw new ImportFailure('LIMIT');
        await staging.write(input.text);
      } else {
        if (!input.uri?.startsWith('file://')) throw new ImportFailure('FORMAT');
        const original = new File(input.uri);
        if (!original.exists) throw new ImportFailure('MISSING');
        if (!original.size || original.size > importLimits.bytes) throw new ImportFailure('LIMIT');
        await original.copy(staging);
        if (staging.size !== original.size) throw new ImportFailure('STORAGE');
      }
      await staging.move(destination);
    },
    async inspect(filename, kind) {
      if (!new File(await sourceUri(filename)).exists) throw new ImportFailure('MISSING');
      try { return await getReader().inspectSource(filename, kind); } catch (error) { return nativeFailure(error); }
    },
    async page(filename, kind, number) {
      try {
        const result = await getReader().sourcePage(filename, kind, number);
        return { raw_text: result.text, extraction_method: result.method, preview_name: result.preview };
      } catch (error) { return nativeFailure(error); }
    },
  });
  const instance = manager;
  AppState.addEventListener('change', state => instance.setForeground(state === 'active'));
  instance.setForeground(AppState.currentState === 'active');
  return manager;
}

export async function pickSource() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain','application/pdf','image/jpeg','image/png'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > importLimits.bytes) throw new ImportFailure('LIMIT');
  return { uri: asset.uri, title: asset.name, kind: kindFromName(asset.name, asset.mimeType) };
}
export async function captureSource() {
  const result = await permittedCapture(() => ImagePicker.requestCameraPermissionsAsync(),
    () => ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false, exif: false }));
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.width > importLimits.pixels || asset.height > importLimits.pixels || (asset.fileSize && asset.fileSize > importLimits.bytes)) throw new ImportFailure('LIMIT');
  const filename = asset.fileName ?? asset.uri.split('/').pop() ?? '';
  return { uri: asset.uri, title: `Photo ${new Date().toLocaleDateString()}`, kind: kindFromName(filename, asset.mimeType) };
}
