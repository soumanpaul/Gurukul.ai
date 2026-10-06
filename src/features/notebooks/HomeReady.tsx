import { useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { Notebook } from '../../adapters/sqlite/repository';
import { notebookScrollTarget } from '../../domain/experience';
import { useReducedMotion } from '../shared/TeacherStatus';
import openBook from '../../../assets/illustrations/open-book.png';

export function HomeReady({ height, nickname, notebooks, counts, readiness, offlineReady, busy, onOpen, onCreate, onViewAll, onAdd }: {
  height: number; nickname: string; notebooks: Notebook[]; counts: Record<string, number>; readiness: string; offlineReady: boolean; busy: boolean;
  onOpen(notebook: Notebook): void; onCreate(): void; onViewAll(): void; onAdd(kind: 'file' | 'camera' | 'paste' | 'options'): void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const largeText = fontScale > 1.3;
  const available = Math.max(426, height - 32);
  const scale = Math.min(1.15, Math.max(0.86, available / 620));
  const rail = useRef<ScrollView>(null);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  const cardWidth = Math.max(130, (viewport - 12) / (width >= 700 ? 3 : 2));
  const move = (direction: -1 | 1) => rail.current?.scrollTo({ x: notebookScrollTarget(offset, direction, viewport, content), animated: !reducedMotion });
  return <View style={[home.screen, { minHeight: available, gap: largeText ? 18 : 8 }]}>
    <View style={{ gap: 7 }}>
      <View style={home.row}>
        <Text numberOfLines={1} style={[home.greeting, { flex: 1 }]}>Hi, {nickname}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={offlineReady ? 'Ready Offline. About local availability' : 'About teacher setup'} accessibilityHint="Shows what local readiness means" hitSlop={8} style={home.badge} onPress={() => Alert.alert('Local availability', readiness)}><Ionicons name="leaf-outline" size={15} color="#246b48" /><Text style={home.badgeText}>{busy ? 'Working locally' : offlineReady ? 'Ready Offline' : 'Check setup'}</Text></Pressable>
      </View>
      <View accessible accessibilityRole="header" accessibilityLabel="Welcome to Gurukul AI" style={home.welcome}>
        <Text style={[home.headline, { fontSize: 20 * scale }]}>Welcome to</Text>
        <View style={home.brandBadge}><Text style={[home.brandName, { fontSize: 23 * scale }]}>Gurukul AI</Text></View>
      </View>
      <Text style={home.subtitle}>Your personal AI classroom.</Text>
    </View>

    <View style={[home.hero, { minHeight: Math.max(124, available * 0.29), padding: 16 * scale }]}>
      <Image source={openBook} style={home.heroArt} accessible={false} resizeMode="contain" />
      <View style={{ width: '68%', gap: 8 }}>
        <Text style={home.eyebrow}>Your notes. Your pace.</Text>
        <Text style={[home.heroTitle, { fontSize: 23 * scale }]}>A little learning,{ '\n' }every day.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add your notes →" disabled={busy}
          style={[home.continue, busy && { opacity: 0.5 }]} onPress={() => onAdd('options')}>
          <Text style={home.continueText}>Add your notes</Text><Feather name="arrow-right" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </View>

    <View style={{ gap: 4 }}>
      <View style={home.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={home.section}>Your notebooks</Text><Pressable accessibilityRole="button" accessibilityLabel="Create notebook" disabled={busy} style={[home.iconButton, { borderRadius: 24, backgroundColor: '#e4efdf' }]} onPress={onCreate}><Feather name="plus" size={21} color="#07696c" /></Pressable></View>
        <View style={home.controls}>
          {([-1, 1] as const).map(direction => {
            const disabled = direction === -1 ? offset <= 1 : content - viewport - offset <= 1;
            return <Pressable key={direction} accessibilityRole="button" accessibilityLabel={`Scroll notebooks ${direction === -1 ? 'left' : 'right'}`} accessibilityState={{ disabled }} disabled={disabled} style={[home.iconButton, disabled && { opacity: 0.35 }]} onPress={() => move(direction)}><Feather name={direction === -1 ? 'chevron-left' : 'chevron-right'} size={20} color="#123d45" /></Pressable>;
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="View all notebooks" style={home.iconButton} onPress={onViewAll}><Text style={home.viewAll}>View all</Text></Pressable>
        </View>
      </View>
      {notebooks.length ? <ScrollView ref={rail} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12 }}
        onLayout={event => { setViewport(event.nativeEvent.layout.width); rail.current?.scrollTo({ x: 0, animated: false }); setOffset(0); }}
        onContentSizeChange={setContent} onScroll={event => setOffset(event.nativeEvent.contentOffset.x)} scrollEventThrottle={32}>
        {notebooks.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title}, ${counts[item.id] ?? 0} sources`} disabled={busy} onPress={() => onOpen(item)}
          style={[home.notebook, { width: cardWidth, minHeight: Math.max(96, available * 0.19), padding: 12 * scale }]}>
          <View style={[home.subjectIcon, { backgroundColor: index % 2 ? '#deedf1' : '#def0e4' }]}><Feather name={index % 2 ? 'book-open' : 'feather'} size={20} color="#07696c" /></View>
          <Text numberOfLines={largeText ? undefined : 2} style={home.notebookTitle}>{item.title}</Text>
          <View style={home.row}><Text style={home.count}>{counts[item.id] ?? 0} sources</Text><Feather name="chevron-right" size={17} color="#123d45" /></View>
        </Pressable>)}
      </ScrollView> : <Pressable accessibilityRole="button" onPress={onCreate} style={[home.notebook, { minHeight: 96 }]}><Text style={home.notebookTitle}>Create your first notebook</Text><Text style={home.count}>Keep your sources together.</Text></Pressable>}
    </View>

    <View style={{ gap: 6 }}>
      <View style={home.row}><Text style={home.section}>Add your notes</Text><Pressable accessibilityRole="button" accessibilityLabel="Open add notes options" style={home.iconButton} onPress={() => onAdd('options')}><Feather name="plus" size={21} color="#07696c" /></Pressable></View>
      <View style={home.inputs}>{(['file', 'camera', 'paste'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={kind === 'file' ? 'Choose a file' : kind === 'camera' ? 'Use camera' : 'Paste text'} disabled={busy} style={[home.input, { minHeight: Math.max(64, available * 0.12) }]} onPress={() => onAdd(kind)}>
        <Feather name={kind === 'file' ? 'file-text' : kind === 'camera' ? 'camera' : 'clipboard'} size={25} color="#123d45" />
        <Text style={home.inputLabel}>{kind[0].toUpperCase() + kind.slice(1)}</Text>
      </Pressable>)}</View>
    </View>
  </View>;
}

const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const home = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  greeting: { fontFamily: serif, fontSize: 17, color: '#102532' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 25, backgroundColor: '#e0f0dc' },
  badgeText: { color: '#225f41', fontSize: 12 },
  headline: { fontFamily: serif, fontWeight: '700', color: '#102532' },
  welcome: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  brandBadge: { maxWidth: '100%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#086c70', borderWidth: 1, borderColor: '#73b8af' },
  brandName: { fontFamily: serif, fontWeight: '700', fontStyle: 'italic', color: '#ffffff', letterSpacing: 0.2 },
  hero: { backgroundColor: '#fff0d6', borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  heroArt: { position: 'absolute', right: 4, bottom: 16, width: '37%', height: '74%' },
  eyebrow: { color: '#80511e', fontSize: 13 },
  subtitle: { fontFamily: serif, fontStyle: 'italic', color: '#356563', fontSize: 14, letterSpacing: 0.25 },
  heroTitle: { fontFamily: serif, fontWeight: '700', color: '#102532' },
  continue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#086c70' },
  continueText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  section: { fontSize: 16, fontWeight: '600', color: '#122430' },
  controls: { flexDirection: 'row' },
  viewAll: { fontSize: 13, fontWeight: '600', color: '#07696c', textDecorationLine: 'underline' },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  notebook: { borderWidth: 1, borderColor: '#e5dfd7', borderRadius: 13, backgroundColor: '#fffcf7', padding: 12, gap: 5 },
  subjectIcon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  notebookTitle: { fontSize: 15, fontWeight: '600', color: '#122430' },
  count: { fontSize: 12, color: '#4c5e5c' },
  inputs: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8, borderWidth: 1, borderColor: '#e5dfd7', borderRadius: 13, backgroundColor: '#fffcf7' },
  inputLabel: { fontSize: 14, color: '#122430' },
});
