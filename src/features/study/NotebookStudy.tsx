import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { wideNotebook } from '../../domain/experience';
import type { Foundation } from '../../services/foundation';
import type { Evidence, StudyAction, StudyResult } from '../../domain/study';
import { validateStudy } from '../../domain/study';
import type { StudyTurn } from '../../adapters/sqlite/study';
import { getStudyManager } from '../../adapters/model/study';
import { modelNativeAvailable } from '../../adapters/model/native';
import { Action, styles } from '../shared/ui';
import { StudyChat, design } from './StudyChat';
import mascot from '../../../assets/illustrations/book-mascot.png';
import { QuizPanel } from './QuizPanel';
const idle = { busy: false, progress: '', error: '', notebook: '' };
const subscribeIdle = () => () => {};
const snapshotIdle = () => idle;
export function NotebookStudy({ foundation, notebook, historyOnly, viewportHeight = 0 }: { foundation: Foundation; notebook: string; historyOnly: boolean; viewportHeight?: number }) {
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
      if (active) { setSections(items); setTurns(history); setSection(current => items.some(item => item.chunkId === current) ? current : ''); }
    }).catch(() => { if (active) setError('Could not read local history. Your data was not reset.'); });
    return () => { active = false; };
  }, [foundation.study, notebook, work.busy, historyOnly]);
  async function run(action: StudyAction) {
    setError('');
    try { await manager?.run(notebook, action, action === 'summary' ? 'Summarize the selected section.' : question, section || undefined); }
    catch { setError('Could not start local study. Your saved history is unchanged. Retry.'); }
  }
  if (quizOpen) return <QuizPanel foundation={foundation} notebook={notebook} section={section || undefined} close={() => setQuizOpen(false)} />;
  if (!historyOnly) return <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18 }}><View style={{ flex: 1, minWidth: 0 }}><StudyChat sections={sections} section={section} select={setSection} question={question} change={setQuestion}
    run={run} quiz={() => setQuizOpen(true)} busy={work.busy} available={!!manager} progress={work.progress}
    error={error || (work.notebook === notebook ? work.error : '')} cancel={() => { void manager?.cancel().catch(() => setError('Stop requested. Wait for native work to finish.')); }}
    height={viewportHeight ? viewportHeight - 168 : 0} empty={!turns.length} scrollKey={`${turns[0]?.id}:${turns[0]?.status}`}>
    {[...turns].reverse().map(turn => <TurnCard key={turn.id} turn={turn} chat />)}
  </StudyChat></View>{wide && <View style={{ flex: 1, minWidth: 0 }}><NotebookStudy foundation={foundation} notebook={notebook} historyOnly /></View>}</View>;
  return <View style={{ gap: 16 }} accessibilityLabel="Saved discussion and history">
    <Text style={styles.heading}>Study history</Text>
    <Text style={styles.note}>On this device · latest 100 turns. Sources preserve the original revision after edits.</Text>
    <Action title="Quiz · practice and saved attempts" secondary disabled={work.busy} onPress={() => setQuizOpen(true)} />
    {!turns.length && <Text style={styles.note}>No study turns yet.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {turns.map(turn => <TurnCard key={turn.id} turn={turn} />)}
  </View>;
}
function TurnCard({ turn, chat = false }: { turn: StudyTurn; chat?: boolean }) {
  const [expanded, setExpanded] = useState('');
  let evidence: Evidence[] = []; let result: StudyResult | null = null;
  try { evidence = JSON.parse(turn.evidence_json); if (turn.result_json) result = validateStudy(turn.result_json, evidence); } catch { result = null; }
  return <View style={{ gap: 10 }}><View style={chat ? design.question : undefined}><Text style={chat ? styles.body : styles.heading}>{turn.question}</Text></View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>{chat && <Image source={mascot} accessible={false} style={{ width: 34, height: 42 }}/>}<View style={design.answer}>
    <Text style={chat ? design.caption : styles.note}>{new Date(turn.created_at).toLocaleString()} · {turn.action} · {turn.result_json && !result ? 'validation failed' : turn.status}</Text>
    {(!chat || turn.action === 'summary') && <Text style={design.caption}>{turn.coverage}</Text>}
    <Text selectable style={styles.body}>{result?.answer ?? turn.error ?? (turn.status === 'generating' ? 'Generation in progress. Not a completed answer.' : 'No validated answer. Return to Study to retry.')}</Text>
    {result?.citations.map(citation => {
      const source = evidence.find(item => item.chunkId === citation.chunkId)!;
      return <View key={citation.chunkId} style={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${source.title} · Page ${source.pageNumber} · View source`} accessibilityState={{ expanded: expanded === source.chunkId }} style={design.chip} onPress={() => setExpanded(expanded === source.chunkId ? '' : source.chunkId)}><Feather name="file-text" size={20} color="#317096" accessible={false}/><Text style={[design.small, { flex: 1 }]}>{source.title} · p. {source.pageNumber}</Text><Feather name={expanded === source.chunkId ? 'chevron-up' : 'chevron-down'} size={18} color="#075e63" accessible={false}/></Pressable>
        {expanded === source.chunkId && <View style={{ backgroundColor: '#f7eedc', padding: 14, borderRadius: 14, gap: 8 }}>
          <Text selectable style={styles.body}>“{citation.quote}”</Text><Text selectable style={styles.body}>{source.text}</Text>
          <Text selectable style={styles.note}>Saved revision {source.revisionId} · offsets {source.start}–{source.end}. This may be an older revision.</Text>
        </View>}
      </View>;
    })}
    {result?.status === 'answer' && !chat && <Text style={styles.note}>Source IDs and quotes checked, not every claim. Compare the excerpt.</Text>}
  </View></View></View>;
}
