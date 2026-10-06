import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getModelManager, modelNativeAvailable } from '../../adapters/model/native';
import type { Foundation } from '../../services/foundation';
import manifest from '../../t0/model.json';
import { Action, styles } from '../shared/ui';
import robot from '../../../docs/UX/12-digital-teacher-avatar.png';

const idle = { phase: 'absent', busy: false, received: 0, message: '' };
const subscribe = () => () => {};
const snapshot = () => idle;

export function TeacherSetup({ foundation, finish, back }: { foundation: Foundation; finish(): Promise<void>; back(): Promise<void> }) {
  const { height } = useWindowDimensions();
  const [manager] = useState(() => modelNativeAvailable ? getModelManager(foundation.models) : null);
  const state = useSyncExternalStore(manager?.subscribe ?? subscribe, manager?.snapshot ?? snapshot);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ready = checked && ['ready', 'loaded', 'generating'].includes(state.phase);
  useEffect(() => {
    let active = true;
    void (async () => { try { await manager?.check(); } catch { if (active) setError('Could not check your teacher. Retry in Settings.'); } finally { if (active) setChecked(true); } })();
    return () => { active = false; };
  }, [manager]);
  async function navigate(action: () => Promise<void>) {
    if (saving || state.busy) return;
    setSaving(true); setError('');
    try { await action(); } catch { setError('Could not save your progress. Please retry.'); } finally { setSaving(false); }
  }
  function start() {
    if (!manager || !checked || state.busy || saving) return;
    if (ready) { void navigate(finish); return; }
    Alert.alert('Get your offline teacher?', `${(manifest.bytes / 1024 ** 2).toFixed(1)} MiB download. Internet is needed for setup only; mobile data may be used. ${manifest.license}. Notes stay on this device. Existing files are kept.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Download teacher', onPress: () => { void manager.download(); } },
    ]);
  }
  return <View style={design.screen}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" disabled={saving || state.busy} style={design.back} onPress={() => { void navigate(back); }}><Ionicons name="arrow-back" size={24} color="#12313d"/></Pressable>
    <Text accessibilityRole="header" style={design.title}>Meet your digital teacher</Text>
    <View style={design.art}><View style={design.glow}/><Image source={robot} accessible={false} resizeMode="contain" style={{ width: '100%', height: Math.min(330, Math.max(190, height * 0.34)) }}/></View>
    <Text style={design.heading}>A little guidance. A lot to discover.</Text>
    <Text style={design.description}>Learn from your notes, practise, and explore at your own pace.</Text>
    <View style={design.badges}><View style={design.badge}><Ionicons name="leaf" size={19} color="#086c70"/><Text style={design.small}>Offline after setup</Text></View><View style={design.badge}><Ionicons name="lock-closed" size={19} color="#086c70"/><Text style={design.small}>Private by design</Text></View></View>
    <Text accessibilityLiveRegion="polite" style={design.description}>{!checked ? 'Checking your downloaded teacher…' : ready ? 'Your teacher is already on this device. No download needed.' : state.phase === 'downloading' ? `Getting your teacher ready · ${Math.floor(state.received / manifest.bytes * 100)}%` : state.busy ? 'Verifying your teacher…' : !manager ? 'Local AI needs a native app build, not Expo Go.' : state.message || 'One-time download. Internet needed for setup.'}</Text>
    <Action title={ready ? 'Continue with my teacher' : 'Bring my teacher to life'} disabled={saving || !checked || state.busy || !manager} onPress={start}/>
    {state.busy && <Action title="Cancel setup" secondary onPress={() => { void manager?.cancel(); }}/>}
    <Action title="Explore first" secondary disabled={saving || state.busy || !checked} onPress={() => { void navigate(finish); }}/>
    <Text style={design.footnote}>No account required. Teacher details and license are in Settings.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const design = StyleSheet.create({
  screen: { gap: 12 }, back: { minHeight: 48, width: 48, justifyContent: 'center' },
  title: { fontFamily: serif, fontSize: 27, fontWeight: '700', color: '#102532' },
  art: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: '85%', aspectRatio: 1, borderRadius: 200, backgroundColor: '#e0f6ea', borderWidth: 1, borderColor: '#d0ede5' },
  heading: { fontFamily: serif, fontSize: 21, fontWeight: '700', color: '#102532', textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, color: '#4c5e5c', textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 24, backgroundColor: '#eff6ee' },
  small: { fontSize: 12, color: '#12313d' }, footnote: { fontSize: 12, lineHeight: 17, textAlign: 'center', color: '#4c5e5c' },
});
