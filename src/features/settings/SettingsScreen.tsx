import { useEffect, useState } from 'react';
import { Alert, BackHandler, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import manifest from '../../t0/model.json';
import { getReader } from '../../t0/native';
import { modelNativeAvailable } from '../../adapters/model/native';
import avatar from '../../../assets/illustrations/settings-avatar.png';
import { profileAvatars } from '../onboarding/profile-avatars';
import type { Profile, ProfileInput } from '../../domain/profile';
import { ProfileForm } from '../onboarding/ProfileForm';
import { Action, Card, styles } from '../shared/ui';
import { ModelCard } from './ModelCard';
import type { ModelPorts } from '../../services/model-manager';
import type { Foundation } from '../../services/foundation';
import { StorageCard } from './StorageCard';

export function SettingsScreen({ profile, save, diagnostics, models, foundation, onNavigate, logout }: {
  profile: Profile; save(input: ProfileInput): Promise<void>; diagnostics(): void;
  models: Pick<ModelPorts, 'read' | 'save'>;
  foundation: Foundation;
  onNavigate?: () => void;
  logout(): Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [page, setPage] = useState<'overview' | 'profile' | 'model' | 'storage' | 'privacy'>('overview');
  const [status, setStatus] = useState('Checking…');
  useEffect(() => { onNavigate?.(); }, [page, onNavigate]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 'overview') return false;
      setPage('overview'); return true;
    });
    return () => subscription.remove();
  }, [page]);
  useEffect(() => {
    let active = true;
    if (page !== 'overview') return;
    void (async () => {
      const record = await models.read();
      let ready = false;
      if (modelNativeAvailable && record?.status === 'ready' && record.filename && /^[A-Za-z0-9_.-]+$/.test(record.filename) && !record.filename.includes('..') && !await foundation.models.pendingRemoval(record.filename)) {
        const file = new File(await getReader().modelDirectory(), record.filename);
        ready = file.exists && file.size === manifest.bytes;
      }
      if (active) setStatus(ready ? 'Installed on device' : 'Setup needed');
    })().catch(() => { if (active) setStatus('Check model'); });
    return () => { active = false; };
  }, [page, models, foundation.models]);
  if (page === 'overview') return <View style={design.screen}>
    <Text accessibilityRole="header" style={design.title}>Settings</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Edit local profile" style={[design.card, design.profile]} onPress={() => setPage('profile')}>
      <Image testID={`settings-avatar-${profile.avatar ?? 'default'}`} source={profile.avatar ? profileAvatars[profile.avatar] : avatar} style={design.avatar} accessible={false}/>
      <View style={design.grow}><Text style={design.name}>{profile.nickname}</Text><Text style={design.note}>Stored on this device</Text></View><Feather name="chevron-right" size={20} color="#4c5e5c"/>
    </Pressable>
    <View style={design.card}><SettingsRow icon="globe" label="Language" value={{en:'English',hi:'Hindi',bn:'Bengali'}[profile.language]} onPress={() => setPage('profile')}/></View>
    <Text accessibilityRole="header" style={design.heading}>Offline teacher</Text>
    <View style={design.card}>
      <SettingsRow icon="cpu" label={manifest.id} detail={status} onPress={() => setPage('model')}/>
      <View style={design.divider}/><SettingsRow label="Manage model" onPress={() => setPage('model')}/>
    </View>
    <Text accessibilityRole="header" style={design.heading}>Storage</Text>
    <View style={design.card}>
      <SettingsRow icon="database" label="Notes and practice history" onPress={() => setPage('storage')}/>
      <View style={design.divider}/><SettingsRow label="Manage storage" onPress={() => setPage('storage')}/>
    </View>
    <Text accessibilityRole="header" style={design.heading}>Privacy</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Privacy and limitations" style={design.privacy} onPress={() => setPage('privacy')}>
      <Feather name="lock" size={29} color="#12313d"/><View style={design.grow}><Text style={design.body}>Study content stays on this device.</Text><Text style={design.small}>Uninstalling or clearing app data removes local records.</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Delete study data" accessibilityHint="Choose a notebook or source, then confirm exactly what to delete" style={design.danger} onPress={() => setPage('storage')}><Feather name="trash-2" color="#b02b2b" size={20}/><Text style={design.dangerText}>Delete study data</Text></Pressable>
    <Text style={design.confirm}>Choose what to remove. You’ll be asked to confirm.</Text>
    <Action title={leaving ? 'Signing out…' : 'Log out'} secondary disabled={leaving} onPress={() => Alert.alert('Log out of this local workspace?', 'Return to the welcome page. Your notes, history, profile and downloaded teacher stay on this device. This is not account authentication or cloud backup; anyone continuing here can reopen this workspace.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', onPress: () => { setLeaving(true); setLogoutError(''); void logout().catch(() => { setLogoutError('Finish active work and unload the teacher in Manage model, then retry. Your data was kept.'); setLeaving(false); }); } },
    ])}/>
    {!!logoutError && <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text>}
  </View>;
  return <>
    <Action title="← Back to settings" secondary onPress={() => setPage('overview')}/>
    {page === 'model' && <ModelCard repository={models} foundation={foundation} />}
    {page === 'storage' && <StorageCard foundation={foundation} />}
    {page === 'profile' && <Card>
      <Text style={styles.heading}>Local profile</Text>
      <ProfileForm initial={profile} save={async input => { setSaved(false); await save(input); setSaved(true); }} />
      {saved && <Text accessibilityLiveRegion="polite" style={styles.note}>Saved on this device.</Text>}
    </Card>}
    {page === 'privacy' && <Card>
      <Text style={styles.heading}>Private by design</Text>
      <Text style={styles.body}>No account, phone number, email or cloud login is required. Your profile stays in this app's local database. Logout returns to the first splash, then the local profile.</Text>
      <Text style={styles.note}>Uninstalling or clearing app data loses local records. No backup, sync or recovery service is provided. Confirm source/notebook deletion in Storage. App-private storage is not a promise of encryption or forensic erasure.</Text>
      <Text style={styles.note}>Clean printed English only: TXT/paste, PDF, JPEG/PNG and camera. No Bengali/Hindi OCR, arbitrary handwriting, DOCX, equations or diagram understanding. Local answers are source-exact excerpts; quizzes test source recall, not exam readiness. Phone memory/storage may limit generation. Android runtime and full accessibility acceptance remain unverified. No cloud fallback.</Text>
      <Action title="T0 diagnostics · synthetic only" secondary onPress={diagnostics} />
    </Card>}
  </>;
}

