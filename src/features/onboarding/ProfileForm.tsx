import { useRef, useState } from 'react';
import { Alert, Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { languages, validateProfile } from '../../domain/profile';
import type { Language, ProfileInput, ProfileAvatar } from '../../domain/profile';
import { profileAvatars } from './profile-avatars';
import { Action, styles } from '../shared/ui';

const languageLabels: Record<Language, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

export function ProfileForm({ initial, save, welcome = false }: {
  initial?: ProfileInput; save(input: ProfileInput): Promise<void>; welcome?: boolean;
}) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [language, setLanguage] = useState<Language>(initial?.language ?? 'en');
  const [avatar, setAvatar] = useState<ProfileAvatar | undefined>(initial?.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(useDefault = false) {
    if (lock.current) return;
    let input: ProfileInput;
    try {
      input = validateProfile({ nickname: useDefault || (welcome && !nickname.trim()) ? 'Student' : nickname, language, avatar });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Check your nickname and language.');
      return;
    }
    lock.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      await save(input);
    } catch {
      setError('Could not confirm the save on this device. Check storage and try again. No data was reset.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <View style={{ gap: welcome ? 10 : 14 }}>
    <Text style={[styles.body, { textAlign: 'center', fontWeight: '600' }]}>Choose your avatar</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 26 }}>
      {(['boy', 'girl'] as const).map(option => <Pressable key={option} testID={`profile-avatar-${option}${avatar === option ? '-selected' : ''}`} accessibilityRole="radio" accessibilityLabel={`${option === 'boy' ? 'Boy' : 'Girl'} avatar`} accessibilityState={{ checked: avatar === option, disabled: busy }} disabled={busy} onPress={() => setAvatar(option)} style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ padding: 3, borderRadius: 44, borderWidth: 2, borderColor: avatar === option ? '#086c70' : '#d4d2cc', backgroundColor: '#fffcf8' }}>
          <Image source={profileAvatars[option]} accessible={false} style={{ width: 68, height: 68, borderRadius: 34 }}/>
          {avatar === option && <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: '#086c70', borderRadius: 12, padding: 2 }}><Ionicons name="checkmark" size={18} color="white" accessible={false}/></View>}
        </View>
        <Text style={{ fontSize: 13, color: '#234c47', fontWeight: avatar === option ? '700' : '400' }}>{option === 'boy' ? 'Boy' : 'Girl'}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.body}>{welcome ? 'What should we call you?' : 'Nickname'}</Text>
    <TextInput accessibilityLabel="Nickname" value={nickname} onChangeText={setNickname} editable={!busy}
      placeholder={welcome ? 'Your name (optional)' : 'What should we call you?'} placeholderTextColor="#657773" style={[styles.input, welcome && { borderColor: '#d4d2cc', backgroundColor: '#fffcf8' }]}
      autoCorrect={false} autoComplete="off" returnKeyType="done" maxLength={120} />
    <Text style={[styles.body, welcome && { marginTop: 6 }]}>Preferred language</Text>
    {welcome ? <Pressable accessibilityRole="button" accessibilityLabel={`Preferred language: ${languageLabels[language]}`} accessibilityState={{ disabled: busy }} disabled={busy}
      style={[styles.input, { borderColor: '#d4d2cc', backgroundColor: '#fffcf8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      onPress={() => { Keyboard.dismiss(); Alert.alert('Preferred language', 'Preference only; tested study support is English.', [...languages.map(option => ({text:languageLabels[option],onPress:()=>setLanguage(option)})),{text:'Cancel',style:'cancel'}]); }}>
      <Text style={styles.body}>{languageLabels[language]}</Text><Ionicons name="chevron-down" size={21} color="#243b39" accessible={false}/>
    </Pressable> : languages.map(option => <Action key={option} title={`${language === option ? '✓ ' : ''}${languageLabels[option]}`}
      secondary={language !== option} disabled={busy} onPress={() => setLanguage(option)} />)}
    <Text style={welcome ? { fontSize: 13, lineHeight: 19, color: '#4c5e5c', marginHorizontal: 4 } : styles.note}>{welcome ? 'Printed English notes supported first.' : 'This saves your preference only. The current interface and tested OCR are English; Hindi/Bengali study support is not yet implemented.'}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {welcome ? <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'Saving locally…' : 'Continue offline'} accessibilityState={{ disabled: busy }} disabled={busy}
      style={[styles.action, { minHeight: 56, marginTop: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }, busy && styles.disabled]} onPress={() => void submit()}>
      <Text style={styles.actionText}>{busy ? 'Saving locally…' : 'Continue'}</Text><Ionicons accessible={false} name="arrow-forward" color="white" size={21}/>
    </Pressable> : <Action title={busy ? 'Saving locally…' : 'Save profile'} disabled={busy} onPress={() => void submit()} />}
  </View>;
}
