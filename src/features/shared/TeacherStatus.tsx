import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Text, View } from 'react-native';
import mascot from '../../../assets/illustrations/book-mascot.png';
import { styles } from './ui';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
export function TeacherStatus({ state, message }: { state: 'idle' | 'working' | 'error'; message: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#f7eddc', borderRadius: 16 }}>
    <Image source={mascot} style={{ width: 64, height: 76 }} accessible={false} />
    <Text accessibilityLiveRegion="polite" style={[styles.body, { flex: 1 }]}>{state === 'working' ? 'Working locally' : state === 'error' ? 'Needs attention' : 'Your local teacher'} · {message}</Text>
  </View>;
}
