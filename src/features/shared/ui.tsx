import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Action({ title, onPress, disabled = false, secondary = false }: {
  title: string; onPress(): void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.disabled]}>
    <Text style={[styles.actionText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export const styles = StyleSheet.create({
  page: { padding: 20, gap: 18, width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#183c39' },
  heading: { fontSize: 21, fontWeight: '600', color: '#183c39' },
  body: { fontSize: 17, lineHeight: 25, color: '#243b39' },
  note: { fontSize: 15, lineHeight: 22, color: '#4c5e5c' },
  card: { padding: 18, gap: 12, borderRadius: 16, backgroundColor: '#fffcf7', borderWidth: 1, borderColor: '#e5dfd7' },
  input: { minHeight: 50, padding: 12, borderWidth: 1, borderColor: '#778c87', borderRadius: 10, fontSize: 18, color: '#243b39', backgroundColor: '#ffffff' },
  action: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: '#086c70' },
  actionText: { fontSize: 17, fontWeight: '600', color: '#ffffff', textAlign: 'center' },
  secondary: { backgroundColor: '#fcf8f0', borderWidth: 1, borderColor: '#d0d2c9' },
  secondaryText: { color: '#184b43' },
  disabled: { opacity: 0.5 },
  error: { color: '#9b2929', fontSize: 16 },
});