function SettingsRow({icon,label,value,detail,onPress}:{icon?:React.ComponentProps<typeof Feather>['name'];label:string;value?:string;detail?:string;onPress():void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={[label,value,detail].filter(Boolean).join(', ')} onPress={onPress} style={design.row}>
    {icon&&<Feather name={icon} size={24} color="#12313d"/>}
    <View style={design.grow}><Text style={[design.body,icon&&{fontWeight:'600'}]}>{label}</Text>{detail&&<Text style={design.status}>{detail}</Text>}</View>
    {value&&<Text style={design.note}>{value}</Text>}<Feather name="chevron-right" size={18} color="#4c5e5c"/>
  </Pressable>;
}

const serif=Platform.OS==='ios'?'Georgia':'serif';
const design=StyleSheet.create({
  screen:{gap:12},
  title:{fontFamily:serif,fontSize:26,fontWeight:'700',color:'#102532',marginBottom:3},
  heading:{fontFamily:serif,fontSize:20,fontWeight:'700',color:'#102532',marginTop:4},
  card:{borderWidth:1,borderColor:'#e5dfd7',borderRadius:15,backgroundColor:'#fffcf7',paddingHorizontal:14},
  profile:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:12},
  avatar:{width:64,height:64,borderRadius:32},
  grow:{flex:1,gap:4},
  name:{fontFamily:serif,fontSize:21,fontWeight:'700',color:'#102532'},
  body:{fontSize:15,lineHeight:21,color:'#12313d'},
  note:{fontSize:14,color:'#4c5e5c',flexShrink:1},
  small:{fontSize:12,lineHeight:17,color:'#4c5e5c'},
  status:{fontSize:13,color:'#50652b'},
  row:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48,paddingVertical:10},
  divider:{height:1,backgroundColor:'#e5dfd7'},
  privacy:{flexDirection:'row',alignItems:'center',gap:15,minHeight:60,paddingHorizontal:12},
  danger:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,minHeight:48,borderWidth:1,borderColor:'#b02b2b',borderRadius:14,padding:10},
  dangerText:{fontSize:15,color:'#b02b2b'},
  confirm:{fontSize:12,color:'#4c5e5c',textAlign:'center'},
});
