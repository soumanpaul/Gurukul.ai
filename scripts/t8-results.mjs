import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node scripts/t8-results.mjs PHONE_REPORT OUTPUT');
const report = JSON.parse(readFileSync(input, 'utf8'));
const fixtureBytes = readFileSync(new URL('../tests/fixtures/t8/dataset.json', import.meta.url));
const dataset = JSON.parse(fixtureBytes);
if (report.dataset !== dataset.version || report.mode !== 'quality') throw new Error('Dataset/mode mismatch');
const selected = ids => report.results.filter(result => ids.includes(result.id));
const answers = selected(dataset.answerable.map(sample => sample.id));
const absent = selected(dataset.absent.map(sample => sample.id));
const injection = selected(dataset.injections.map(sample => sample.id));
const quizzes = selected(dataset.quizzes.map(sample => sample.id));
const stats = values => {
  const sorted = values.filter(value => typeof value === 'number' && Number.isFinite(value)).sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return { samples: sorted.length, median: sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null, worst: sorted.at(-1) ?? null };
};
const identity = result => {
  const subject = dataset.answerable.find(sample => sample.id === result.id).subject;
  const allowed = new Set(dataset.sources.filter(source => source.subject === subject).map(source => report.sources[source.id]));
  const active = report.sourceRevisions.flat();
  return [...result.candidates, ...JSON.parse(result.turn.evidence_json)].every(source => allowed.has(source.documentId) && active.some(item => item.chunkId === source.chunkId && item.revisionId === source.revisionId && item.documentId === source.documentId));
};
const summary = {
  dataset: dataset.version,
  datasetSha256: createHash('sha256').update(fixtureBytes).digest('hex'),
  reportSha256: createHash('sha256').update(readFileSync(input)).digest('hex'),
  executionStatus: report.status,
  answerable: { executed: answers.length, required: 20, recallAt5: answers.filter(result => result.recallAt5).length, isolated: answers.filter(identity).length, completed: answers.filter(result => result.turn.status === 'complete').length, failed: answers.filter(result => result.turn.status === 'failed').length, citationValidationFailures: answers.filter(result => !result.citationValid).length, exactExpectedSentence: answers.filter(result => result.turn.result_json && JSON.parse(result.turn.result_json).answer === dataset.answerable.find(sample => sample.id === result.id).expectedQuote).length, humanSemanticReview: 'pending; exact sentence matching is not human review' },
  absent: { executed: absent.length, required: 5, refused: absent.filter(result => result.turn.status === 'insufficient').length, answered: absent.filter(result => result.turn.status === 'complete').map(result => result.id), failedClosed: absent.filter(result => result.turn.status === 'failed').length },
  injection: { executed: injection.length, required: 5, supportedFact: injection.filter(result => result.turn.status === 'complete' && JSON.parse(result.turn.result_json).answer === dataset.injections.find(sample => sample.id === result.id).expectedQuote).length, refusedOrBlocked: injection.filter(result => ['failed', 'insufficient'].includes(result.turn.status)).length, otherPublished: injection.filter(result => result.turn.status === 'complete' && JSON.parse(result.turn.result_json).answer !== dataset.injections.find(sample => sample.id === result.id).expectedQuote).map(result => result.id), networkActions: 'Requires native trace; content alone does not prove no network' },
  quizzes: { executed: quizzes.length, required: 10, validSets: quizzes.filter(result => result.status === 'ready').length, validWithinOneTotalRepair: quizzes.filter(result => result.status === 'ready' && result.calls <= result.count + 1).length, totalRepairs: report.measurements.filter(measurement => measurement.phase === 'candidate' && measurement.repair === 1).length, displayedItems: quizzes.reduce((count, result) => count + (result.items?.length ?? 0), 0), gradeIntegrityPassed: quizzes.filter(result => result.gradeIntegrity).length, humanQualityReview: 'pending; valid keys/citations do not establish unambiguous distractors' },
  timingsMs: {
    contextInitialization: stats(report.measurements.filter(measurement => measurement.phase === 'load').map(measurement => measurement.elapsedMs)),
    verificationAndLoad: stats(report.measurements.filter(measurement => measurement.phase === 'verifyAndLoad').map(measurement => measurement.elapsedMs)),
    firstToken: stats(report.measurements.filter(measurement => measurement.phase === 'generation').map(measurement => measurement.firstTokenMs)),
    answerOperation: stats(answers.map(result => result.elapsedMs)),
    threeQuestionOperation: stats(quizzes.filter(result => result.count === 3).map(result => result.generationMs)),
    fiveQuestionOperation: stats(quizzes.filter(result => result.count === 5).map(result => result.generationMs)),
  },
  maxPromptTokens: Math.max(0, ...report.measurements.filter(measurement => measurement.phase === 'promptTokens').map(measurement => measurement.tokens)),
  sampledPeakResidentBytes: report.sampledPeakResidentBytes,
  memorySampling: '250 ms requests; native worker contention may delay samples; not an OS peak measurement',
  vitalsBefore: report.vitalsBefore,
  vitalsAfter: report.vitalsAfter,
};
writeFileSync(output, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
