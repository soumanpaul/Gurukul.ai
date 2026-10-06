import { useEffect, useState } from 'react';
import { Alert, AppState, Text } from 'react-native';
import type { Foundation } from '../../services/foundation';
import type { RemovalTarget } from '../../adapters/sqlite/storage';
import { availableStorage, cleanupFiles, retryCleanup, withIdleStudy } from '../../adapters/storage-native';
import { modelNativeAvailable } from '../../adapters/model/native';
import { Action, Card, styles } from '../shared/ui';

export function StorageCard({ foundation }: { foundation: Foundation }) {
  const [notebooks, setNotebooks] = useState<Awaited<ReturnType<typeof foundation.repository.listNotebooks>>>([]);
  const [sources, setSources] = useState<Awaited<ReturnType<typeof foundation.imports.list>>>([]);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(0);
  const [free, setFree] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function refresh() {
    setNotebooks(await foundation.repository.listNotebooks());
    setPending((await foundation.storage.pending()).length);
    setFree(availableStorage());
    setSources(selected ? await foundation.imports.list(selected) : []);
  }
  useEffect(() => {
    void refresh().catch(() => setMessage('Storage unavailable. Nothing was reset.'));
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh().catch(() => setMessage('Storage unavailable. Retry refresh.')); });
    return () => subscription.remove();
  }, [selected]);
  async function confirm(target: RemovalTarget) {
    setBusy(true); setMessage('');
    try {
      const preview = await foundation.storage.preview(target);
      const title = target.kind === 'notebook' ? notebooks.find(row => row.id === target.id)?.title : sources.find(row => row.id === target.id)?.title;
      if (!title) throw new Error('CHANGED');
      Alert.alert(`Delete ${target.kind}?`, `Selected ${target.kind}: ${title}\n\nRemove ${preview.sources} sources (including duplicate entries), ${preview.turns} study turns, ${preview.quizzes} quizzes and ${preview.attempts} attempts, with their revisions and search entries. Progress will be recalculated. Model and profile stay. This cannot be undone. Private file cleanup may need retry; this is not secure erasure.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => setBusy(false) },
        { text: 'Delete permanently', style: 'destructive', onPress: () => { void (async () => {
          try {
            await withIdleStudy(foundation, async () => {
              await foundation.storage.remove(target, preview.token);
              await cleanupFiles(foundation);
            });
            setSources([]);
            setMessage('Study records removed. Check pending file cleanup below.');
          } catch { setMessage('Removal could not finish or the selection changed. Finish local work/unload the teacher, refresh, then confirm again. Pending cleanup can be retried.'); }
          finally { setBusy(false); await refresh().catch(() => setMessage('Refresh storage to see the latest removal status.')); }
        })(); } },
      ], { cancelable: false });
    } catch { setBusy(false); setMessage('Cannot prepare deletion. Finish active work and refresh. Invalid saved evidence blocks source deletion rather than guessing its ownership.'); }
  }
  return <Card>
    <Text style={styles.heading}>Storage · on this device</Text>
    <Text style={styles.body}>{free === null ? 'Available storage not measured.' : `${(free / 1024 ** 3).toFixed(2)} GiB available on device (shared with other apps).`}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.note}>{pending} files pending removal. Missing files complete safely; interrupted cleanup resumes when you choose Retry.</Text>
    <Action title="Refresh storage" secondary disabled={busy} onPress={() => { void refresh().catch(() => setMessage('Storage unavailable.')); }} />
    <Action title="Retry confirmed file cleanup" secondary disabled={busy || !pending || !modelNativeAvailable} onPress={() => {
      setBusy(true); void retryCleanup(foundation).then(() => setMessage('Cleanup checked. Any remaining files can be retried.')).catch(() => setMessage('Unload the teacher and finish local work before retrying cleanup.')).finally(() => { setBusy(false); void refresh().catch(() => setMessage('Refresh storage to see pending cleanup.')); });
    }} />
    <Text style={styles.note}>Choose a notebook to manage sources. No files are removed until you confirm. Quit/relaunch preserves pending cleanup; Retry finishes it. Empty notebooks and model removal are independent.</Text>
    {notebooks.map(notebook => <Action key={notebook.id} title={`${selected === notebook.id ? '✓ ' : ''}Manage ${notebook.title}`} secondary disabled={busy} onPress={() => setSelected(notebook.id)} />)}
    {selected && notebooks.some(notebook => notebook.id === selected) && <>
      <Action title="Delete selected notebook…" secondary disabled={busy || !modelNativeAvailable} onPress={() => { void confirm({ kind: 'notebook', id: selected }); }} />
      {sources.map(source => <Action key={source.id} title={`Delete source: ${source.title}…`} secondary disabled={busy || !modelNativeAvailable} onPress={() => { void confirm({ kind: 'source', id: source.id }); }} />)}
    </>}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>}
  </Card>;
}
