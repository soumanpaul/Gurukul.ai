import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Alert, FlatList, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Foundation } from '../../services/foundation';
import type { BuddyChat, BuddyTurn } from '../../adapters/sqlite/buddy';
import { getBuddyManager } from '../../adapters/model/buddy';
import { modelNativeAvailable } from '../../adapters/model/native';
import { importId } from '../../adapters/imports/native';
import { validateBuddyQuestion } from '../../domain/buddy';
import { Action, styles } from '../shared/ui';
import robot from '../../../docs/UX/12-digital-teacher-avatar.png';
import { BuddyWelcome } from './BuddyWelcome';

const idle = { busy: false, chat: '', progress: '', error: '' };
const subscribe = () => () => {};
const snapshot = () => idle;

export function BuddyScreen({ foundation, height, navigate }: { foundation: Foundation; height: number; navigate(route: 'notebooks' | 'progress'): void }) {
  const [started, setStarted] = useState(false);
  const [manager] = useState(() => modelNativeAvailable ? getBuddyManager(foundation) : null);
  const work = useSyncExternalStore(manager?.subscribe ?? subscribe, manager?.snapshot ?? snapshot);
  const [chats, setChats] = useState<BuddyChat[]>([]);
  const [chat, setChat] = useState('');
  const [turns, setTurns] = useState<BuddyTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setOpaque(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOpaque);
    return () => { active = false; subscription.remove(); };
  }, []);
  const guard = useRef(false);
  const currentChat = useRef(chat);
  currentChat.current = chat;
  const input = useRef<TextInput>(null);
  const busy = work.busy || pending;
  const read = useCallback(async () => {
    const target = currentChat.current;
    const [items, messages] = await Promise.all([foundation.buddy.chats(), target ? foundation.buddy.turns(target) : Promise.resolve([])]);
    setChats(items);
    if (currentChat.current === target) setTurns(messages);
  }, [foundation.buddy]);
  useEffect(() => { void read().catch(() => setError('Could not read saved chats. Your data was not reset.')); }, [read, chat, work.busy]);
  async function send(text = question) {
    if (!manager || busy || guard.current) return;
    let message: string;
    try { message = validateBuddyQuestion(text); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check your message.'); return; }
    guard.current = true; setPending(true); setError(''); Keyboard.dismiss();
    try {
      const target = chat || importId();
      currentChat.current = target; setChat(target); setQuestion('');
      await manager.run(target, message);
      await read();
    } catch { setError('Could not save this chat. Check storage and try again.'); }
    finally { guard.current = false; setPending(false); }
  }
  function open(item: BuddyChat) { if (busy) return; setTurns([]); setChat(item.id); currentChat.current = item.id; setQuestion(''); setError(''); setHistory(false); }
  function remove(item: BuddyChat) {
    Alert.alert('Delete this AI Buddy chat?', `“${item.title}” and all its messages will be removed from this device. Notes, quizzes and the downloaded model stay. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete chat', style: 'destructive', onPress: () => {
        if (guard.current || work.busy) return;
        guard.current = true; setPending(true);
        void foundation.buddy.remove(item.id).then(async () => {
          if (currentChat.current === item.id) { currentChat.current = ''; setChat(''); setTurns([]); }
          await read();
        }).catch(() => setError('Could not delete the chat. Wait for local work to finish and retry.')).finally(() => { guard.current = false; setPending(false); });
      } },
    ]);
  }
  if (!started) return <BuddyWelcome height={height} onStart={() => setStarted(true)}/>;
  return <View style={design.screen}>
    <View pointerEvents="none" accessible={false} style={design.backdrop}><View style={design.mintGlow}/><View style={design.creamGlow}/></View>
    <View style={design.row}><Image source={robot} accessible={false} style={{ width: 48, height: 52 }}/><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.heading}>AI Buddy</Text><Text style={design.note}>Your local study companion</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="AI Buddy chat history" style={design.icon} disabled={busy} onPress={() => { Keyboard.dismiss(); setHistory(true); }}><Ionicons name="time-outline" size={24} color="#086c70" accessible={false}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="New AI Buddy chat" style={design.icon} disabled={busy} onPress={() => { setChat(''); currentChat.current = ''; setTurns([]); setQuestion(''); setError(''); }}><Ionicons name="add" size={26} color="#086c70" accessible={false}/></Pressable>
    </View>
    <Text style={[design.disclosure, opaque && { backgroundColor: '#fff0d4' }]}>General AI · Not based on your notes · Can be wrong</Text>
    {!!chat && <Text numberOfLines={1} style={design.note}>{chats.find(item => item.id === chat)?.title ?? 'New conversation'}</Text>}
    {!turns.length && !busy ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={design.welcome} style={{ flex: 1 }}><View style={[design.robotHalo, { width: height > 550 ? 132 : 80, height: height > 550 ? 132 : 80 }]}><Image source={robot} accessible={false} style={{ width: '88%', height: '92%', resizeMode: 'contain' }}/></View><Text style={design.greeting}>Hello! What can I help you learn?</Text>
      {([
        { title: 'Review practice', subtitle: 'Revisit your saved results', icon: 'bar-chart-outline', action: () => navigate('progress') },
        { title: 'Practice', subtitle: 'Make a quiz from notebook sources', icon: 'book-outline', action: () => navigate('notebooks') },
        { title: 'Explore', subtitle: 'Discover a topic or ask a question', icon: 'compass-outline', action: () => { setQuestion('Explain gravity simply.'); input.current?.focus(); } },
      ] as const).map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.action} style={[design.row, design.welcomeCard, opaque && design.opaque]}><View style={design.cardIcon}><Ionicons name={item.icon} size={22} color="#086c70" accessible={false}/></View><View style={{ flex: 1 }}><Text style={[styles.body, { fontSize: 15, fontWeight: '600' }]}>{item.title}</Text><Text style={design.note}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color="#086c70" accessible={false}/></Pressable>)}</ScrollView> :
      <FlatList inverted data={[...turns].reverse()} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingVertical: 8 }}
        renderItem={({ item }) => <View style={{ gap: 8 }}><View style={design.question}><Text selectable style={[styles.body, { color: '#ffffff' }]}>{item.question}</Text></View><View style={[design.row, { alignItems: 'flex-start' }]}><Image source={robot} accessible={false} style={{ width: 34, height: 40 }}/><View style={[design.answer, opaque && design.opaque]}>
          <Text testID={`buddy-status-${item.id}`} style={design.note}>{new Date(item.created_at).toLocaleString()} · {item.status}</Text>
          <Text testID={`buddy-answer-${item.id}`} selectable style={styles.body}>{item.status === 'complete' ? item.answer : item.error ?? 'Replying locally…'}</Text>
          {item.omitted_turns > 0 && <Text style={design.note}>{item.omitted_turns} older completed turn(s) did not fit this reply’s context. Still saved in history.</Text>}
          {['failed', 'cancelled', 'interrupted'].includes(item.status) && <Action title="Retry message" secondary disabled={busy || !manager} onPress={() => { void send(item.question); }}/>} 
        </View></View></View>}/>} 
    {busy && <View style={design.row}><Text accessibilityLiveRegion="polite" style={[design.note, { flex: 1 }]}>{work.progress || 'Saving conversation…'}</Text><Action title="Stop reply" secondary disabled={!work.busy} onPress={() => { void manager?.cancel().catch(() => setError('Stop requested. Wait for native work to finish.')); }}/></View>}
    {!!(error || (work.chat === chat && work.error)) && <Text accessibilityRole="alert" style={styles.error}>{error || work.error}</Text>}
    {!manager && <Text style={styles.error}>AI Buddy needs the native app and installed teacher. Saved chats remain readable.</Text>}
    <View style={[design.composer, opaque && design.opaque]}><TextInput ref={input} accessibilityLabel="Message AI Buddy" placeholder="Ask anything…" placeholderTextColor="#566d68" value={question} onChangeText={setQuestion} editable={!busy} multiline maxLength={1500} returnKeyType="send" submitBehavior="blurAndSubmit" onSubmitEditing={() => { void send(); }} style={design.input}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Send to AI Buddy" accessibilityState={{ disabled: !manager || busy || !question.trim() }} disabled={!manager || busy || !question.trim()} style={[design.send, (!manager || busy || !question.trim()) && styles.disabled]} onPress={() => { void send(); }}><Ionicons name="paper-plane-outline" color="white" size={23} accessible={false}/></Pressable></View>
    <Text style={design.note}>English first · Recent messages fit a limited context. Verify important answers.</Text>
    <Modal visible={history} transparent animationType="none" onRequestClose={() => setHistory(false)}><View style={design.overlay}><View style={design.sheet}><Text accessibilityRole="header" style={styles.heading}>AI Buddy history</Text><Text style={styles.note}>Stored locally. Logout keeps chats; uninstall removes them. No cloud backup.</Text>
      <ScrollView contentContainerStyle={{ gap: 12 }}>{!chats.length && <Text style={styles.note}>No saved chats yet.</Text>}{chats.map(item => <View key={item.id} style={design.row}><Pressable accessibilityRole="button" accessibilityLabel={`Open chat ${item.title}`} disabled={busy} onPress={() => open(item)} style={[design.answer, { minHeight: 56 }]}><Text style={styles.body}>{item.title}</Text><Text style={design.note}>{new Date(item.updated_at).toLocaleString()}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete chat ${item.title}`} disabled={busy} onPress={() => remove(item)} style={design.icon}><Ionicons name="trash-outline" size={22} color="#9b2929" accessible={false}/></Pressable></View>)}</ScrollView>
      <Action title="Close chat history" secondary onPress={() => setHistory(false)}/></View></View></Modal>
  </View>;
}

