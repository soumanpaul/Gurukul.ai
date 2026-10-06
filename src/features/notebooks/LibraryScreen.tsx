import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, BackHandler, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { getReader } from '../../t0/native';
import manifest from '../../t0/model.json';
import { modelNativeAvailable } from '../../adapters/model/native';
import type { Foundation } from '../../services/foundation';
import type { Notebook } from '../../adapters/sqlite/repository';
import type { DraftPage, ImportJob, Source } from '../../domain/imports';
import { ImportFailure, importHelp, importMessage, importLimits } from '../../domain/imports';
import { captureSource, getImportManager, importId, importNativeAvailable, pickSource, sourceUri } from '../../adapters/imports/native';
import { Action, Card, styles } from '../shared/ui';
import mascot from '../../../assets/illustrations/book-mascot.png';
import { NotebookStudy } from '../study/NotebookStudy';
import { useReducedMotion } from '../shared/TeacherStatus';
import { wideNotebook } from '../../domain/experience';
import { HomeReady } from './HomeReady';
import { createSheetDismissal } from '../../services/sheet-dismissal';

type Sheet = 'destination' | 'add' | 'paste' | 'notebook' | null;
const emptyState = { busy: false, progress: '', error: '', jobId: '' };
const noopSubscribe = () => () => {};
const emptySnapshot = () => emptyState;

