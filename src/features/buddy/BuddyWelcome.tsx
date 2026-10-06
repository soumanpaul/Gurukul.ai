import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import robot from '../../../docs/UX/12-digital-teacher-avatar.png';

export function BuddyWelcome({ height, onStart }: { height: number; onStart(): void }) {
  const artworkHeight = Math.max(150, Math.min(290, height * 0.42));
  return <ScrollView testID="buddy-introduction" contentContainerStyle={design.content}>
    <View style={design.brand}>
      <Ionicons name="leaf" size={22} color="#70ad92" accessible={false}/>
      <Text style={design.wordmark}>Gurukul AI</Text>
    </View>
    <View style={[design.artwork, { height: artworkHeight }]} accessible={false}>
      <View style={design.halo}/>
      <Image source={robot} accessible={false} resizeMode="contain" style={design.robot}/>
    </View>
    <View style={design.copy}>
      <Text accessibilityRole="header" style={design.heading}>Hi, I’m your{'\n'}AI study buddy</Text>
      <Text style={design.description}>Let’s learn, practise and clear your doubts.{'\n'}One subject at a time.</Text>
    </View>
    <View style={design.footer}>
      <Pressable testID="buddy-get-started" accessibilityRole="button" accessibilityLabel="Get Started" onPress={onStart} style={({ pressed }) => [design.button, pressed && { opacity: 0.8 }]}>
        <Text style={design.buttonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={24} color="white" accessible={false}/>
      </Pressable>
    </View>
  </ScrollView>;
}

const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const design = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', backgroundColor: '#fcf8f0', paddingHorizontal: 12, paddingVertical: 12, gap: 20 },
  brand: { alignItems: 'center', gap: 2 },
  wordmark: { fontFamily: serif, fontStyle: 'italic', fontWeight: '700', fontSize: 28, color: '#074f53', textAlign: 'center' },
  artwork: { width: '100%', maxWidth: 360, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: '75%', aspectRatio: 1, maxHeight: '100%', borderRadius: 180, backgroundColor: '#e0f2e8', borderWidth: 1, borderColor: '#f4fcf5' },
  robot: { width: '85%', height: '100%' },
  copy: { alignItems: 'center', gap: 16, width: '100%', maxWidth: 540 },
  heading: { fontFamily: serif, fontSize: 32, fontWeight: '700', color: '#07444a', textAlign: 'center' },
  description: { fontSize: 16, lineHeight: 24, color: '#4c5e5c', textAlign: 'center' },
  footer: { flexGrow: 1, justifyContent: 'flex-end', width: '100%', maxWidth: 520, paddingTop: 12 },
  button: { minHeight: 56, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28, backgroundColor: '#086c70', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  buttonText: { fontSize: 19, fontWeight: '600', color: '#ffffff', flexShrink: 1, textAlign: 'center' },
});
