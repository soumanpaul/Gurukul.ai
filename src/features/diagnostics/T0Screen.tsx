import { useEffect, useRef, useState } from 'react';
import { AppState, Button, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getReader, nativeReaderAvailable } from '../../t0/native';
import { withNativeSlot } from '../../services/native-slot';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const nativeReady = !isExpoGo && nativeReaderAvailable;
const unavailableReason = isExpoGo
  ? 'Expo Go preview: you can edit the question. Local AI, image OCR and PDF reading require a development build. No answers are simulated.'
  : `Native features unavailable: the DocumentReader bridge is missing from this ${Platform.OS} build. Rebuild the native development app.`;

export default function T0Screen() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('How do plants make food?');
  const [output, setOutput] = useState(nativeReady
    ? 'Use the staged, verified GGUF and synthetic fixtures for the three local T0 checks. Saved evidence is recorded in the build plan.'
    : unavailableReason);
  useEffect(() => {
    if (!nativeReady || Platform.OS !== 'ios' || !getReader().t0SmokeEnabled) return;
    let started = false;
    const start = () => {
      if (started || AppState.currentState !== 'active') return;
      started = true;
      void run(async () => {
        const results: Record<string, unknown> = {
          scope: `iOS ${getReader().smokeDeviceKind} integrated Expo smoke`,
          javascriptDevelopmentMode: __DEV__,
          device: await getReader().deviceInfo!(),
        };
        const operations = {
          inference: async () => (await import('../../t0/run')).runInference('How do plants make food?'),
          image: () => ocr('image'),
          pdf: () => ocr('pdf'),
        };
        for (const [name, operation] of Object.entries(operations)) {
          try {
            const result = await operation();
            if ('text' in result && result.text !== 'Plants use sunlight to make food through photosynthesis.') {
              throw new Error('Synthetic OCR did not match the expected sentence');
            }
            results[name] = { status: 'passed', result };
          } catch (error) {
            results[name] = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
          }
        }
        const reportPath = await getReader().saveT0SmokeReport!(JSON.stringify(results, null, 2));
        return { ...results, reportPath };
      });
    };
    const subscription = AppState.addEventListener('change', start);
    start();
    return () => subscription.remove();
  }, []);
  async function run(operation: () => Promise<unknown>) {
    if (!nativeReady) {
      setOutput(unavailableReason);
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setOutput('Running locally…');
    try {
      setOutput(JSON.stringify(await operation(), null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : 'Native spike failed');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function ocr(kind: 'image' | 'pdf') {
    return withNativeSlot(() => exclusiveOcr(kind));
  }
  async function exclusiveOcr(kind: 'image' | 'pdf') {
    const reader = getReader();
    const start = performance.now();
    const text = kind === 'image' ? await reader.imageText('printed.png') : await reader.pdfText('printed.pdf');
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw new Error('Invalid OCR result');
    return { path: kind, page: 1, text, elapsedMs: performance.now() - start, memory: await reader.memory() };
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Gurukul · {isExpoGo ? 'Expo Go preview' : 'T0 native spike'}</Text>
      <Text>Developer feasibility screen. Synthetic English fixture only. Output needs human review.</Text>
      {!nativeReady && <Text style={styles.notice}>{unavailableReason}</Text>}
      <Text>Synthetic source: Plants use sunlight to make food through photosynthesis.</Text>
      <TextInput accessibilityLabel="Synthetic source question" style={styles.input} value={question} onChangeText={setQuestion} maxLength={300} editable={!busy} />
      <Button title="Load model and answer" disabled={busy || !nativeReady} onPress={() => void run(async () => {
        const { runInference } = await import('../../t0/run');
        return runInference(question);
      })} />
      <Button title="Printed image OCR" disabled={busy || !nativeReady} onPress={() => void run(() => ocr('image'))} />
      <Button title="PDF page render → OCR" disabled={busy || !nativeReady} onPress={() => void run(() => ocr('pdf'))} />
      <Text selectable>{output}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 56, gap: 18 },
  heading: { fontSize: 22, fontWeight: '600' },
  input: { borderWidth: 1, padding: 12 },
  notice: { backgroundColor: '#fff3cd', color: '#664d03', padding: 12 },
});
