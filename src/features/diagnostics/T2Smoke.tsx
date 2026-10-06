import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { getFoundation } from '../../adapters/sqlite/open';
import { getModelManager } from '../../adapters/model/native';
import { getReader } from '../../t0/native';
import manifest from '../../t0/model.json';
import { styles } from '../shared/ui';

export function T2Smoke() {
  const [output, setOutput] = useState('Waiting for foreground to run the explicit T2 native smoke…');
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started || AppState.currentState !== 'active') return;
      started = true;
      void run().catch(() => setOutput('T2 smoke could not save its report. Inspect local storage.'));
    };
    async function run() {
      const reader = getReader();
      const report: Record<string, unknown> = { ticket: 'T2', manifest, javascriptDevelopmentMode: __DEV__ };
      try {
        const foundation = await getFoundation();
        const manager = getModelManager(foundation.models);
        report.device = await reader.deviceInfo!();
        await manager.check();
        report.discovery = manager.snapshot();
        if (reader.t2DownloadEnabled) {
          setOutput('Testing download cancellation…');
          let cancelled = false;
          const subscription = manager.subscribe(() => {
            if (!cancelled && manager.snapshot().phase === 'downloading' && manager.snapshot().received >= 1024 * 1024) {
              cancelled = true;
              void manager.cancel();
            }
          });
          try { await manager.download(); } finally { subscription(); }
          report.cancel = manager.snapshot();
          if (!cancelled || !manager.snapshot().message.startsWith('Stopped.')) throw new Error('Download cancel did not pass');
          const start = performance.now();
          const progress = manager.subscribe(() => {
            const state = manager.snapshot();
            setOutput(`T2 download test: ${state.phase}\n${state.received.toLocaleString()} / ${manifest.bytes.toLocaleString()} bytes\nKeep Gurukul in the foreground. Screen stays awake during the transfer.`);
          });
          try { await manager.download(); } finally { progress(); }
          report.download = { ...manager.snapshot(), elapsedMs: performance.now() - start };
          if (manager.snapshot().phase !== 'ready' || !manager.snapshot().filename?.startsWith(`model-${manifest.sha256}-`)) throw new Error('Fresh model not ready');
        }
        report.memoryBefore = await reader.memory();
        await manager.load(); report.load = manager.snapshot();
        if (manager.snapshot().phase !== 'loaded') throw new Error('Model not loaded');
        report.memoryLoaded = await reader.memory();
        await manager.answer(); report.answer = manager.snapshot();
        if (!manager.snapshot().message.startsWith('Synthetic check:')) throw new Error('No real local answer');
        await manager.unload(); report.unload = manager.snapshot();
        if (manager.snapshot().phase !== 'ready') throw new Error('Unload did not pass');
        report.persisted = await foundation.models.read();
        report.profileUnchanged = JSON.stringify(await foundation.repository.readProfile()) === JSON.stringify(foundation.profile);
        report.status = 'passed';
      } catch (error) {
        report.status = 'failed'; report.error = error instanceof Error ? error.message : 'Smoke failed';
      }
      const reportPath = await reader.saveT0SmokeReport!(JSON.stringify(report, null, 2));
      setOutput(JSON.stringify({ ...report, reportPath }, null, 2));
    }
    const subscription = AppState.addEventListener('change', start);
    start();
    return () => subscription.remove();
  }, []);
  return <ScrollView contentContainerStyle={styles.page}><Text selectable>{output}</Text></ScrollView>;
}