const design = StyleSheet.create({
  screen: { gap: 10, flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden', borderRadius: 28, backgroundColor: '#edf3e9' },
  mintGlow: { position: 'absolute', width: 360, height: 480, borderRadius: 180, backgroundColor: '#cde7df', top: '12%', right: -160 },
  creamGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#f8eedb', left: -210, bottom: -100 },
  opaque: { backgroundColor: '#fffcf7' },
  robotHalo: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 90, backgroundColor: '#b9ded4', borderWidth: 3, borderColor: '#ffffff', shadowColor: '#28796e', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 4 } },
  greeting: { fontSize: 16, lineHeight: 24, color: '#193f3a', textAlign: 'center', marginBottom: 12 },
  cardIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#e1eee7' },
  icon: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#e5efdf' },
  note: { fontSize: 12, lineHeight: 18, color: '#4c5e5c' }, disclosure: { fontSize: 12, lineHeight: 18, color: '#72521d', backgroundColor: 'rgba(255,240,212,0.85)', borderRadius: 12, padding: 8 },
  welcome: { flexGrow: 1, justifyContent: 'center', alignItems: 'stretch', gap: 12, paddingVertical: 12 },
  welcomeCard: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff', borderRadius: 16, backgroundColor: 'rgba(255,252,247,0.76)', shadowColor: '#23564e', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  question: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: '#086c70', borderRadius: 18, borderBottomRightRadius: 5, padding: 14 },
  answer: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff', backgroundColor: 'rgba(255,252,247,0.88)', padding: 14, gap: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderRadius: 22, backgroundColor: 'rgba(255,253,250,0.86)', borderWidth: 1, borderColor: '#ffffff', shadowColor: '#23564e', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  input: { flex: 1, minHeight: 44, maxHeight: 90, paddingHorizontal: 12, paddingVertical: 10, color: '#152c35', fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#086c70' },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: '#00000055', padding: 24 },
  sheet: { maxHeight: '80%', width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: '#fcf8f0', borderRadius: 22, padding: 18, gap: 14 },
});
