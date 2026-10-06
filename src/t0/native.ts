import { requireOptionalNativeModule } from 'expo-modules-core';

const nativeReader = requireOptionalNativeModule<{
  t0SmokeEnabled?: boolean;
  t2SmokeEnabled?: boolean;
  t2DownloadEnabled?: boolean;
  t3SmokeEnabled?: boolean;
  t4SmokeEnabled?: boolean;
  t5SmokeEnabled?: boolean;
  t7SmokeEnabled?: boolean;
  t8Mode?: string;
  evaluationVitals?(): Promise<{ batteryLevel: number; batteryState: number; thermalState: number }>;
  t5CandidateEnabled?: boolean;
  smokeDeviceKind?: 'simulator' | 'physical';
  deviceInfo?(): Promise<{ os: string; embeddedBundlePresent: boolean; ramBytes: number; storageBytes: number; freeStorageBytes: number }>;
  saveT0SmokeReport?(report: string): Promise<string>;
  verifyModel(name: string, bytes: number, hash: string): Promise<string>;
  modelDirectory(): Promise<string>;
  setDownloadAwake(active: boolean): Promise<void>;
  newId(): string;
  inspectSource(name: string, kind: string): Promise<{ sha256: string; bytes: number; pages: number }>;
  sourcePage(name: string, kind: string, page: number): Promise<{ text: string; method: 'text' | 'pdf-text' | 'pdf-ocr' | 'image-ocr'; preview: string | null }>;
  promoteModel(partial: string, filename: string): Promise<void>;
  imageText(name: string): Promise<string>;
  pdfText(name: string): Promise<string>;
  memory(): Promise<{ pssKb: number; nativeHeapBytes: number } | { residentBytes: number }>;
}>('DocumentReader');

export const nativeReaderAvailable = nativeReader !== null;

export function getReader() {
  if (!nativeReader) throw new Error('OCR/PDF and model verification need the native DocumentReader module.');
  return nativeReader;
}
