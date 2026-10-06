import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileInput } from '../../domain/profile';
import { ProfileForm } from './ProfileForm';
import background from '../../../assets/illustrations/welcome-background.png';

export function WelcomeScreen({ initial, save }: { initial?: ProfileInput; save(input: ProfileInput): Promise<void> }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canvasHeight = Math.max(690, height - insets.top - insets.bottom);
  return <SafeAreaView style={sheet.screen}>
    <KeyboardAvoidingView style={sheet.screen} enabled={Platform.OS === 'android'} behavior="height">
      <ScrollView style={{ flex: 1 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={sheet.scroll}>
        <View style={[sheet.canvas, { minHeight: canvasHeight }]}>
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}><Image source={background} accessible={false} style={{ width: '100%', height: '100%' }} resizeMode="stretch" /></View>
          <View style={[sheet.hero, { paddingTop: canvasHeight * 0.045 }]}>
            <Text accessibilityRole="header" style={sheet.brand}>Gurukul AI</Text>
            <View accessible={false} style={{ height: canvasHeight * 0.205 }} />
            <Text accessibilityRole="header" style={sheet.heading}>Your AI classroom</Text>
            <Text style={sheet.subtitle}>Your free, offline study buddy — 24/7.</Text>
          </View>
          <View style={sheet.form}>
            <ProfileForm welcome initial={initial} save={save} />
          </View>
          <Text style={sheet.footer}>No account needed. Your notes stay on this device.</Text>
          <View style={{ flex: 1, minHeight: 65 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const sheet = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fcf8f0' },
  scroll: { flexGrow: 1 },
  canvas: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  hero: { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  brand: { fontFamily: serif, fontWeight: '700', fontSize: 36, color: '#073e43', letterSpacing: 0.6 },
  heading: { fontFamily: serif, fontWeight: '700', fontSize: 28, color: '#10252e', textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#495662', textAlign: 'center', lineHeight: 25 },
  form: { marginHorizontal: 20, marginTop: 22, borderWidth: 1, borderColor: '#eee7dd', borderRadius: 20, backgroundColor: 'rgba(255,252,247,0.85)', padding: 18 },
  footer: { fontSize: 12, lineHeight: 18, color: '#4e5963', textAlign: 'center', marginTop: 14, marginHorizontal: 26 },
});
