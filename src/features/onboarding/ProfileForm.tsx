import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { languages, validateProfile } from '../../domain/profile';
import type { Language, ProfileInput } from '../../domain/profile';
import { Action, styles } from '../shared/ui';

const languageLabels: Record<Language, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

export function ProfileForm({ initial, save, welcome = false }: {
  initial?: ProfileInput; save(input: ProfileInput): Promise<void>; welcome?: boolean;
}) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [language, setLanguage] = useState<Language>(initial?.language ?? 'en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(useDefault = false) {
    if (lock.current) return;
    let input: ProfileInput;
    try {
      input = validateProfile({ nickname: useDefault ? 'Student' : nickname, language });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Check your nickname and language.');
      return;
    }
    lock.current = true;
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
  return <View style={{ gap: 14 }}>
    <Text style={styles.body}>Nickname</Text>
    <TextInput accessibilityLabel="Nickname" value={nickname} onChangeText={setNickname} editable={!busy}
      placeholder="What should we call you?" placeholderTextColor="#657773" style={styles.input}
      autoCorrect={false} autoComplete="off" returnKeyType="done" maxLength={120} />
    <Text style={styles.body}>Preferred language</Text>
    {languages.map(option => <Action key={option} title={`${language === option ? '✓ ' : ''}${languageLabels[option]}`}
      secondary={language !== option} disabled={busy} onPress={() => setLanguage(option)} />)}
    <Text style={styles.note}>This saves your preference only. The current interface and tested OCR are English; Hindi/Bengali study support is not yet implemented.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Action title={busy ? 'Saving locally…' : welcome ? 'Continue offline' : 'Save profile'} disabled={busy} onPress={() => void submit()} />
    {welcome && <Action title="Skip nickname · use Student" secondary disabled={busy} onPress={() => void submit(true)} />}
  </View>;
}
