export type SourceKind = 'txt' | 'pdf' | 'jpg' | 'png';
export type ExtractionMethod = 'text' | 'pdf-text' | 'pdf-ocr' | 'image-ocr';
export type ImportStatus = 'copying' | 'extracting' | 'review' | 'indexing' | 'ready' | 'failed' | 'cancelled' | 'interrupted' | 'duplicate';
export type Source = {
  id: string; notebook_id: string; title: string; kind: SourceKind; original_name: string;
  sha256: string | null; byte_size: number | null; page_count: number | null;
  status: ImportStatus; active_revision_id: string | null; duplicate_of: string | null;
  selected: number; created_at: string;
};
export type ImportJob = { id: string; document_id: string; revision_id: string; status: ImportStatus; error_code: string | null; updated_at: string };
export type DraftPage = { page_number: number; raw_text: string; reviewed_text: string; extraction_method: ExtractionMethod; preview_name: string | null };
export type SourceInfo = { sha256: string; bytes: number; pages: number };
export const importLimits = { bytes: 20 * 1024 * 1024, textBytes: 1024 * 1024, pages: 10, pixels: 4096, textCharacters: 20000 };
export const importHelp = 'Printed English first. PDF (up to 10 pages), UTF-8 TXT, JPEG or PNG; 20 MB maximum, images up to 4096 × 4096. Bengali and other non-Latin scripts, arbitrary handwriting, tables and formulas are not supported reliably.';
export class ImportFailure extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export function importMessage(code: string | null) {
  const messages: Record<string, string> = {
    LIMIT: 'This source exceeds the size, page or pixel limit. Choose a smaller file.',
    FORMAT: 'Use a valid PDF, JPEG, PNG or UTF-8 TXT file. HEIC, DOCX, locked PDFs and renamed formats are not supported.',
    EMPTY: 'No readable text on this page. Type the printed text or choose a clearer source before saving.',
    SCRIPT: 'Only English / Latin-script text is supported in this first import version. Bengali and other scripts cannot be indexed yet.',
    STORAGE: 'Could not save locally. Check free space. Existing sources were not reset.',
    INTERRUPTED: 'Import interrupted. Retry uses the private copy and completed pages, if available.',
    MISSING: 'The private copy is missing. Choose the original again; existing data was kept.',
    CAMERA_DENIED: 'Camera access was denied. Choose a file or paste text instead; you can also enable Camera in system Settings.',
    BUSY: 'Local work is busy. Unload the teacher in Settings, then retry import.',
    NATIVE: 'File and OCR import require the rebuilt native Gurukul app, not Expo Go.',
    FAILED: 'Could not read this source locally. Try a clean printed English sample. No source was uploaded.',
  };
  return messages[code ?? 'FAILED'] ?? messages.FAILED;
}
export function kindFromName(name: string, mime?: string | null): SourceKind {
  const extension = name.split('.').pop()?.toLowerCase();
  const kind = extension === 'jpeg' ? 'jpg' : extension;
  if (kind !== 'txt' && kind !== 'pdf' && kind !== 'jpg' && kind !== 'png') throw new ImportFailure('FORMAT');
  const expected = { txt: 'text/plain', pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' }[kind];
  if (mime && mime !== 'application/octet-stream' && mime !== expected) throw new ImportFailure('FORMAT');
  return kind;
}
export function sourceTitle(value: string) {
  const title = value.trim();
  if (!title || [...title].length > 120 || /[\u0000-\u001f\u007f]/.test(title)) throw new ImportFailure('FORMAT');
  return title;
}
export function reviewedText(value: string) {
  if (!value.trim()) throw new ImportFailure('EMPTY');
  if (value.length > importLimits.textCharacters) throw new ImportFailure('LIMIT');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new ImportFailure('FORMAT');
  if ([...value].some(character => /\p{L}/u.test(character) && !/\p{Script=Latin}/u.test(character))) throw new ImportFailure('SCRIPT');
  return value;
}
export function pageChunks(text: string) {
  reviewedText(text);
  const chunks: { ordinal: number; text: string; start: number; end: number; tokenEstimate: number }[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + 1000, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      if (boundary > start + 500) end = boundary;
    }
    const content = text.slice(start, end);
    if (content.trim()) chunks.push({ ordinal: chunks.length, text: content, start, end, tokenEstimate: Math.ceil([...content].length / 4) });
    if (end === text.length) break;
    start = end - 120;
  }
  return chunks;
}
