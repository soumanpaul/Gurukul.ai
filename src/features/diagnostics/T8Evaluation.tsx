import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { File } from 'expo-file-system';
import { getFoundation } from '../../adapters/sqlite/open';
import { getImportManager, importId, sourceUri } from '../../adapters/imports/native';
import { loadGroundedRuntime } from '../../adapters/model/study';
import { StudyManager } from '../../services/study-manager';
import { QuizManager } from '../../services/quiz-manager';
import { getReader } from '../../t0/native';
import { promptVersion, studySchema, validateStudy } from '../../domain/study';
import { quizPromptVersion, quizSchema, validateQuiz } from '../../domain/quiz';
import type { QuizItem } from '../../domain/quiz';
import type { StudyRuntime } from '../../services/study-manager';
import manifest from '../../t0/model.json';
import dataset from '../../../tests/fixtures/t8/dataset.json';
import { styles } from '../shared/ui';

export function T8Evaluation() {
  const [output, setOutput] = useState('Waiting for foreground…');
  useEffect(() => {
    let started = false;
    async function run() {
      const reader = getReader();
      const mode = reader.t8Mode!;
      const directory = await reader.modelDirectory();
      const reportFile = new File(directory, `t8-${mode}.json`);
      const measurements: object[] = [];
      const results: Record<string, unknown>[] = [];
      const report: Record<string, unknown> = { ticket: 'T8', mode, startedAt: new Date().toISOString(), production: !__DEV__, model: manifest, dataset: dataset.version, promptVersion, quizPromptVersion, nativePatch: 'gurukul-private-log-v1', context: 2048, outputLimit: 400, threads: 2, gpuLayers: 0, seed: 42, temperature: 0, measurements, results, status: 'running' };
      let phase = 'setup';
      let sampledPeakResidentBytes = 0;
      let samples = 0;
      let sampling = false;
      let foregroundLost = false;
      let activeStudy: StudyManager | undefined;
      let activeQuiz: QuizManager | undefined;
      const foreground = AppState.addEventListener('change', state => {
        if (state !== 'active') foregroundLost = true;
        void activeStudy?.setForeground(state === 'active');
        void activeQuiz?.setForeground(state === 'active');
      });
      const sampler = setInterval(() => {
        if (sampling) return;
        sampling = true;
        void reader.memory().then(memory => {
          if ('residentBytes' in memory) sampledPeakResidentBytes = Math.max(sampledPeakResidentBytes, memory.residentBytes);
          samples++;
        }).finally(() => { sampling = false; });
      }, 250);
      const checkpoint = async () => {
        report.sampledPeakResidentBytes = sampledPeakResidentBytes;
        report.memorySamples = samples;
        report.foregroundLost = foregroundLost;
        await reportFile.write(JSON.stringify(report));
      };
      try {
        await reader.setDownloadAwake(true);
        report.device = await reader.deviceInfo!();
        report.vitalsBefore = await reader.evaluationVitals!();
        const foundation = await getFoundation();
        const importer = getImportManager(foundation.imports);
        const modelIdentity = `${manifest.id}@${manifest.revision}:${manifest.sha256}/${manifest.runtime}`;
        const load = async (schema: object): Promise<StudyRuntime> => {
          const start = performance.now();
          const runtime = await loadGroundedRuntime(foundation, schema, measurement => measurements.push({ case: phase, ...measurement }));
          measurements.push({ case: phase, phase: 'verifyAndLoad', elapsedMs: performance.now() - start, memory: await reader.memory() });
          return { ...runtime, count: async messages => {
            const tokens = await runtime.count(messages);
            measurements.push({ case: phase, phase: 'promptTokens', tokens });
            return tokens;
          } };
        };
        activeStudy = new StudyManager(foundation.study, { id: importId, model: modelIdentity, load: () => load(studySchema) });
        activeQuiz = new QuizManager(foundation.quizzes, { id: importId, model: modelIdentity, sections: notebook => foundation.study.sections(notebook), load: () => load(quizSchema), observeCandidate: candidate => measurements.push({ case: phase, phase: 'candidate', ...candidate }) });
        const study = activeStudy;
        const quiz = activeQuiz;
        const notebooks: Record<string, string> = {};
        const sources: Record<string, string> = {};
        report.notebooks = notebooks;
        report.sources = sources;
        const notebook = async (name: string) => {
          const id = importId();
          await foundation.imports.createNotebook(id, `T8 ${mode} ${name} · synthetic`);
          notebooks[name] = id;
          return id;
        };
        const source = async (target: string, name: string, text: string) => {
          const job = await importer.start({ notebookId: target, title: name, kind: 'txt', text });
          if (!job) throw new Error('IMPORT_FAILED');
          await foundation.imports.publish(job);
          const document = (await foundation.imports.job(job)).document_id;
          sources[name] = document;
          return (await foundation.study.sections(target)).find(item => item.documentId === document)!;
        };
        const answer = async (id: string, target: string, question: string, section?: string) => {
          if (foregroundLost) throw new Error('FOREGROUND_LOST');
          phase = id;
          setOutput(`T8 ${mode}: ${id}`);
          const candidates = await foundation.study.retrieve(target, question, section);
          const start = performance.now();
          await study.run(target, 'ask', question, section);
          const turn = (await foundation.study.history(target))[0];
          if (!turn) throw new Error('MISSING_TURN');
          const evidence = JSON.parse(turn.evidence_json);
          let citationValid = true;
          if (turn.result_json) {
            try { validateStudy(turn.result_json, evidence); } catch { citationValid = false; }
          }
          const result = { id, elapsedMs: performance.now() - start, candidates, turn, citationValid };
          results.push(result);
          await checkpoint();
          return result;
        };
        const practice = async (id: string, target: string, count: 3 | 5) => {
          if (foregroundLost) throw new Error('FOREGROUND_LOST');
          phase = id;
          setOutput(`T8 ${mode}: ${id}`);
          const start = performance.now();
          const generated = await quiz.generate(target, count);
          const result: Record<string, unknown> = { id, count, generationMs: performance.now() - start, calls: quiz.snapshot().calls, status: generated ? 'ready' : 'failed', error: quiz.snapshot().error };
          if (generated) {
            const detail = await foundation.quizzes.detail(generated);
            const items: QuizItem[] = [];
            for (const row of detail.items) items.push(validateQuiz(JSON.parse(row.item_json), JSON.parse(detail.quiz.evidence_json), items));
            const attempt = await foundation.quizzes.start(generated, importId());
            for (const [index, row] of detail.items.entries()) {
              if (index === 2) continue;
              const key = items[index].correctIndex;
              await foundation.quizzes.select(attempt.id, row.id, index === 1 ? (key + 1) % 4 : key);
            }
            const score = await foundation.quizzes.submit(attempt.id);
            const repeated = await foundation.quizzes.submit(attempt.id);
            result.gradeIntegrity = score.correct_count === count - 2 && score.scorable_count === count && score.score === Math.round(100 * (count - 2) / count) && JSON.stringify(score) === JSON.stringify(repeated);
            result.quizId = generated;
            result.items = items;
            result.evidence = JSON.parse(detail.quiz.evidence_json);
            result.attempt = score;
          }
          results.push(result);
          await checkpoint();
          return result;
        };
        if (mode === 'quality') {
          for (const subject of ['biology', 'physics', 'foreign']) await notebook(subject);
          for (const item of [...dataset.sources, ...dataset.distractors]) {
            const section = await source(notebooks[item.subject], item.id, item.text);
            if ('selected' in item && !item.selected) await foundation.imports.select(section.documentId, false);
          }
          report.sourceRevisions = await Promise.all(Object.values(notebooks).map(identity => foundation.study.sections(identity)));
          for (const sample of dataset.answerable) {
            const result = await answer(sample.id, notebooks[sample.subject], sample.question);
            Object.assign(result, { recallAt5: result.candidates.slice(0, 5).some(item => item.documentId === sources[sample.support] && item.text.includes(sample.expectedQuote)), expectedQuote: sample.expectedQuote });
          }
          for (const sample of dataset.absent) await answer(sample.id, notebooks[sample.subject], sample.question);
          for (const sample of dataset.injections) {
            const target = await notebook(sample.id);
            const section = await source(target, sample.id, sample.text);
            await answer(sample.id, target, sample.question, section.chunkId);
          }
          for (const sample of dataset.quizzes) await practice(sample.id, notebooks[sample.subject], sample.count as 3 | 5);
        } else if (mode === 'offline') {
          const target = await notebook('fresh OCR');
          report.ocr = [];
          for (const kind of ['png', 'pdf'] as const) {
            phase = `offline-${kind}`;
            const start = performance.now();
            const job = await importer.start({ notebookId: target, title: `Fresh offline ${kind}`, kind, uri: await sourceUri(`t8-fresh.${kind}`) });
            if (!job) throw new Error('OCR_IMPORT_FAILED');
            const pages = await foundation.imports.pages(job);
            if (!pages.some(page => page.raw_text.includes('Roots absorb water'))) throw new Error('OCR_TEXT_MISMATCH');
            await foundation.imports.publish(job);
            (report.ocr as object[]).push({ kind, elapsedMs: performance.now() - start, pages });
          }
          const section = (await foundation.study.sections(target))[0];
          const result = await answer('offline-answer', target, 'What do roots absorb from soil?', section.chunkId);
          const generated = await practice('offline-quiz', target, 3);
          const revision = importId();
          await foundation.imports.revise(section.documentId, revision, importId());
          await foundation.imports.saveDraft(revision, 1, 'Roots absorb water from soil. Revised offline notes mention germination.');
          await foundation.imports.publish(revision);
          const search = await foundation.imports.search(target, 'germination');
          report.revisionIndexed = search.length === 1;
          report.historyRetainsOriginalEvidence = (await foundation.study.history(target)).find(turn => turn.id === result.turn.id)?.evidence_json === result.turn.evidence_json;
          report.recoveryCheckpoint = { notebook: target, turn: result.turn.id, quiz: generated.quizId, evidence: result.turn.evidence_json };
        } else if (mode === 'recovery') {
          const saved = JSON.parse(await new File(directory, 't8-offline.json').text());
          const savedState = saved.recoveryCheckpoint;
          if (!savedState?.quiz) throw new Error('OFFLINE_SEQUENCE_INCOMPLETE');
          const turn = (await foundation.study.history(savedState.notebook)).find(item => item.id === savedState.turn);
          const quiz = await foundation.quizzes.detail(savedState.quiz);
          report.historySurvived = turn?.status === 'complete' && turn.evidence_json === savedState.evidence;
          report.attemptSurvived = quiz.attempt?.status === 'submitted';
          report.revisionSurvived = (await foundation.imports.search(savedState.notebook, 'germination')).length === 1;
        } else if (mode === 'benchmark') {
          const target = await notebook('sustained');
          for (const item of dataset.sources.slice(0, 5)) await source(target, item.id, item.text);
          const sequenceStart = performance.now();
          for (let index = 0; index < 10; index++) await answer(`short-${index + 1}`, target, dataset.answerable[index % 5].question);
          for (let index = 0; index < 3; index++) await practice(`timed-quiz-${index + 1}`, target, 3);
          let index = 0;
          while (performance.now() - sequenceStart < 15 * 60 * 1000) {
            if (foregroundLost) throw new Error('BENCHMARK_INTERRUPTED');
            await answer(`sustained-${++index}`, target, dataset.answerable[index % 5].question);
            measurements.push({ phase: 'vitals', elapsedMs: performance.now() - sequenceStart, ...await reader.evaluationVitals!() });
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          report.sustainedMs = performance.now() - sequenceStart;
        }
        report.status = 'completed';
        report.vitalsAfter = await reader.evaluationVitals!();
      } catch {
        report.status = 'runtime_failed';
        report.failedPhase = phase;
      } finally {
        clearInterval(sampler);
        foreground.remove();
        await reader.setDownloadAwake(false);
        report.finishedAt = new Date().toISOString();
        await checkpoint();
      }
      setOutput(`T8 ${mode}: ${report.status}. Results saved locally; completion is not a quality pass.`);
    }
    const start = () => {
      if (started || AppState.currentState !== 'active') return;
      started = true;
      void run().catch(() => setOutput('T8 report could not be saved. No database reset was performed.'));
    };
    const listener = AppState.addEventListener('change', start);
    start();
    return () => listener.remove();
  }, []);
  return <ScrollView contentContainerStyle={[styles.page, { paddingTop: 65 }]}><Text selectable>{output}</Text></ScrollView>;
}
