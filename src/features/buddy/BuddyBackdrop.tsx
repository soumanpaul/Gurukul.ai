import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BuddyBackdrop() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" accessible={false} style={[design.background, { top: -insets.top - 16 }]}>
    <View style={design.mint} /><View style={design.cream} />
  </View>;
}

const design = StyleSheet.create({
  background: { position: 'absolute', bottom: 0, left: -16, right: -16, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: '#edf3e9' },
  mint: { position: 'absolute', width: 360, height: 480, borderRadius: 180, backgroundColor: '#cde7df', top: '12%', right: -160 },
  cream: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#f8eedb', left: -210, bottom: -100 },
});