export function LibraryScreen({ foundation, viewportHeight = 0, onNavigate }: { foundation: Foundation; viewportHeight?: number; onNavigate?(): void }) {
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const wide = wideNotebook(width, fontScale);
  const [readiness, setReadiness] = useState('Checking installation status…');
  const [offlineReady, setOfflineReady] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const repository = foundation.imports;
  const [manager] = useState(() => importNativeAvailable ? getImportManager(repository) : null);
  const work = useSyncExternalStore(manager?.subscribe ?? noopSubscribe, manager?.snapshot ?? emptySnapshot);
  const [notebooks, setNotebooks] = useState(foundation.notebooks);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pendingInput, setPendingInput] = useState<'file' | 'camera' | 'paste' | 'options'>('options');
  const [sheetDismissal] = useState(createSheetDismissal);
  useEffect(() => () => sheetDismissal.cancel(), [sheetDismissal]);
  const [title, setTitle] = useState('');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [review, setReview] = useState<{ job: ImportJob; source: Source } | null>(null);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof repository.search>>>([]);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'Sources' | 'Study' | 'History'>('Sources');
  const locked = busy || work.busy;
  const notebookRef = useRef(notebook);
  notebookRef.current = notebook;

  async function refresh() {
    const current = await foundation.repository.listNotebooks();
    setNotebooks(current);
    const entries = await Promise.all(current.map(async item => [item.id, (await repository.list(item.id)).filter(source => source.status !== 'duplicate').length] as const));
    setCounts(Object.fromEntries(entries));
    if (notebookRef.current) setSources(await repository.list(notebookRef.current.id));
  }
  useEffect(() => { void refresh().catch(() => setError(importMessage('STORAGE'))); }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      const record = await foundation.models.read();
      let ready = false;
      if (modelNativeAvailable && record?.status === 'ready' && record.filename && /^[A-Za-z0-9_.-]+$/.test(record.filename) && !record.filename.includes('..') && !await foundation.models.pendingRemoval(record.filename)) {
        const file = new File(await getReader().modelDirectory(), record.filename);
        ready = file.exists && file.size === manifest.bytes;
      }
      if (active) {
        setOfflineReady(ready);
        setReadiness(ready ? 'The local teacher file is available on this device. Its checksum is verified again before generation. Ready Offline describes local availability, not completed release testing; disconnected/network checks and AI quality acceptance remain pending. Use files already downloaded to this device.' : 'Set up the teacher in Settings for local AI. Import and review still work.');
      }
    })().catch(() => { if (active) { setOfflineReady(false); setReadiness('Installation status unavailable. Check Settings.'); } });
    return () => { active = false; };
  }, [foundation.models]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) { setSheet(null); return true; }
      if (review) { setReview(null); return true; }
      if (notebook) { setNotebook(null); return true; }
      if (showAll) { setShowAll(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [sheet, review, notebook, showAll]);
  async function perform(action: () => Promise<void>) {
    if (locked || busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (failure) { setError(importMessage(failure instanceof ImportFailure ? failure.code : 'FAILED')); }
    finally { await refresh().catch(() => setError(importMessage('STORAGE'))); busyRef.current = false; setBusy(false); }
  }
  async function open(item: Notebook) {
    setTab('Sources');
    setNotebook(item); notebookRef.current = item; setSearch(''); setMatches([]); setError('');
    setSources(await repository.list(item.id));
  }
  async function showJob(jobId: string | null) {
    if (!jobId) return;
    const job = await repository.job(jobId); const source = await repository.source(job.document_id);
    if (job.status === 'review') setReview({ job, source });
    if (job.status === 'duplicate') setNotice('Identical content is already in this notebook. Open the existing source below; no duplicate search entries were created.');
  }
  async function add(kind: 'file' | 'camera' | 'paste') {
    if (!manager) throw new ImportFailure('NATIVE');
    const target = notebookRef.current;
    if (!target) { setPendingInput(kind); setSheet('destination'); return; }
    if (kind === 'paste') { setTitle('Pasted notes'); setPaste(''); setSheet('paste'); return; }
    Keyboard.dismiss();
    await sheetDismissal.wait(() => setSheet(null), Platform.OS === 'ios' && sheet !== null);
    const input = kind === 'file' ? await pickSource() : await captureSource();
    if (input) await showJob(await manager.start({ ...input, notebookId: target.id }));
  }
  async function openSource(source: Source) {
    if (source.duplicate_of) source = await repository.source(source.duplicate_of);
    if (source.status === 'ready') await repository.revise(source.id, importId(), importId());
    const job = await repository.latestJob(source.id);
    if (job.status === 'review') setReview({ job, source });
    else await showJob(await manager!.retry(job.id));
  }
  if (review) return <ReviewScreen repository={repository} job={review.job} source={review.source}
    close={() => { setReview(null); void refresh(); }} />;
  return <>
    {!notebook ? showAll ? <>
      <View style={design.row}><Pressable accessibilityRole="button" accessibilityLabel="Back to home" style={design.iconButton} onPress={() => setShowAll(false)}><Feather name="arrow-left" size={24} color="#075e63" /></Pressable><Text style={[design.section, { flex: 1 }]}>All notebooks</Text></View>
      <Action title="Create notebook" secondary onPress={() => { setTitle(''); setSheet('notebook'); }} />
      {!notebooks.length && <Text style={styles.note}>Create your first notebook to keep notes together.</Text>}
      {notebooks.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open notebook ${item.title}`} disabled={locked} style={[design.notebookCard, design.row]} onPress={() => { void perform(() => open(item)); }}>
        <Feather name="book-open" size={25} color="#07696c" /><View style={{ flex: 1, gap: 4 }}><Text style={design.section}>{item.title}</Text><Text style={styles.note}>{counts[item.id] ?? 0} sources</Text></View><Feather name="chevron-right" size={20} color="#075e63" />
      </Pressable>)}
    </> : <HomeReady height={viewportHeight} nickname={foundation.profile?.nickname ?? 'there'} notebooks={notebooks} counts={counts} readiness={readiness} offlineReady={offlineReady} busy={locked}
      onOpen={item => { void perform(() => open(item)); }}
      onCreate={() => { setTitle(''); setSheet('notebook'); }}
      onViewAll={() => setShowAll(true)}
      onAdd={kind => { if (!locked) { setError(''); setPendingInput(kind); setSheet('destination'); } }}
    /> : <>
      <View style={design.row}><Pressable accessibilityLabel="Back to notebooks" accessibilityRole="button" style={design.iconButton} onPress={() => setNotebook(null)}><Feather name="arrow-left" size={24} /></Pressable><Text style={[design.section, { flex: 1 }]}>{notebook.title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Teacher availability" style={design.badge} onPress={() => Alert.alert('Local teacher', readiness)}><Text style={design.badgeText}>{offlineReady ? '✓ Ready offline' : 'Setup needed'}</Text></Pressable>{tab === 'Study' && <Pressable accessibilityRole="button" accessibilityLabel="Notebook study options" style={design.iconButton} onPress={() => Alert.alert('Study options', 'Answers use only your selected notes. Previous conversations remain in History.', [{ text: 'Choose sources', onPress: () => { setTab('Sources'); onNavigate?.(); } }, { text: 'Open history', onPress: () => { setTab('History'); onNavigate?.(); } }, { text: 'Cancel', style: 'cancel' }])}><Feather name="more-vertical" size={20} color="#075e63"/></Pressable>}</View>
      <View style={design.tabs}>{(['Sources','Study','History'] as const).map(item => <Pressable accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: tab === item }} key={item} style={[design.tab, tab === item && design.activeTab]} onPress={() => { setTab(item); onNavigate?.(); }}><Feather name={item === 'Sources' ? 'folder' : item === 'Study' ? 'book-open' : 'clock'} size={19} color="#075e63" /><Text style={[styles.note, { flexShrink: 1, fontWeight: tab === item ? '700' : '400' }]}>{item}</Text></Pressable>)}</View>
      {tab !== 'Sources' ? <NotebookStudy key={notebook.id} foundation={foundation} notebook={notebook.id} historyOnly={tab === 'History'} viewportHeight={viewportHeight} /> : <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}><View style={{ flex: 1, minWidth: 0, gap: 16 }}>
      <View style={design.sourceHero}><Text style={[styles.body, { flex: 1 }]}>Add your notes, textbook pages or class materials.{ '\n' }Review them here, on your device.</Text><Image source={mascot} style={{ width: 108, height: 118 }} accessible={false} /></View>
      <View style={design.row}><Text style={design.section}>Selected sources</Text><Text style={styles.note}>{sources.filter(source => source.selected && source.status !== 'duplicate').length} selected</Text></View>
      {!sources.length && <Text style={styles.note}>No sources yet. Add a file, photo or pasted text.</Text>}
      {sources.map(source => <View key={source.id} style={design.sourceRow}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!source.selected }} accessibilityLabel={`Select ${source.title}`} disabled={locked || source.status === 'duplicate'} style={design.iconButton} onPress={() => { void perform(() => repository.select(source.id, !source.selected)); }}><Feather name={source.selected ? 'check-square' : 'square'} size={22} color="#07696c" /></Pressable>
        <View style={[design.fileIcon, { backgroundColor: source.kind === 'pdf' ? '#fff0e9' : '#ecf4f8' }]}><Feather name={source.kind === 'jpg' || source.kind === 'png' ? 'image' : 'file-text'} size={22} color={source.kind === 'pdf' ? '#bb4937' : '#317096'} /></View>
        <Pressable accessibilityRole="button" disabled={locked || !manager} style={{ flex: 1, paddingVertical: 8 }} onPress={() => { void perform(() => openSource(source)); }}><Text style={design.sourceTitle}>{source.title}</Text><Text style={styles.note}>{source.page_count ? `${source.page_count} page${source.page_count === 1 ? '' : 's'} · ` : ''}{source.status === 'review' ? 'Needs review' : source.status}{source.status === 'ready' ? ' · Edit revision' : ''}</Text></Pressable>
        <Feather name="chevron-right" size={20} color="#77817e" />
      </View>)}
      <Action title="＋  Add your notes" disabled={locked} onPress={() => setSheet('add')} />
      <Action title="Study selected notes" disabled={locked || !sources.some(source => source.selected && source.status === 'ready')} onPress={() => { setTab('Study'); onNavigate?.(); }} />
      <Text style={design.section}>Find text in selected sources</Text>
      <TextInput accessibilityLabel="Search reviewed source text" value={search} onChangeText={setSearch} placeholder="Search your saved notes…" style={styles.input} maxLength={120} />
      <Action title="Search on this device" secondary disabled={locked || !search.trim()} onPress={() => { void perform(async () => { const result = await repository.search(notebook.id, search); setMatches(result); setNotice(result.length ? '' : 'No matching reviewed text in selected sources. Save reviewed pages first.'); }); }} />
      {matches.map((match, index) => <Card key={`${match.document_id}-${index}`}><Text style={design.sourceTitle}>{match.title} · page {match.page_number}</Text><Text selectable style={styles.body}>{match.text}</Text></Card>)}
      </View>{wide && <View style={{ flex: 1, minWidth: 0 }}><NotebookStudy foundation={foundation} notebook={notebook.id} historyOnly /></View>}</View>}
    </>}
    {(error || work.error) && <Text accessibilityRole="alert" style={styles.error}>{error || work.error}</Text>}
    {notice ? <View style={design.notice}><Text style={styles.note}>{notice}</Text></View> : null}
    {work.busy && <Card><Text accessibilityLiveRegion="polite" style={styles.body}>{work.progress}</Text><Action title="Cancel import" secondary onPress={() => manager?.cancel()} /></Card>}
    {notebook && tab === 'Sources' && <Text style={styles.note}>{importHelp}</Text>}
    <Modal visible={sheet !== null} transparent animationType={reducedMotion ? 'none' : 'slide'} onDismiss={sheetDismissal.didDismiss} onRequestClose={() => setSheet(null)}>
      <KeyboardAvoidingView style={design.scrim} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={design.sheet}><View style={design.handle} /><View style={design.row}><Text style={design.section}>{sheet === 'notebook' ? 'New notebook' : sheet === 'paste' ? 'Paste your notes' : 'Add your notes'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close import options" style={design.iconButton} onPress={() => { Keyboard.dismiss(); setSheet(null); }}><Feather name="x" size={22} /></Pressable></View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {(sheet === 'add' || sheet === 'paste') && notebook && <Text style={styles.note}>Adding to: {notebook.title}</Text>}
          {sheet === 'destination' ? <View style={{ gap: 12 }}>
            <Text style={design.sourceTitle}>Choose a notebook</Text>
            <Text style={styles.note}>Select where these notes belong. No notebook is selected automatically.</Text>
            {notebooks.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Add notes to ${item.title}`} disabled={locked} style={design.option} onPress={() => { void perform(async () => { await open(item); if (pendingInput === 'options') setSheet('add'); else await add(pendingInput); }); }}><Feather name="book-open" size={23} color="#07696c" /><Text style={[design.sourceTitle, { flex: 1 }]}>{item.title}</Text><Feather name="chevron-right" size={21} color="#07696c" /></Pressable>)}
            {!notebooks.length && <><Text style={styles.note}>Create a notebook first, then add your notes inside it.</Text><Action title="Create notebook" onPress={() => { setTitle(''); setSheet('notebook'); }} /></>}
</View> : sheet === 'add' ? <View style={{ gap: 12 }}>{(['file','camera','paste'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" style={design.option} disabled={locked} onPress={() => { void perform(() => add(kind)); }}><Feather name={kind === 'file' ? 'file-text' : kind === 'camera' ? 'camera' : 'align-left'} size={25} color="#05696b" /><View style={{ flex: 1 }}><Text style={design.sourceTitle}>{kind === 'file' ? 'Choose a file' : kind === 'camera' ? 'Use camera' : 'Paste text'}</Text><Text style={styles.note}>{kind === 'file' ? 'PDF, TXT, JPG or PNG · local files' : kind === 'camera' ? 'Printed English notes' : 'Type or paste your own text'}</Text></View><Feather name="chevron-right" size={21} color="#788181" /></Pressable>)}<Text style={styles.note}>ⓘ  Review extracted text before saving. Choose files already available on this device.</Text></View> : <View style={{ gap: 14 }}>
            <TextInput accessibilityLabel={sheet === 'notebook' ? 'Notebook name' : 'Source title'} style={styles.input} placeholder={sheet === 'notebook' ? 'e.g. Biology' : 'e.g. Class notes'} value={title} onChangeText={setTitle} maxLength={120} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            {sheet === 'paste' && <TextInput multiline accessibilityLabel="Paste source text" style={[styles.input, { minHeight: 190, textAlignVertical: 'top' }]} placeholder="Paste clean English text here…" value={paste} onChangeText={setPaste} maxLength={importLimits.textCharacters} />}
          </View>}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </ScrollView>
        {(sheet === 'notebook' || sheet === 'paste') && <View style={{ gap: 8 }}>
            <Text accessibilityLiveRegion="polite" style={styles.note}>{locked ? 'Finishing local work… Please wait.' : !title.trim() ? 'Enter a name to continue.' : sheet === 'paste' && !paste.trim() ? 'Paste some text to continue.' : 'Ready to save on this device.'}</Text>
            <Action title={busy ? 'Saving…' : sheet === 'notebook' ? 'Create notebook' : 'Review text'} disabled={locked || !title.trim() || (sheet === 'paste' && !paste.trim())} onPress={() => { Keyboard.dismiss(); void perform(async () => {
              if (!manager) throw new ImportFailure('NATIVE');
              if (sheet === 'notebook') { const id = importId(); await repository.createNotebook(id, title); setSheet(null); await open({ id, title: title.trim(), createdAt: new Date().toISOString() }); }
              else if (notebook) { setSheet(null); await showJob(await manager.start({ notebookId: notebook.id, title, kind: 'txt', text: paste })); }
            }); }} />
          </View>}
      </View></KeyboardAvoidingView>
    </Modal>
  </>;
}

function ReviewScreen({ repository, job, source, close }: { repository: Foundation['imports']; job: ImportJob; source: Source; close(): void }) {
  const [pages, setPages] = useState<DraftPage[]>([]);
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(0);
  const [busy, setBusy] = useState(false);
  const writes = useRef(Promise.resolve());
  const writeError = useRef(false);
  const page = pages[index];
  useEffect(() => { void repository.pages(job.id).then(setPages).catch(() => setError(importMessage('STORAGE'))); }, [job.id, repository]);
  useEffect(() => {
    let cancelled = false; setPreview(null);
    if (page?.preview_name) void sourceUri(page.preview_name).then(uri => { if (!cancelled) setPreview(uri); }).catch(() => setError(importMessage('MISSING')));
    return () => { cancelled = true; };
  }, [page?.preview_name]);
  function edit(text: string) {
    if (!page) return;
    const number = page.page_number;
    setPages(previous => previous.map(item => item.page_number === number ? { ...item, reviewed_text: text } : item));
    setSaving(value => value + 1);
    writes.current = writes.current.then(() => repository.saveDraft(job.id, number, text)).catch(() => { writeError.current = true; setError(importMessage('STORAGE')); }).finally(() => setSaving(value => value - 1));
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await writes.current;
      if (writeError.current) throw new ImportFailure('STORAGE');
      await repository.publish(job.id); close();
    } catch (failure) { setError(importMessage(failure instanceof ImportFailure ? failure.code : 'STORAGE')); }
    finally { setBusy(false); }
  }
  return <>
    <View style={design.row}><Pressable accessibilityRole="button" accessibilityLabel="Back, keep review draft" disabled={busy} style={design.iconButton} onPress={close}><Feather name="arrow-left" size={24} /></Pressable><Text style={[design.section, { flex: 1 }]}>Review extracted text</Text></View>
    <View style={design.option}><Feather name="file-text" size={23} color="#ba4b39" /><Text style={[styles.body, { flex: 1 }]}>{source.title} · Page {index + 1} of {pages.length || source.page_count}</Text></View>
    {preview && <Image source={{ uri: preview }} style={design.preview} resizeMode="contain" accessibilityLabel={`Original page ${index + 1}`} onError={() => setError('Page preview unavailable. The original and text were kept.')} />}
    <View style={design.notice}><Feather name="alert-triangle" size={20} color="#a86406" /><Text style={[styles.note, { flex: 1 }]}>{page?.raw_text.trim() ? 'Check every word against the original. OCR can be wrong; no confidence highlights are fabricated.' : 'No readable text found. Type the printed text or return and import a clearer page.'}</Text></View>
    {page && <><Text style={styles.note}>Method: {page.extraction_method} · English printed baseline</Text><TextInput accessibilityLabel={`Reviewed text for page ${page.page_number}`} editable={!busy} multiline maxLength={importLimits.textCharacters} style={[styles.input, { minHeight: 200, textAlignVertical: 'top' }]} value={page.reviewed_text} onChangeText={edit} /></>}
    <Text accessibilityLiveRegion="polite" style={styles.note}>{saving ? 'Saving draft on this device…' : 'Edits are saved on this device. Search updates only after Save.'}</Text>
    <View style={design.row}><Action title="← Previous" secondary disabled={busy || index === 0} onPress={() => setIndex(index - 1)} /><Text style={styles.note}>{index + 1} / {pages.length}</Text><Action title="Next →" secondary disabled={busy || index + 1 >= pages.length} onPress={() => setIndex(index + 1)} /></View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Action title={busy ? 'Saving and indexing…' : 'Save to notebook'} disabled={busy || !pages.length || pages.some(item => !item.reviewed_text.trim())} onPress={() => { void save(); }} />
    <Action title="Back · keep draft" secondary disabled={busy} onPress={close} />
  </>;
}

const design = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  greeting: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20, color: '#102532' },
  display: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 29, lineHeight: 37, fontWeight: '700', color: '#102532' },
  badge: { flexDirection: 'row', gap: 6, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e0efdb' },
  badgeText: { fontSize: 13, color: '#225f41' },
  hero: { backgroundColor: '#fff0d6', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 190 },
  eyebrow: { fontSize: 15, color: '#835816' },
  heroTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '700', fontSize: 23, color: '#122d36' },
  heroImage: { width: '39%', height: 156, resizeMode: 'contain' },
  section: { fontSize: 19, fontWeight: '600', color: '#122430' },
  notebookControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollArrow: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#e4efdf' },
  notebookRail: { gap: 12, paddingBottom: 12 },
  notebookCard: { borderWidth: 1, borderColor: '#e4dfd6', borderRadius: 15, padding: 15, gap: 9, backgroundColor: '#fffcf7' },
  notebookIcon: { width: 53, height: 42, resizeMode: 'contain', backgroundColor: '#e4efdf', borderRadius: 9 },
  quickAction: { flex: 1, minHeight: 96, justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e4dfd6', borderRadius: 13, backgroundColor: '#fffcf7' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5dfd7' },
  tab: { flex: 1, flexDirection: 'row', gap: 7, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#087478' },
  sourceHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 18, backgroundColor: '#f7eddc' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, minHeight: 76, borderWidth: 1, borderColor: '#e5dfd7', borderRadius: 14, backgroundColor: '#fffcf8' },
  sourceTitle: { fontSize: 16, fontWeight: '600', color: '#132531', lineHeight: 23 },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  fileIcon: { width: 37, height: 42, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: '#10272d44', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fffcf7', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 40, gap: 12, maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 43, height: 5, backgroundColor: '#cdc8be', borderRadius: 3 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 15, borderWidth: 1, borderColor: '#e5dfd7', borderRadius: 13, minHeight: 75 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: '#ffedc4', borderRadius: 12 },
  preview: { width: '100%', height: 305, borderRadius: 14, backgroundColor: '#eee8dc' },
});
