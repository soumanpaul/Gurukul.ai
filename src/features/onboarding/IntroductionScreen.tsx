import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import book from '../../../assets/illustrations/splash-book.png';
import robot from '../../../docs/UX/12-digital-teacher-avatar.png';

export type IntroductionPage = 'book' | 'robot';

export function IntroductionScreen({ page, next, back }: { page: IntroductionPage; next(): void; back(): void }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom;
  const first = page === 'book';
  const artSize = Math.min(width * 0.66, available * (first ? 0.27 : 0.4), first ? 250 : 350);
  return <SafeAreaView style={design.screen}>
    <View pointerEvents="none" accessible={false} style={design.decoration}><View style={design.wash}/><View style={design.leafWash}/></View>
    <ScrollView key={page} contentContainerStyle={[design.content, { minHeight: available }]}>
      {!first && <Pressable accessibilityRole="button" accessibilityLabel="Back to first splash" onPress={back} style={design.back}><Ionicons name="arrow-back" size={24} color="#07525a" accessible={false}/></Pressable>}
      {!first && <Text style={design.brand}>Gurukul AI</Text>}
      <Image source={first ? book : robot} accessible={false} style={{ width: artSize, height: artSize, alignSelf: 'center', resizeMode: 'contain' }}/>
      {first ? <>
        <Text accessibilityRole="header" style={design.brand}>Gurukul AI</Text>
        <Text style={design.subtitle}>Your AI classroom</Text>
        <View style={design.features}>
          {([
            ['library', 'Add your subjects', '#d35e39'],
            ['folder-open', 'Notes by subject', '#078276'],
            ['checkbox', 'Generate quizzes', '#7250a5'],
            ['chatbubbles', 'Clear doubts with free AI buddy', '#167b98'],
          ] as const).map(([icon, label, color]) => <View key={label} style={design.feature}><View style={design.icon}><Ionicons name={icon} size={28} color={color} accessible={false}/></View><Text style={design.featureText}>{label}</Text></View>)}
        </View>
      </> : <View style={design.robotCopy}><Text accessibilityRole="header" style={design.heading}>Meet your{ '\n' }Digital Study Buddy</Text><Text style={design.subtitle}>Learn, practise and clear doubts together.</Text></View>}
      <View style={{ flex: 1, minHeight: 12 }}/>
      <Pressable accessibilityRole="button" accessibilityLabel={first ? 'Next splash' : 'Get Started'} onPress={next} style={design.action}><Text style={design.actionText}>{first ? 'Next' : 'Get Started'}</Text><Ionicons name="arrow-forward" size={24} color="white" accessible={false}/></Pressable>
      <Text style={design.note}>{first ? '1 of 2' : '2 of 2 · One-time teacher setup needed for local AI.'}</Text>
    </ScrollView>
  </SafeAreaView>;
}

const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const design = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fcf8ef' },
  content: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 18, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' },
  decoration: { position: 'absolute', inset: 0, overflow: 'hidden' },
  wash: { position: 'absolute', width: 440, height: 440, borderRadius: 220, backgroundColor: '#f8eed9', left: -220, bottom: -160 },
  leafWash: { position: 'absolute', width: 230, height: 400, borderRadius: 180, backgroundColor: '#e8eddc', right: -180, bottom: -80, transform: [{ rotate: '-25deg' }] },
  brand: { fontFamily: serif, fontSize: 40, fontStyle: 'italic', fontWeight: '700', color: '#073e43', textAlign: 'center' },
  subtitle: { fontSize: 20, lineHeight: 28, color: '#375564', textAlign: 'center' },
  heading: { fontFamily: serif, fontSize: 30, fontWeight: '700', color: '#073e43', textAlign: 'center' },
  features: { gap: 12, marginTop: 18 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 },
  icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#fffcf7' },
  featureText: { flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '600', color: '#124b60' },
  robotCopy: { gap: 16, marginTop: 6 },
  back: { minWidth: 44, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  action: { minHeight: 54, borderRadius: 28, padding: 14, backgroundColor: '#086c70', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  actionText: { fontSize: 20, fontWeight: '600', color: 'white' },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#4c5e5c' },
});
