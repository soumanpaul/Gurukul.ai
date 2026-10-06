import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Text } from 'react-native';
import manifest from '../../t0/model.json';
import { getModelManager, modelNativeAvailable } from '../../adapters/model/native';
import type { ModelPorts } from '../../services/model-manager';
import { requiredModelStorage } from '../../domain/model';
import { Action, Card, styles } from '../shared/ui';
import type { Foundation } from '../../services/foundation';
import { cleanupFiles } from '../../adapters/storage-native';
import { withNativeSlot } from '../../services/native-slot';

export function ModelCard({ repository, foundation }: { repository: Pick<ModelPorts, 'read' | 'save'>; foundation: Foundation }) {
  return <Card>
    <Text style={styles.heading}>Teacher · {manifest.id}</Text>
    <Text style={styles.body}>{manifest.quantization} · {manifest.bytes.toLocaleString()} bytes ({(manifest.bytes / 1024 ** 2).toFixed(1)} MiB) · {manifest.license}</Text>
    <Text style={styles.note}>Download from Hugging Face only when you choose. No notes or questions are sent. Allow {requiredModelStorage(manifest.bytes).toLocaleString()} free bytes for staging and reserve.</Text>
    <Text selectable style={styles.note}>Revision: {manifest.revision}{'\n'}SHA-256: {manifest.sha256}{'\n'}Runtime: {manifest.runtime}{'\n'}License: {manifest.licenseUrl}</Text>
    {modelNativeAvailable ? <ModelControls repository={repository} foundation={foundation} />
      : <Text style={styles.note}>Local AI needs the native development app, not Expo Go. Your profile and notebooks remain available without a model.</Text>}
  </Card>;
}

function ModelControls({ repository, foundation }: { repository: Pick<ModelPorts, 'read' | 'save'>; foundation: Foundation }) {
  const [manager] = useState(() => getModelManager(repository));
  const state = useSyncExternalStore(manager.subscribe, manager.snapshot);
  useEffect(() => { void manager.check(); }, [manager]);
  const loaded = state.phase === 'loaded' || state.phase === 'generating';
  function download() {
    Alert.alert('Download teacher?', `${manifest.bytes.toLocaleString()} bytes over your current connection, possibly mobile data. Retries restart from zero: range/ETag resume is not enabled. Existing files and any retained partials stay untouched.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Download from zero', onPress: () => { void manager.download(); } },
    ]);
  }
  return <>
    <Text accessibilityLiveRegion="polite" style={styles.body}>Status: {state.phase}</Text>
    {state.phase === 'downloading' && <Text style={styles.body}>{state.received.toLocaleString()} / {manifest.bytes.toLocaleString()} bytes · {Math.floor(state.received / manifest.bytes * 100)}%</Text>}
    {state.message ? <Text selectable accessibilityLiveRegion="polite" style={styles.note}>{state.message}</Text> : null}
    {!loaded && <Action title={state.filename ? 'Download a fresh copy (keep existing)' : 'Download / retry teacher'} secondary={!!state.filename} disabled={state.busy} onPress={download} />}
    {!loaded && <Action title="Check existing local model" secondary disabled={state.busy} onPress={() => { void manager.check(); }} />}
    {state.filename && !loaded && <Action title="Load teacher locally" disabled={state.busy} onPress={() => { void manager.load(); }} />}
    {loaded && <>
      <Action title="Run synthetic local answer" disabled={state.busy} onPress={() => { void manager.answer(); }} />
      <Action title="Unload teacher" secondary disabled={state.busy} onPress={() => { void manager.unload(); }} />
    </>}
    {state.busy && state.phase !== 'unloading' && <Action title="Cancel current work" secondary onPress={() => { void manager.cancel(); }} />}
    <Action title="Remove selected model installation…" secondary disabled={state.busy || loaded || (!state.filename && !state.partial)} onPress={() => Alert.alert('Remove selected teacher?', 'Remove the currently tracked model and staging file only. Notes, quizzes and attempts stay. AI needs an explicit download again. Older untracked copies are retained; this does not remove every model file.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove model', style: 'destructive', onPress: () => { void manager.removeInstallation(async record => {
        if (record.filename !== state.filename || record.partial !== state.partial) throw new Error('CHANGED');
        await withNativeSlot(async () => {
          await foundation.storage.removeModel(manifest.id, record.filename, record.partial);
          await cleanupFiles(foundation).catch(() => {});
        });
      }); } },
    ])} />
    <Text style={styles.note}>The screen stays awake during downloads. Leaving the app cancels transfer and generation and unloads the teacher. Hash verification/load cancellation waits for native work. Unload before diagnostics or deletion. Partial files are never used for inference. Older untracked copies are retained.</Text>
  </>;
}
