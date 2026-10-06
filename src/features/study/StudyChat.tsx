import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Alert, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Evidence, StudyAction } from '../../domain/study';
import { Action, styles } from '../shared/ui';
import mascot from '../../../assets/illustrations/book-mascot.png';

export function StudyChat({ sections, section, select, question, change, run, quiz, busy, available, progress, error, cancel, height, children, empty, scrollKey }: {
  sections: Evidence[]; section: string; select(value: string): void; question: string; change(value: string): void;
  run(action: StudyAction): Promise<void>; quiz(): void; busy: boolean; available: boolean; progress: string; error: string;
  cancel(): void; height: number; children: ReactNode; empty: boolean; scrollKey: string;
}) {
  const { fontScale } = useWindowDimensions();
  const input = useRef<TextInput>(null);
  const conversation = useRef<ScrollView>(null);
  const shownKey = useRef('');
  const [chooser, setChooser] = useState(false);
  const [mode, setMode] = useState<StudyAction>('ask');
  const selected = sections.find(item => item.chunkId === section);
  const sources = new Set(sections.map(item => item.documentId));
  const ready = available && !busy && sections.length > 0;
  function ask(action: StudyAction) {
    setMode(action);
    if (!question.trim()) { input.current?.focus(); return; }
    Keyboard.dismiss(); void run(action);
  }
  return <View style={[design.screen, height > 0 && fontScale <= 1.3 ? { height: Math.max(400, height) } : { minHeight: 540 }]}>
    <View style={design.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose study section" disabled={busy} onPress={() => { Keyboard.dismiss(); setChooser(true); }} style={[design.chip, { flex: 1 }]}>
        <Feather name="file-text" size={18} color="#bb4937" accessible={false}/><Text numberOfLines={1} style={[design.small, { flex: 1 }]}>{selected ? `${selected.title} · p. ${selected.pageNumber}` : sources.size === 1 ? sections[0].title : `${sources.size} selected sources`}</Text><Feather name="chevron-down" size={16} color="#075e63" accessible={false}/>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="English study limitations" style={design.chip} onPress={() => Alert.alert('English · source-exact study', 'The local teacher searches selected notes and returns their exact words with sources. Each question is independent: repeat the topic. No cloud or general-knowledge fallback. A summary covers only the chosen section, not the whole document.')}><Feather name="book-open" size={17} color="#075e63" accessible={false}/><Text style={design.small}>English</Text></Pressable>
    </View>
    <View style={[design.row, fontScale > 1.3 && { flexWrap: 'wrap' }]}>
      <Chip label="Summarize" icon="align-left" disabled={!ready} onPress={() => { if (!section) setChooser(true); else { Keyboard.dismiss(); void run('summary'); } }}/>
      <Chip label="Explain" icon="help-circle" disabled={!ready} onPress={() => ask('explain')}/>
      <Chip label="Ask" icon="message-circle" disabled={!ready} onPress={() => { setMode('ask'); input.current?.focus(); }}/>
      <Chip label="Quiz" icon="check-square" disabled={busy} onPress={quiz}/>
    </View>
    <Text style={design.caption}>Source-exact answers · Repeat the topic in each question.</Text>
    <ScrollView ref={conversation} onContentSizeChange={() => { if (shownKey.current !== scrollKey || busy) { conversation.current?.scrollToEnd({ animated: false }); shownKey.current = scrollKey; } }} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ flex: 1, minHeight: 100 }} contentContainerStyle={{ gap: 16, paddingVertical: 8 }} accessibilityLabel="Notes conversation">
      {empty && <View style={design.empty}><Image source={mascot} accessible={false} style={{ width: 70, height: 82 }}/><Text style={[styles.heading, { textAlign: 'center' }]}>Let’s study your notes</Text><Text style={[styles.note, { textAlign: 'center' }]}>{sections.length ? 'Ask a specific question, or choose a section to summarize.' : 'Select and save reviewed notes in Sources first.'}</Text></View>}
      {!available && <Text style={styles.error}>Use the native app and set up your teacher in Settings for local AI.</Text>}
      {children}
      {busy && <View style={design.answer}><Text accessibilityLiveRegion="polite" style={styles.note}>{progress}</Text><Action title="Cancel generation" secondary onPress={cancel}/></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
    <View style={[design.row, { flexWrap: 'wrap' }]}>
      <Chip label="Give me a hint" icon="help-circle" disabled={!ready} onPress={() => Alert.alert('A hint from your notes', 'In source-exact mode, the teacher can show a supporting passage, which may reveal the answer. Enter the topic, then choose Explain.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Enter topic', onPress: () => { setMode('explain'); input.current?.focus(); } }])}/>
      <Chip label="Check my understanding" icon="message-circle" disabled={busy || !sections.length} onPress={quiz}/>
    </View>
    <View style={design.composer}>
      <TextInput ref={input} accessibilityLabel="Question or topic from your notes" placeholder={mode === 'explain' ? 'Which topic should I explain?' : 'Ask your notes…'} placeholderTextColor="#768481" value={question} onChangeText={change} editable={!busy} maxLength={600} multiline returnKeyType="send" submitBehavior="blurAndSubmit" onSubmitEditing={() => { if (ready && question.trim()) ask(mode); }} style={design.input}/>
      <Pressable accessibilityRole="button" accessibilityLabel={mode === 'explain' ? 'Explain topic' : 'Ask my notes'} accessibilityState={{ disabled: !ready || !question.trim() }} disabled={!ready || !question.trim()} onPress={() => ask(mode)} style={[design.send, (!ready || !question.trim()) && styles.disabled]}><Feather name="send" size={23} color="white" accessible={false}/></Pressable>
    </View>
    <Text style={design.caption}>ⓘ AI can make mistakes. Check the source.</Text>
    <Modal visible={chooser} transparent animationType="none" onRequestClose={() => setChooser(false)}>
      <View style={design.overlay}><View style={design.sheet}>
        <Text style={styles.heading}>Choose a section</Text><Text style={styles.note}>First 100 indexed sections from selected notes. Summaries cover one section only.</Text>
        <ScrollView contentContainerStyle={{ gap: 10 }}><Action title="Search all selected notes" secondary onPress={() => { select(''); setChooser(false); }}/>
          {sections.map(item => <Action key={item.chunkId} title={`${section === item.chunkId ? '✓ ' : ''}${item.title} · p. ${item.pageNumber} · ${item.text.slice(0, 80)}`} secondary onPress={() => { select(item.chunkId); setChooser(false); }}/>)}</ScrollView>
        <Action title="Close section chooser" secondary onPress={() => setChooser(false)}/>
      </View></View>
    </Modal>
  </View>;
}

