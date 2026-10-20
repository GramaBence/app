import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../../components/Brand';
import { ImageChooser } from '../../components/ImageChooser';
import { PrivateImage } from '../../components/PrivateImage';
import { useAuth } from '../../lib/auth';
import { removeCommunityImage, uploadCommunityImage } from '../../lib/imageStorage';
import { supabase } from '../../lib/supabase';
import { colors, initials } from '../../lib/theme';
import type { Profile } from '../../lib/types';

export default function ProfileScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter(); const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null); const [name, setName] = useState(''); const [bio, setBio] = useState(''); const [skills, setSkills] = useState(''); const [image, setImage] = useState<ImagePickerAsset | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; if (supabase && session) supabase.from('profiles').select('id,full_name,username,bio,skills,avatar_url').eq('id', session.user.id).single().then(({ data }) => { if (active && data) { const next = data as Profile; setProfile(next); setName(next.full_name || ''); setBio(next.bio || ''); setSkills(next.skills || ''); } }); return () => { active = false; }; }, [session]);
  async function save() {
    if (!supabase || !session) return;
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      if (image) uploadedPath = await uploadCommunityImage('profiles', session.user.id, session.user.id, image);
      const avatarPath = uploadedPath || profile?.avatar_url || null;
      const { error } = await supabase.from('profiles').update({ full_name: name.trim() || 'Alkotó', bio: bio.trim(), skills: skills.trim(), avatar_url: avatarPath }).eq('id', session.user.id);
      if (error) throw error;
      if (uploadedPath && profile?.avatar_url && profile.avatar_url !== uploadedPath) await removeCommunityImage(profile.avatar_url);
      setProfile(current => current ? { ...current, full_name: name.trim() || 'Alkotó', bio: bio.trim(), skills: skills.trim(), avatar_url: avatarPath } : current);
      setImage(null);
      Alert.alert('Mentve', 'Frissítettük a profilodat.');
    } catch (error) {
      if (uploadedPath) await removeCommunityImage(uploadedPath).catch(() => undefined);
      Alert.alert('Nem sikerült menteni', error instanceof Error ? error.message : 'Próbáld meg újra.');
    } finally { setSaving(false); }
  }
  async function signOut() { await supabase?.auth.signOut(); router.replace('/sign-in'); }
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}><View style={[s.header, Platform.OS === 'web' && screenWidth >= 1024 && s.desktopHidden]}><Brand /></View><ScrollView contentContainerStyle={s.content}>
    <Text style={s.eyebrow}>A TE ALKOTÓI OLDALAD</Text><Text style={s.heading}>Mutatkozz be.</Text><Text style={s.sub}>Segíts másoknak megtalálni azt, amiben szívesen alkotnátok együtt.</Text>
    <View style={s.card}>
      <View style={s.hero}><View style={s.avatar}>{profile?.avatar_url && !image ? <PrivateImage path={profile.avatar_url} style={s.avatarImage} /> : null}<Text style={s.avatarText}>{!profile?.avatar_url && !image ? initials(profile?.full_name || name) : ''}</Text></View><Text style={s.name}>{name || 'Alkotó'}</Text><Text style={s.email}>{session?.user.email}</Text></View>
      <ImageChooser label="PROFILKÉP" aspect={[1, 1]} imageUri={image?.uri} imagePath={!image ? profile?.avatar_url : null} onSelect={setImage} />
      <Text style={[s.label, { marginTop: 18 }]}>MEGJELENÍTETT NÉV</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="A neved" placeholderTextColor="#94A3B8" maxLength={70} />
      <Text style={[s.label, { marginTop: 16 }]}>BEMUTATKOZÁS</Text><TextInput value={bio} onChangeText={setBio} style={[s.input, s.bio]} placeholder="Milyen projekteken szeretsz dolgozni?" placeholderTextColor="#94A3B8" multiline maxLength={240} />
      <Text style={[s.label, { marginTop: 16 }]}>MIBEN VAGY JÓ?</Text><TextInput value={skills} onChangeText={setSkills} style={s.input} placeholder="pl. videóvágás, rajz, programozás" placeholderTextColor="#94A3B8" maxLength={240} />
      <Text style={s.hint}>Vesszőkkel válaszd el a készségeidet.</Text>
      <Pressable onPress={() => void save()} style={s.save} disabled={saving}><Text style={s.saveText}>{saving ? 'Mentés…' : 'Profil mentése'}</Text></Pressable>
      <Pressable onPress={() => router.push({ pathname: '/profile/[id]', params: { id: session?.user.id || '' } })} style={s.preview}><Text style={s.previewText}>Profil megtekintése ↗</Text></Pressable>
    </View>
    <Pressable onPress={() => void signOut()} style={s.signOut}><Text style={s.signOutText}>Kijelentkezés</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, desktopHidden: { display: 'none' }, header: { height: 61, backgroundColor: colors.paper, paddingHorizontal: 20, maxWidth: 1240, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 28 }, eyebrow: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1.5, marginTop: 12 }, heading: { color: colors.navy, fontFamily: 'Poppins_800ExtraBold', fontSize: 25, marginTop: 5 }, sub: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 15 }, card: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 20 }, hero: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.navy, marginBottom: 3 }, avatar: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { ...StyleSheet.absoluteFill }, avatarText: { color: colors.white, fontFamily: 'Poppins_800ExtraBold', fontSize: 21 }, name: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 18, marginTop: 8 }, email: { color: '#D7E2EE', fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }, label: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.5, marginBottom: 6 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, color: colors.navy, fontFamily: 'Poppins_400Regular', fontSize: 12, backgroundColor: '#FAF7F1' }, bio: { minHeight: 86, textAlignVertical: 'top' }, hint: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 5 }, save: { backgroundColor: colors.orange, borderRadius: 12, alignItems: 'center', padding: 13, marginTop: 17 }, saveText: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 12 }, preview: { alignItems: 'center', padding: 13, marginTop: 5 }, previewText: { color: colors.navy, fontFamily: 'Poppins_600SemiBold', fontSize: 11 }, signOut: { alignItems: 'center', padding: 17 }, signOutText: { color: colors.danger, fontFamily: 'Poppins_700Bold', fontSize: 12 } });
