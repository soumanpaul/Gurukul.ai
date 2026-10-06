import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFoundation } from '../src/adapters/sqlite/open';
import { DatabaseVersionError } from '../src/db/migrate';
import type { Foundation } from '../src/services/foundation';
import type { ProfileInput } from '../src/domain/profile';
import { ProfileForm } from '../src/features/onboarding/ProfileForm';
import { LibraryScreen } from '../src/features/notebooks/LibraryScreen';
import wordmark from '../assets/illustrations/gurukul-wordmark.png';
import { StudyScreen } from '../src/features/study/StudyScreen';
import { ProgressScreen } from '../src/features/progress/ProgressScreen';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';
import T0Screen from '../src/features/diagnostics/T0Screen';
import { T2Smoke } from '../src/features/diagnostics/T2Smoke';
import { T3Smoke } from '../src/features/diagnostics/T3Smoke';
import { T4Smoke } from '../src/features/diagnostics/T4Smoke';
import { T5Smoke } from '../src/features/diagnostics/T5Smoke';
import { T7Smoke } from '../src/features/diagnostics/T7Smoke';
import { T8Evaluation } from '../src/features/diagnostics/T8Evaluation';
import { getReader, nativeReaderAvailable } from '../src/t0/native';
import { Action, Card, styles } from '../src/features/shared/ui';
import { mainRoutes, routeLabels } from './routes';
import type { Route } from './routes';

export default function AppShell() {
  return <SafeAreaProvider><FoundationApp /></SafeAreaProvider>;
}

function FoundationApp() {
  const contentScroll=useRef<ScrollView>(null);
  const resetProgressScroll=useCallback(()=>contentScroll.current?.scrollTo({y:0,animated:false}),[]);
  const [foundation, setFoundation] = useState<Foundation | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState<Route>('notebooks');
  const [contentHeight, setContentHeight] = useState(0);
  const t0Smoke = nativeReaderAvailable && getReader().t0SmokeEnabled;
  const t2Smoke = nativeReaderAvailable && getReader().t2SmokeEnabled;
  const t3Smoke = nativeReaderAvailable && getReader().t3SmokeEnabled;
  const t4Smoke = nativeReaderAvailable && getReader().t4SmokeEnabled;
  const t5Smoke = nativeReaderAvailable && getReader().t5SmokeEnabled;
  const t7Smoke = nativeReaderAvailable && getReader().t7SmokeEnabled;
  const t8Mode = nativeReaderAvailable && getReader().t8Mode;
  useEffect(() => {
    if (t0Smoke || t2Smoke || t3Smoke || t4Smoke || t5Smoke || t7Smoke || t8Mode) return;
    let cancelled = false;
    setError('');
    void getFoundation().then(result => { if (!cancelled) setFoundation(result); }).catch(failure => {
      if (!cancelled) setError(failure instanceof DatabaseVersionError
        ? 'This database needs a compatible app version. Your data was not reset.'
        : 'Local storage could not be opened. Your data was not reset. Check device storage, then retry.');
    });
    return () => { cancelled = true; };
  }, [attempt, t0Smoke, t2Smoke, t3Smoke, t4Smoke, t5Smoke, t7Smoke, t8Mode]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'notebooks') return false;
      setRoute(route === 'diagnostics' ? 'settings' : 'notebooks');
      return true;
    });
    return () => subscription.remove();
  }, [route]);
  async function save(input: ProfileInput) {
    if (!foundation) throw new Error('Storage is not ready.');
    const profile = await foundation.repository.saveProfile(input);
    setFoundation(previous => previous ? { ...previous, profile } : previous);
  }
  if (t0Smoke) return <T0Screen />;
  if (t2Smoke) return <T2Smoke />;
  if (t3Smoke) return <T3Smoke />;
  if (t4Smoke) return <T4Smoke />;
  if (t5Smoke) return <T5Smoke />;
  if (t7Smoke) return <T7Smoke />;
  if (t8Mode) return <T8Evaluation />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fcf8f0' }}>
    {route === 'diagnostics' && foundation?.profile ? <>
      <Action title="Back to settings" secondary onPress={() => setRoute('settings')} />
      <T0Screen />
    </> : <ScrollView ref={contentScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      onLayout={event => setContentHeight(event.nativeEvent.layout.height)}
      automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.page, route === 'notebooks' && { maxWidth: 1200, paddingVertical: 16 }]}>
      {!foundation?.profile && <Image source={wordmark} accessibilityLabel="Gurukul" style={{ width: 230, height: 92, alignSelf: 'center', resizeMode: 'contain' }} />}
      {!foundation && !error && <><ActivityIndicator accessibilityLabel="Opening local storage" /><Text style={styles.body}>Opening your local workspace…</Text></>}
      {error ? <Card>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <Action title="Retry opening storage" onPress={() => setAttempt(value => value + 1)} />
      </Card> : null}
      {foundation && !foundation.profile && <>
        <Text style={styles.heading}>A place to learn, on your device</Text>
        <Text style={styles.body}>Choose a local nickname or skip it. No account, phone number, email or internet required.</Text>
        <ProfileForm welcome save={save} />
      </>}
      {foundation?.profile && <>
        {route === 'notebooks' && <LibraryScreen foundation={foundation} viewportHeight={contentHeight} />}
        {route === 'study' && <StudyScreen />}
        {route === 'progress' && <ProgressScreen foundation={foundation} onNavigate={resetProgressScroll} />}
        {route === 'settings' && <SettingsScreen foundation={foundation} profile={foundation.profile} models={foundation.models} save={save} diagnostics={() => setRoute('diagnostics')} onNavigate={resetProgressScroll} />}
      </>}
    </ScrollView>}
    {foundation?.profile && route !== 'diagnostics' && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#e5dfd7', backgroundColor: '#fffaf2', paddingTop: 7 }}>
      {mainRoutes.filter(destination => destination !== 'study').map(destination => {
        const selected = route === destination;
        const label = destination === 'notebooks' ? 'Home' : routeLabels[destination];
        const icon = destination === 'notebooks' ? 'home' : destination === 'progress' ? 'bar-chart' : 'settings';
        return <Pressable key={destination} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
          style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3, paddingBottom: 3 }} onPress={() => setRoute(destination)}>
          <View style={{ minWidth: 48, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 16, alignItems: 'center', backgroundColor: selected ? '#e0efdb' : 'transparent' }}>
            <Ionicons accessible={false} name={selected ? icon : `${icon}-outline`} size={23} color={selected ? '#086d70' : '#66716f'} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '400', color: selected ? '#086d70' : '#66716f' }}>{label}</Text>
          <View style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: selected ? '#086d70' : 'transparent' }} />
        </Pressable>;
      })}
    </View>}
  </SafeAreaView>;
}