function Chip({ label, icon, disabled, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; disabled?: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[design.chip, { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 7 }, disabled && styles.disabled]}><Feather name={icon} size={17} color="#086c70" accessible={false}/><Text style={design.small}>{label}</Text></Pressable>;
}

export const design = StyleSheet.create({
  screen: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: '#e5dfd7', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffcf7' },
  small: { fontSize: 12, color: '#152c35', flexShrink: 1 }, caption: { fontSize: 12, lineHeight: 17, color: '#4c5e5c' },
  empty: { alignItems: 'center', gap: 8, padding: 16 },
  answer: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#e5dfd7', backgroundColor: '#fffcf7', gap: 10, flex: 1 },
  question: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: '#dfede1', borderRadius: 20, padding: 14 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, borderWidth: 1, borderColor: '#e5dfd7', backgroundColor: '#fffdfa', padding: 6 },
  input: { flex: 1, minHeight: 44, maxHeight: 90, fontSize: 16, color: '#152c35', paddingHorizontal: 12, paddingVertical: 10 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#086c70' },
  overlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'center', padding: 24 },
  sheet: { maxHeight: '80%', width: '100%', maxWidth: 620, alignSelf: 'center', borderRadius: 22, backgroundColor: '#fcf8f0', padding: 20, gap: 14 },
});
