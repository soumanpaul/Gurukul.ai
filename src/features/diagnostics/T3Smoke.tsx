import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { getFoundation } from '../../adapters/sqlite/open';
import { getImportManager, importId, sourceUri } from '../../adapters/imports/native';
import { getReader } from '../../t0/native';
import { styles } from '../shared/ui';
import type { SourceKind } from '../../domain/imports';

export function T3Smoke() {
  const [output, setOutput] = useState('Waiting for foreground…');
  useEffect(() => {
    let started = false;
    async function run() {
      const report: Record<string, unknown> = { ticket: 'T3', production: !__DEV__ };
      try {
        const foundation = await getFoundation();
        const repository = foundation.imports;
        const manager = getImportManager(repository);
        const notebookId = importId();
        await repository.createNotebook(notebookId, 'T3 smoke · printed English');
        report.notebookId = notebookId;
        const operations: Record<string, unknown> = {};
        report.operations = operations;
        const inputs: { name: string; kind: SourceKind; text?: string }[] = [
          { name: 'Pasted synthetic text', kind: 'txt', text: 'Roots take up water from soil.' },
          { name: 't3-notes.txt', kind: 'txt' },
          { name: 't3-printed.jpg', kind: 'jpg' }, { name: 'printed.png', kind: 'png' },
          { name: 'printed.pdf', kind: 'pdf' }, { name: 't3-text.pdf', kind: 'pdf' },
        ];
        for (const input of inputs) {
          setOutput(`Importing ${input.name} locally…`);
          const start = performance.now();
          const jobId = await manager.start({ notebookId, title: input.name, kind: input.kind, text: input.text,
            uri: input.text ? undefined : await sourceUri(input.name) });
          if (!jobId) throw new Error(`Import failed: ${manager.snapshot().error}`);
          const draft = await repository.pages(jobId);
          if (draft.length === 0 || draft.some(page => !page.raw_text.trim())) throw new Error('Missing extracted text');
          if (input.kind === 'jpg' || input.name === 'printed.png' || input.name === 'printed.pdf') {
            if (draft[0].raw_text.trim() !== 'Plants use sunlight to make food through photosynthesis.') throw new Error('Unexpected printed OCR');
          }
          const documentId = (await repository.job(jobId)).document_id;
          if ((await repository.search(notebookId, input.text ? 'Roots' : 'sunlight')).some(row => row.document_id === documentId)) throw new Error('Unreviewed source was indexed');
          await repository.publish(jobId);
          operations[input.name] = { elapsedMs: performance.now() - start, pages: draft.map(page => ({ number: page.page_number, method: page.extraction_method, text: page.raw_text })), status: (await repository.job(jobId)).status };
        }
        const duplicate = await manager.start({ notebookId, title: 'Duplicate JPEG', kind: 'jpg', uri: await sourceUri('t3-printed.jpg') });
        report.duplicate = duplicate ? (await repository.job(duplicate)).status : 'failed';
        if (report.duplicate !== 'duplicate') throw new Error('Duplicate detection failed');
        const blank = await manager.start({ notebookId, title: 'Blank OCR · needs manual review', kind: 'png', uri: await sourceUri('t3-blank.png') });
        if (!blank) throw new Error('Blank review missing');
        let emptyRejected = false;
        try { await repository.publish(blank); } catch { emptyRejected = true; }
        if (!emptyRejected) throw new Error('Blank OCR was indexed');
        report.emptyOcrBlocked = true;
        for (const [name, kind] of [['t3-not-pdf.pdf','pdf'], ['t3-too-many.pdf','pdf'], ['t3-locked.pdf','pdf'], ['t3-oversized.png','png']] as const) {
          let rejected = false;
          try { await getReader().inspectSource(name, kind); } catch { rejected = true; }
          if (!rejected) throw new Error(`Invalid fixture accepted: ${name}`);
          operations[name] = { rejected: true };
        }
        const cancelNotebook = importId(); await repository.createNotebook(cancelNotebook, 'T3 cancellation · synthetic');
        let cancelled = false;
        const subscription = manager.subscribe(() => {
          if (!cancelled && manager.snapshot().progress.startsWith('Reading page 2')) { cancelled = true; manager.cancel(); }
        });
        try { await manager.start({ notebookId: cancelNotebook, title: 'Two-page retry', kind: 'pdf', uri: await sourceUri('t3-text.pdf') }); }
        finally { subscription(); }
        const cancelledJob = manager.snapshot().jobId;
        if (!cancelled || (await repository.job(cancelledJob)).status !== 'cancelled' || (await repository.pages(cancelledJob)).length !== 1) throw new Error('Page cancellation checkpoint failed');
        await manager.retry(cancelledJob); await repository.publish(cancelledJob);
        report.cancelRetry = { status: (await repository.job(cancelledJob)).status, pages: (await repository.pages(cancelledJob)).length };
        const nextJob = importId(); const documentId = (await repository.job(cancelledJob)).document_id;
        await repository.revise(documentId, nextJob, importId());
        await repository.saveDraft(nextJob, 1, 'Reviewed synthetic revision contains chloroplasts.');
        await repository.publish(nextJob);
        const matches = await repository.search(cancelNotebook, 'chloroplasts');
        if (matches.length !== 1 || matches[0].page_number !== 1) throw new Error('Revision index failed');
        report.revisionSearch = { matches: matches.length, page: matches[0].page_number };
        report.profileUnchanged = JSON.stringify(await foundation.repository.readProfile()) === JSON.stringify(foundation.profile);
        report.status = 'passed';
      } catch (error) { report.status = 'failed'; report.error = error instanceof Error ? error.message : 'Failed'; }
      const path = await getReader().saveT0SmokeReport!(JSON.stringify(report, null, 2));
      setOutput(JSON.stringify({ ...report, path }, null, 2));
    }
    const start = () => { if (!started && AppState.currentState === 'active') { started = true; void run().catch(() => setOutput('Unable to save T3 smoke report.')); } };
    const listener = AppState.addEventListener('change', start); start();
    return () => listener.remove();
  }, []);
  return <ScrollView contentContainerStyle={[styles.page, { paddingTop: 65 }]}><Text selectable>{output}</Text></ScrollView>;
}
