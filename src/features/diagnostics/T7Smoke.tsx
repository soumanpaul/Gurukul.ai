import { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { File } from 'expo-file-system';
import { getFoundation } from '../../adapters/sqlite/open';
import { getReader } from '../../t0/native';
import { getImportManager, importId, sourceUri } from '../../adapters/imports/native';
import { getStudyManager } from '../../adapters/model/study';
import { withIdleStudy } from '../../adapters/storage-native';
import { styles } from '../shared/ui';
import manifest from '../../t0/model.json';
import { promptVersion } from '../../domain/study';

type Probe = { phase: 'restart' | 'cleanup' | 'passed'; notebook: string; source: string; original: string; job: string; turn: string; quiz: string; checks: Record<string, unknown> };
class ProbeFailure extends Error {}
function requireCheck(condition: unknown, code: string): asserts condition {
  if (!condition) throw new ProbeFailure(code);
}
export function T7Smoke() {
  const started = useRef(false);
  const [output, setOutput] = useState('T7 synthetic-only privacy/recovery check…');
  useEffect(() => {
    function start() {
    if (started.current || !getReader().t7SmokeEnabled || AppState.currentState !== 'active') return;
    started.current = true;
    void (async () => {
      const file = new File(await getReader().modelDirectory(), 't7-recovery-probe.json');
      try {
        const foundation = await getFoundation();
        const pending = await foundation.storage.pending();
        let probe: Probe;
        if (!file.exists) {
          requireCheck(!pending.length, 'EXISTING_CLEANUP_REQUIRES_MANUAL_REVIEW');
          const notebook = importId();
          await foundation.imports.createNotebook(notebook, `T7 disposable ${notebook}`);
          const importer = getImportManager(foundation.imports);
          const job = await importer.start({ notebookId: notebook, title: 'Synthetic privacy canary', kind: 'txt', text: 'Plants use sunlight to make food through photosynthesis. The private test marker is ORCHIDCANARYSEVENTEEN.' });
          requireCheck(job, 'SYNTHETIC_IMPORT_FAILED');
          await foundation.imports.publish(job);
          const source = await foundation.imports.source((await foundation.imports.job(job)).document_id);
          const section = (await foundation.study.sections(notebook))[0];
          const manager = getStudyManager(foundation);
          setOutput('Generating one real local synthetic answer…');
          const start = performance.now();
          const completed = await manager.run(notebook, 'ask', 'How do plants make food?', section.chunkId);
          const turn = (await foundation.study.history(notebook)).find(row => row.id === completed);
          requireCheck(turn?.status === 'complete' && turn.result_json?.includes('sunlight') && turn.evidence_json.includes('ORCHIDCANARYSEVENTEEN'), 'LOCAL_CANARY_FAILED');
          const unfinishedTurn = importId(); const quiz = importId(); const draft = importId(); const draftJob = importId();
          await foundation.study.begin({ id: unfinishedTurn, notebook, action: 'ask', question: 'Synthetic interrupted question', model: manifest.id, prompt: promptVersion });
          await foundation.quizzes.begin({ id: quiz, notebook, count: 3, evidence: [section], model: manifest.id, prompt: 'synthetic-interruption' });
          await foundation.imports.create({ id: draft, notebookId: notebook, jobId: draftJob, revisionId: importId(), title: 'Synthetic interrupted copy', kind: 'txt', filename: `source-${draft}.txt` });
          probe = { phase: 'restart', notebook, source: source.id, original: source.original_name, job: draftJob, turn: unfinishedTurn, quiz, checks: { localAnswer: true, generationElapsedMs: performance.now() - start, model: manifest, nativePatch: 'gurukul-private-log-v1', promptVersion, device: await getReader().deviceInfo?.() } };
        } else {
          probe = JSON.parse(await file.text());
          requireCheck(['restart', 'cleanup', 'passed'].includes(probe.phase), 'INVALID_PROBE_STATE');
          requireCheck(/^[a-f0-9-]{36}$/i.test(probe.notebook), 'INVALID_PROBE_ID');
          if (probe.phase === 'passed') { setOutput('T7 synthetic recovery already passed. Relaunch normally.'); return; }
          const notebook = (await foundation.repository.listNotebooks()).find(row => row.id === probe.notebook);
          requireCheck(notebook?.title === `T7 disposable ${probe.notebook}`, 'NOT_OWNED_SYNTHETIC_NOTEBOOK');
          requireCheck(probe.original === `source-${probe.source}.txt`, 'NOT_OWNED_SYNTHETIC_FILE');
          requireCheck(pending.every(row => row.filename === probe.original), 'UNRELATED_CLEANUP_REFUSED');
          if (probe.phase === 'restart') {
            requireCheck((await foundation.imports.job(probe.job)).status === 'interrupted', 'IMPORT_NOT_RECOVERED');
            requireCheck((await foundation.study.history(probe.notebook)).find(row => row.id === probe.turn)?.status === 'interrupted', 'TURN_NOT_RECOVERED');
            requireCheck((await foundation.quizzes.detail(probe.quiz)).quiz.status === 'interrupted', 'QUIZ_NOT_RECOVERED');
            const source = await foundation.imports.source(probe.source);
            requireCheck(source.notebook_id === probe.notebook && source.original_name === probe.original, 'SOURCE_OWNERSHIP_FAILED');
            const target = { kind: 'source' as const, id: source.id };
            const preview = await foundation.storage.preview(target);
            await withIdleStudy(foundation, () => foundation.storage.remove(target, preview.token));
            await foundation.storage.cleanup(async name => {
              requireCheck(name.startsWith(probe.original), 'UNRELATED_FILE_REFUSED');
              if (name === probe.original) throw new Error('SYNTHETIC_CLEANUP_FAILURE');
              const owned = new File(await sourceUri(name)); if (owned.exists) await owned.delete();
            });
            const remaining = await foundation.storage.pending();
            requireCheck(remaining.length === 1 && remaining[0].filename === probe.original && remaining[0].error_code === 'CLEANUP_FAILED', 'CLEANUP_NOT_RETAINED');
            requireCheck(!(await foundation.imports.search(probe.notebook, 'sunlight')).length, 'STALE_SEARCH_INDEX');
            probe.checks.recoveredImportStudyQuiz = true; probe.checks.sourceDeletionAndFailedCleanup = true;
            probe.phase = 'cleanup';
          } else {
            requireCheck(pending.length === 1 && new File(await sourceUri(probe.original)).exists, 'PENDING_FILE_DID_NOT_SURVIVE');
            await foundation.storage.cleanup(async name => {
              requireCheck(name === probe.original, 'UNRELATED_FILE_REFUSED');
              const owned = new File(await sourceUri(name)); if (owned.exists) await owned.delete();
            });
            requireCheck(!(await foundation.storage.pending()).length && !new File(await sourceUri(probe.original)).exists, 'RETRY_FAILED');
            const ownedSources = await foundation.imports.list(probe.notebook);
            const target = { kind: 'notebook' as const, id: probe.notebook };
            const preview = await foundation.storage.preview(target);
            await withIdleStudy(foundation, () => foundation.storage.remove(target, preview.token));
            await foundation.storage.cleanup(async name => {
              requireCheck(ownedSources.some(source => name === source.original_name || name === `${source.original_name}.partial` || /^\d+\.jpg$/.test(name.slice(`${source.original_name}-p`.length)) && name.startsWith(`${source.original_name}-p`)), 'UNRELATED_FILE_REFUSED');
              const owned = new File(await sourceUri(name)); if (owned.exists) await owned.delete();
            });
            requireCheck(!(await foundation.storage.pending()).length, 'NOTEBOOK_CLEANUP_FAILED');
            requireCheck(!(await foundation.repository.listNotebooks()).some(row => row.id === probe.notebook), 'NOTEBOOK_DELETE_FAILED');
            probe.checks.cleanupSurvivedRelaunchAndRetried = true; probe.checks.syntheticNotebookRemoved = true;
            probe.phase = 'passed';
          }
        }
        await file.write(JSON.stringify(probe));
        setOutput(`T7 phase: ${probe.phase}. ${probe.phase === 'passed' ? 'Synthetic check passed.' : 'Terminate and relaunch this synthetic probe to continue.'}`);
      } catch (error) {
        const code = error instanceof ProbeFailure ? error.message : 'NATIVE_OR_STORAGE_FAILURE';
        setOutput(`T7 synthetic check failed: ${code}. Existing data was not reset; inspect probe state before retrying.`);
      }
    })();
    }
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') start(); });
    start();
    return () => subscription.remove();
  }, []);
  return <ScrollView contentContainerStyle={[styles.page, { paddingTop: 80 }]}><Text accessibilityLiveRegion="polite" style={styles.body}>{output}</Text></ScrollView>;
}
