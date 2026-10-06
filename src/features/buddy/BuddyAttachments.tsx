import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Image, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Foundation } from '../../services/foundation';
import type { DraftPage, ImportJob, Source } from '../../domain/imports';
import { ImportFailure, importLimits, importMessage } from '../../domain/imports';
import { captureSource, getImportManager, importId, importNativeAvailable, pickSource, sourceUri } from '../../adapters/imports/native';
import { getStudyManager } from '../../adapters/model/study';
import { modelNativeAvailable } from '../../adapters/model/native';
import { TurnCard } from '../study/NotebookStudy';
import type { StudyTurn } from '../../adapters/sqlite/study';
import robot from '../../../docs/UX/12-digital-teacher-avatar.png';
import { Action, styles } from '../shared/ui';
import { BuddyBackdrop } from './BuddyBackdrop';

const idle = { busy: false, progress: '', error: '' };
const subscribe = () => () => {};
const snapshot = () => idle;
type AttachmentChat = { id: string; title: string; created_at: string };

export function BuddyAttachments({ foundation, height, initial, close }: {
  foundation: Foundation; height: number; initial: 'file' | 'camera' | 'history'; close(): void;
}) {
  const repository = foundation.imports;
  const [manager] = useState(() => importNativeAvailable ? getImportManager(repository) : null);
  const [study] = useState(() => modelNativeAvailable ? getStudyManager(foundation) : null);
  const work = useSyncExternalStore(manager?.subscribe ?? subscribe, manager?.snapshot ?? snapshot);
  const generation = useSyncExternalStore(study?.subscribe ?? subscribe, study?.snapshot ?? snapshot);
  const [chats, setChats] = useState<AttachmentChat[]>([]);
  const [chat, setChat] = useState<AttachmentChat | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [review, setReview] = useState<{ job: ImportJob; source: Source } | null>(null);
  const [turns, setTurns] = useState<StudyTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState(initial === 'history');
  const conversation = useRef<ScrollView>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const guard = useRef(false);
  const initialized = useRef(false);
  const busy = pending || work.busy || generation.busy;
  async function refresh(target = chat) {
    setChats(await repository.buddyAttachments());
    if (target) {
      setSources(await repository.list(target.id));
      setTurns(await foundation.study.history(target.id));
    }
  }
  async function perform(action: () => Promise<void>) {
    if (guard.current || work.busy || generation.busy) return;
    guard.current = true; setPending(true); setError(''); Keyboard.dismiss();
    try { await action(); }
    catch (failure) { setError(importMessage(failure instanceof ImportFailure ? failure.code : 'FAILED')); }
    finally { guard.current = false; setPending(false); }
  }
  async function showJob(id: string | null) {
    if (!id) return;
    const job = await repository.job(id);
    if (job.status === 'review') setReview({ job, source: await repository.source(job.document_id) });
  }
  async function add(kind: 'file' | 'camera') {
    if (!manager) throw new ImportFailure('NATIVE');
    const input = kind === 'file' ? await pickSource() : await captureSource();
    if (!input) return;
    let target = chat;
    if (!target) {
      target = { id: `buddy-files-${importId()}`, title: input.title.slice(0, 120), created_at: new Date().toISOString() };
      await repository.createNotebook(target.id, target.title);
      setChat(target);
    }
    try { await showJob(await manager.start({ ...input, notebookId: target.id })); }
    finally { await refresh(target); }
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void perform(async () => { await refresh(); if (initial !== 'history') await add(initial); });
  }, []);
  async function openSource(source: Source) {
    if (!manager) throw new ImportFailure('NATIVE');
    const original = source.duplicate_of ? await repository.source(source.duplicate_of) : source;
    if (original.status === 'ready') await repository.revise(original.id, importId(), importId());
    const job = await repository.latestJob(original.id);
    await showJob(job.status === 'review' ? job.id : await manager.retry(job.id));
    await refresh();
  }
  async function send() {
    if (!study || !chat || !question.trim() || review) return;
    await perform(async () => {
      const text = question.trim();
      setQuestion('');
      try { await study.run(chat.id, 'ask', text); }
      finally { await refresh(); }
    });
  }
  const ready = sources.some(source => source.selected && source.status === 'ready');
  return <View style={{ flex: 1, gap: 10, padding: 8 }}>
    <BuddyBackdrop />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to AI Buddy" disabled={busy || !!review} onPress={close} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="arrow-back" size={24} color="#086c70" /></Pressable>
      <Image source={robot} accessible={false} style={{ width: 40, height: 48 }} />
      <Text accessibilityRole="header" style={[styles.heading, { flex: 1 }]}>AI Buddy</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Attachment chat history" disabled={busy || !!review} onPress={() => { Keyboard.dismiss(); setHistory(true); }} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="time-outline" size={24} color="#086c70" /></Pressable>
    </View>
    <ScrollView ref={conversation} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} onContentSizeChange={() => { if (!review) conversation.current?.scrollToEnd({ animated: false }); }}>
      {!sources.length && <View style={{ alignItems: 'center', padding: 20, gap: 12 }}><Image source={robot} accessible={false} style={{ width: 100, height: 120 }} /><Text style={styles.body}>Attach a file or photo and ask me about it.</Text><Text style={styles.note}>PDF, TXT, JPEG or PNG · Printed English text</Text></View>}
      {sources.map(source => <View key={source.id} style={{ alignSelf: 'flex-end', width: '92%', borderRadius: 16, padding: 12, backgroundColor: '#dcece5', gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}><Ionicons name={source.kind === 'jpg' || source.kind === 'png' ? 'image-outline' : 'document-text-outline'} size={24} color="#086c70" /><Text style={[styles.body, { flex: 1 }]}>{source.title}</Text></View>
        <Text style={styles.note}>{source.status === 'ready' ? source.selected ? 'Attached to this chat' : 'Not used in replies' : source.status === 'review' ? 'Check extracted text below before sending' : source.status}</Text>
        {source.status !== 'duplicate' && !review && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Action title={source.status === 'ready' ? 'View / edit text' : source.status === 'review' ? 'Check text' : 'Retry attachment'} secondary disabled={busy} onPress={() => { void perform(() => openSource(source)); }} />
          {source.status === 'ready' && <Action title={source.selected ? 'Exclude' : 'Use in replies'} secondary disabled={busy} onPress={() => { void perform(async () => { await repository.select(source.id, !source.selected); await refresh(); }); }} />}
        </View>}
      </View>)}
      {review && <AttachmentReview key={review.job.id} repository={repository} job={review.job} done={() => { setReview(null); void perform(() => refresh()); }} />}
      {[...turns].reverse().map(turn => <TurnCard key={turn.id} turn={turn} chat />)}
      {!!(error || work.error || generation.error) && <Text accessibilityRole="alert" style={styles.error}>{error || work.error || generation.error}</Text>}
      {busy && <Text accessibilityLiveRegion="polite" style={styles.note}>{work.busy ? work.progress : generation.busy ? generation.progress : 'Preparing attachment…'}</Text>}
      {work.busy && <Action title="Cancel attachment" secondary onPress={() => manager?.cancel()} />}
      {generation.busy && <Action title="Stop reply" secondary onPress={() => { void study?.cancel().catch(() => setError('Stop requested. Wait for local work to finish.')); }} />}
    </ScrollView>
    <View style={{ borderRadius: 22, padding: 8, backgroundColor: '#fffcf7', gap: 4 }}>
      <TextInput accessibilityLabel="Message AI Buddy about attachments" placeholder="Ask about your attachment…" value={question} onChangeText={setQuestion} editable={!busy} multiline maxLength={600} style={[styles.input, { maxHeight: Math.max(80, Math.min(height / 6, 120)), minHeight: 48 }]} returnKeyType="send" submitBehavior="blurAndSubmit" onSubmitEditing={() => { if (ready) void send(); }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {(['file', 'camera'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={kind === 'file' ? 'Attach a file' : 'Take a photo'} disabled={busy || !!review || !manager} onPress={() => { void perform(() => add(kind)); }} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Ionicons name={kind === 'file' ? 'attach-outline' : 'camera-outline'} size={24} color="#086c70" /></Pressable>)}
        <Text style={[styles.note, { flex: 1 }]}>{review ? 'Check text to attach' : 'Answers from attachments'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Send attachment question" accessibilityState={{ disabled: busy || !!review || !ready || !question.trim() || !study }} disabled={busy || !!review || !ready || !question.trim() || !study} onPress={() => { void send(); }} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#086c70', justifyContent: 'center', alignItems: 'center' }, (busy || !!review || !ready || !question.trim() || !study) && styles.disabled]}><Ionicons name="paper-plane-outline" size={23} color="white" /></Pressable>
      </View>
    </View>
    <Modal visible={history} transparent animationType="none" onRequestClose={() => setHistory(false)}><View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000055' }}><View style={{ padding: 18, borderRadius: 22, backgroundColor: '#fcf8f0', maxHeight: '80%', gap: 12 }}>
      <Text style={styles.heading}>Attachment conversations</Text>
      <ScrollView contentContainerStyle={{ gap: 10 }}>{chats.map(item => <Action key={item.id} title={item.title} secondary onPress={() => { setHistory(false); void perform(async () => { await refresh(item); setChat(item); setQuestion(''); }); }} />)}</ScrollView>
      <Action title="New conversation" onPress={() => { setHistory(false); setChat(null); setSources([]); setTurns([]); setQuestion(''); }} />
      <Action title="Close history" secondary onPress={() => setHistory(false)} />
    </View></View></Modal>
  </View>;
}

function AttachmentReview({ repository, job, done }: { repository: Foundation['imports']; job: ImportJob; done(): void }) {
  const [pages, setPages] = useState<DraftPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  useEffect(() => { void repository.pages(job.id).then(setPages).catch(() => setError('Could not read attachment text. Retry opening this attachment.')); }, [repository, job.id]);
  const page = pages[pageIndex];
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setPreview(null);
    if (page?.preview_name) void sourceUri(page.preview_name).then(uri => { if (active) setPreview(uri); }).catch(() => { if (active) setError('Preview unavailable; extracted text was retained.'); });
    return () => { active = false; };
  }, [page?.preview_name]);
  async function attach(publish = true) {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      for (const item of pages) await repository.saveDraft(job.id, item.page_number, item.reviewed_text);
      if (publish) await repository.publish(job.id);
      done();
    } catch (failure) { setError(importMessage(failure instanceof ImportFailure ? failure.code : 'STORAGE')); }
    finally { guard.current = false; setBusy(false); }
  }
  return <View style={{ padding: 14, borderRadius: 18, backgroundColor: '#fffcf7', gap: 10 }}>
    <Text style={styles.body}>Check attachment text · Page {pageIndex + 1} / {pages.length}</Text>
    {preview && <Image source={{ uri: preview }} accessibilityLabel={`Attachment preview page ${pageIndex + 1}`} resizeMode="contain" style={{ width: '100%', height: 160, borderRadius: 12 }} />}
    <Text style={styles.note}>The local model reads extracted text, not the image itself. Correct OCR mistakes before attaching. Empty text needs a clearer image or typed correction.</Text>
    {page && <TextInput accessibilityLabel={`Attachment text page ${page.page_number}`} multiline editable={!busy} value={page.reviewed_text} maxLength={importLimits.textCharacters} style={[styles.input, { minHeight: 100, maxHeight: 220 }]} onChangeText={text => setPages(items => items.map(item => item.page_number === page.page_number ? { ...item, reviewed_text: text } : item))} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Action title="Previous page" secondary disabled={busy || pageIndex === 0} onPress={() => setPageIndex(pageIndex - 1)} />
      <Action title="Next page" secondary disabled={busy || pageIndex + 1 >= pages.length} onPress={() => setPageIndex(pageIndex + 1)} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Action title={busy ? 'Attaching…' : 'Attach to chat'} disabled={busy || !pages.length || pages.some(item => !item.reviewed_text.trim())} onPress={() => { void attach(); }} />
    <Action title="Review later" secondary disabled={busy} onPress={() => { void attach(false); }} />
  </View>;
}
