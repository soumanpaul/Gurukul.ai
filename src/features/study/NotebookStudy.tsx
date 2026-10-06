import { useEffect, useState, useSyncExternalStore } from 'react';
import { Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { Foundation } from '../../services/foundation';
import type { Evidence, StudyAction, StudyResult } from '../../domain/study';
import { validateStudy } from '../../domain/study';
import type { StudyTurn } from '../../adapters/sqlite/study';
import { getStudyManager } from '../../adapters/model/study';
import { modelNativeAvailable } from '../../adapters/model/native';
import { Action, Card, styles } from '../shared/ui';
import { TeacherStatus } from '../shared/TeacherStatus';
import { wideNotebook } from '../../domain/experience';
import { QuizPanel } from './QuizPanel';
const idle = { busy: false, progress: '', error: '', notebook: '' };
const subscribeIdle = () => () => {};
const snapshotIdle = () => idle;
export function NotebookStudy({ foundation, notebook, historyOnly }: { foundation: Foundation; notebook: string; historyOnly: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const wide = wideNotebook(width, fontScale) && !historyOnly;
  const [manager] = useState(() => modelNativeAvailable ? getStudyManager(foundation) : null);
  const work = useSyncExternalStore(manager?.subscribe ?? subscribeIdle, manager?.snapshot ?? snapshotIdle);
  const [sections, setSections] = useState<Evidence[]>([]);
  const [section, setSection] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<StudyTurn[]>([]);
  const [error, setError] = useState('');
  const [quizOpen, setQuizOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([foundation.study.sections(notebook),foundation.study.history(notebook)]).then(([items, history]) => {
      if (active) { setSections(items); setTurns(history); }
    }).catch(() => { if (active) setError('Could not read local history. Your data was not reset.'); });
    return () => { active = false; };
  }, [foundation.study, notebook, work.busy, historyOnly]);
  async function run(action: StudyAction) {
    setError('');
    await manager?.run(notebook, action, action === 'summary' ? 'Summarize the selected section.' : question, section || undefined);
  }
  if (quizOpen) return <QuizPanel foundation={foundation} notebook={notebook} section={section || undefined} close={() => setQuizOpen(false)} />;
  return <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
    <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
    <Action title="Quiz · practice and saved attempts" secondary disabled={work.busy} onPress={() => setQuizOpen(true)} />
    {!historyOnly && <>
      <TeacherStatus state={work.busy ? 'working' : error || work.error ? 'error' : 'idle'} message={work.busy ? work.progress : error || work.error || 'Learn from selected notes. Check supporting excerpts.'} />
      <Text style={styles.note}>English lexical search only. No cloud or general-knowledge fallback. Questions are independent: repeat the topic rather than “what about that?”.</Text>
      <Text style={styles.note}>Source-exact mode: answers, explanations and summaries select words from your notes, not free-form teaching. Unsupported additions are rejected.</Text>
      {!manager && <Text style={styles.error}>Study needs the native build. History remains readable.</Text>}
      {!sections.length && <Text style={styles.note}>Select and save reviewed sources in Sources first.</Text>}
      <Card><Text style={styles.heading}>Choose a section</Text>
        <Action title={section ? 'Use lexical search instead' : 'Lexical search selected'} secondary disabled={work.busy} onPress={() => setSection('')} />
        <Text style={styles.note}>First 100 indexed sections. Each is an excerpt, not a whole document.</Text>
        {sections.map(item => <Action key={item.chunkId} title={`${section === item.chunkId ? '✓ ' : ''}${item.title} · p${item.pageNumber} · ${item.text.slice(0, 65)}…`} secondary disabled={work.busy} onPress={() => setSection(item.chunkId)} />)}
      </Card>
      {section && <Card><Text style={styles.heading}>Selected section</Text><Text selectable style={styles.body}>{sections.find(item => item.chunkId === section)?.text}</Text></Card>}
      <TextInput accessibilityLabel="Question or topic from your notes" placeholder="What would you like to understand?" value={question} onChangeText={setQuestion} multiline maxLength={600} editable={!work.busy} style={styles.input} />
      <Action title="Ask my notes" disabled={!manager || work.busy || !question.trim()} onPress={() => { void run('ask'); }} />
      <Action title="Explain topic" secondary disabled={!manager || work.busy || !question.trim()} onPress={() => { void run('explain'); }} />
      <Action title="Summarize selected section" secondary disabled={!manager || work.busy || !section} onPress={() => { void run('summary'); }} />
    </>}
    {work.busy && <><Text accessibilityLiveRegion="polite" style={styles.note}>{work.progress}</Text><Action title="Cancel generation" secondary onPress={() => { void manager?.cancel().catch(() => setError('Stop requested. Wait for native work to finish.')); }} /></>}
    {(error || work.error) && <Text accessibilityRole="alert" style={styles.error}>{error || work.error}</Text>}
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 16 }} accessibilityLabel="Saved discussion and history">
    <Text style={styles.heading}>{historyOnly ? 'Study history' : 'Conversation'}</Text>
    <Text style={styles.note}>On this device · latest 100 turns. Sources preserve the original revision after edits.</Text>
    {!turns.length && <Text style={styles.note}>No study turns yet.</Text>}
    {turns.map(turn => <TurnCard key={turn.id} turn={turn} />)}
    </View>
  </View>;
}
function TurnCard({ turn }: { turn: StudyTurn }) {
  const [expanded, setExpanded] = useState('');
  let evidence: Evidence[] = []; let result: StudyResult | null = null;
  try { evidence = JSON.parse(turn.evidence_json); if (turn.result_json) result = validateStudy(turn.result_json, evidence); } catch { result = null; }
  return <Card><Text style={styles.heading}>{turn.question}</Text>
    <Text style={styles.note}>{new Date(turn.created_at).toLocaleString()} · {turn.action} · {turn.result_json && !result ? 'validation failed' : turn.status}</Text>
    <Text style={styles.note}>{turn.coverage}</Text>
    <Text selectable style={styles.body}>{result?.answer ?? turn.error ?? (turn.status === 'generating' ? 'Generation in progress. Not a completed answer.' : 'No validated answer. Return to Study to retry.')}</Text>
    {result?.citations.map(citation => {
      const source = evidence.find(item => item.chunkId === citation.chunkId)!;
      return <View key={citation.chunkId} style={{ gap: 8 }}>
        <Action title={`${source.title} · Page ${source.pageNumber} · View source`} secondary onPress={() => setExpanded(expanded === source.chunkId ? '' : source.chunkId)} />
        {expanded === source.chunkId && <View style={{ backgroundColor: '#f7eedc', padding: 14, borderRadius: 14, gap: 8 }}>
          <Text selectable style={styles.body}>“{citation.quote}”</Text><Text selectable style={styles.body}>{source.text}</Text>
          <Text selectable style={styles.note}>Saved revision {source.revisionId} · offsets {source.start}–{source.end}. This may be an older revision.</Text>
        </View>}
      </View>;
    })}
    {result?.status === 'answer' && <Text style={styles.note}>Source IDs and quotes checked, not every claim. Compare the excerpt.</Text>}
  </Card>;
}
