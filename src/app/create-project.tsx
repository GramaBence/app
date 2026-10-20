import { useEffect, useState } from 'react';
import type { ImagePickerAsset } from 'expo-image-picker';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccessModeSelector, type ProjectAccessMode } from '../components/AccessModeSelector';
import { FormField } from '../components/FormField';
import { ImageChooser } from '../components/ImageChooser';
import { TopicSelector } from '../components/TopicSelector';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { removeCommunityImage, uploadCommunityImage } from '../lib/imageStorage';
import { colors } from '../lib/theme';

const accessModes = [
  { id: 'public', title: 'Nyilvános', description: 'Bárki elolvashatja és hozzászólhat.' },
  { id: 'invite_code', title: 'Meghívókódos csatlakozás', description: 'A projekt és a hozzászólások láthatók; a csapathoz kód kell.' },
] satisfies { id: ProjectAccessMode; title: string; description: string }[];

type GroupOption = { id: string; name: string; access_mode?: string };

export default function CreateProjectScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ group_id?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Design');
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupId, setGroupId] = useState<string | null>(params.group_id || null);
  const [accessMode, setAccessMode] = useState<ProjectAccessMode>('public');
  const [accessCode, setAccessCode] = useState('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (supabase && session) {
      supabase.from('group_members').select('groups!group_members_group_id_fkey(id,name,access_mode)').eq('profile_id', session.user.id).then(({ data }) => {
        if (active) setGroups((data || []).flatMap(row => row.groups || []) as GroupOption[]);
      });
    }
    return () => { active = false; };
  }, [session]);

  async function submit() {
    setFeedback(null);
    if (!supabase) { setFeedback({ type: 'error', text: 'A Supabase-kapcsolat nincs beállítva. Ellenőrizd az app .env fájlját.' }); return; }
    if (!session) { setFeedback({ type: 'error', text: 'A közzétételhez előbb jelentkezz be.' }); return; }
    if (title.trim().length < 3 || description.trim().length < 10) { setFeedback({ type: 'error', text: 'A projekt neve legalább 3, a leírás legalább 10 karakter legyen.' }); return; }
    if (!groupId) { setFeedback({ type: 'error', text: 'A projekt megosztásához válassz egy csoportot.' }); return; }
    if (accessMode === 'invite_code' && accessCode.trim().length < 6) { setFeedback({ type: 'error', text: 'A meghívókód legalább 6 karakter legyen.' }); return; }

    setBusy(true);
    try {
      const { data, error } = await supabase.from('projects').insert({ owner_id: session.user.id, title: title.trim(), description: description.trim(), category, status: 'Nyitott', group_id: groupId, access_mode: accessMode }).select('id').single();
      if (error) { setFeedback({ type: 'error', text: error.message }); return; }
      if (!data) { setFeedback({ type: 'error', text: 'A Supabase nem adott vissza létrehozott projektet.' }); return; }

      const [membership, access] = await Promise.all([
        supabase.from('project_members').insert({ project_id: data.id, profile_id: session.user.id }),
        supabase.rpc('set_project_access_code', { p_project_id: data.id, p_code: accessMode === 'public' ? null : accessCode.trim() }),
      ]);
      if (membership.error || access.error) {
        await supabase.from('projects').delete().eq('id', data.id).eq('owner_id', session.user.id);
        setFeedback({ type: 'error', text: membership.error?.message || access.error?.message || 'Nem sikerült beállítani a projekt hozzáférését.' });
        return;
      }
      if (image) {
        let imagePath: string | null = null;
        try {
          imagePath = await uploadCommunityImage('projects', session.user.id, data.id, image);
          const { error: imageError } = await supabase.from('projects').update({ image_path: imagePath }).eq('id', data.id).eq('owner_id', session.user.id);
          if (imageError) throw imageError;
        } catch (imageError) {
          if (imagePath) await removeCommunityImage(imagePath).catch(() => undefined);
          await supabase.from('projects').delete().eq('id', data.id).eq('owner_id', session.user.id);
          setFeedback({ type: 'error', text: `A projekt képe nem menthető: ${imageError instanceof Error ? imageError.message : 'próbáld újra.'}` });
          return;
        }
      }
      setFeedback({ type: 'success', text: 'A projekt elmentődött, és megjelent a közösségben.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Nem sikerült kapcsolódni a Supabase-hez.' });
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (params.group_id) router.replace({ pathname: '/group/[id]', params: { id: params.group_id } });
    else router.replace('/(tabs)');
  }

  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}><Pressable onPress={goBack}><Text style={s.cancel}>Mégse</Text></Pressable><Text style={s.headerTitle}>Új projekt</Text><View style={{ width: 42 }} /></View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>KEZDJÜK EL</Text>
        <Text style={s.title}>Milyen ötletet hozol?</Text>
        <Text style={s.sub}>Írd le, min dolgoznál, és milyen társakat keresel.</Text>
        <ImageChooser label="PROJEKTKÉP" imageUri={image?.uri} onSelect={setImage} />
        <FormField label="A PROJEKT NEVE" value={title} onChangeText={setTitle} placeholder="pl. Iskolai podcast" maxLength={90} />
        <FormField label="MIRŐL SZÓL?" value={description} onChangeText={setDescription} placeholder="Mit szeretnél létrehozni? Miben segíthetnek a többiek?" multiline maxLength={1200} />
        <TopicSelector selected={category} onSelect={setCategory} />
        <Text style={s.placeLabel}>VÁLASSZ CSOPORTOT (KÖTELEZŐ)</Text>
        {groups.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placeRow}>
          {groups.map(group => <Pressable key={group.id} style={[s.placeChip, groupId === group.id && s.placeActive]} onPress={() => setGroupId(group.id)}><Text style={[s.placeText, groupId === group.id && s.placeTextActive]}>{group.name}</Text></Pressable>)}
        </ScrollView> : <View style={s.noGroups}><Text style={s.noGroupsText}>Még nem vagy csoport tagja.</Text><Pressable onPress={() => router.push('/create-group')}><Text style={s.createGroupLink}>Hozz létre vagy keress csoportot ↗</Text></Pressable></View>}
        <AccessModeSelector label="KI CSATLAKOZHAT A PROJEKTHEZ?" selected={accessMode} onSelect={setAccessMode} modes={accessModes} />
        {accessMode === 'invite_code' && <FormField label="MEGHÍVÓKÓD" value={accessCode} onChangeText={setAccessCode} placeholder="Legalább 6 karakter" secureTextEntry maxLength={64} autoCapitalize="none" autoCorrect={false} />}
        {feedback && <Text accessibilityRole="alert" style={[s.feedback, feedback.type === 'error' ? s.feedbackError : s.feedbackSuccess]}>{feedback.text}</Text>}
        <Pressable onPress={() => feedback?.type === 'success' ? goBack() : void submit()} disabled={busy} style={[s.submit, busy && { opacity: 0.6 }]}><Text style={s.submitText}>{busy ? 'Közzététel…' : feedback?.type === 'success' ? params.group_id ? 'Vissza a csoporthoz ←' : 'Vissza a hírfolyamhoz ←' : 'Projekt közzététele ↗'}</Text></Pressable>
        <Text style={s.hint}>{accessMode === 'invite_code' ? 'Kód nélkül is olvasható a projekt és a hozzászólás; a kód a csatlakozáshoz kell.' : 'A kiválasztott csoport tagjai és a közösség is láthatja a projektet.'}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, flex: { flex: 1 },
  header: { height: 51, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 19 },
  cancel: { color: colors.muted, fontFamily: 'Poppins_500Medium', fontSize: 12 }, headerTitle: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 15 },
  content: { padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center', paddingBottom: 38 },
  eyebrow: { color: colors.muted, fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.3, marginTop: 12 },
  title: { color: colors.navy, fontFamily: 'Poppins_800ExtraBold', fontSize: 24, marginTop: 5 },
  sub: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, marginTop: 5 },
  placeLabel: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 17, marginBottom: 8 },
  placeRow: { gap: 7 }, placeChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, borderColor: colors.line, borderWidth: 1, backgroundColor: colors.white }, placeActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  placeText: { color: colors.muted, fontFamily: 'Poppins_500Medium', fontSize: 11 }, placeTextActive: { color: colors.white },
  noGroups: { backgroundColor: colors.white, borderRadius: 11, borderWidth: 1, borderColor: colors.line, padding: 14 }, noGroupsText: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 11 }, createGroupLink: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 7 },
  feedback: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 15, fontSize: 11, lineHeight: 17, fontFamily: 'Poppins_500Medium' }, feedbackError: { color: colors.danger, backgroundColor: '#FDECEC' }, feedbackSuccess: { color: '#246B45', backgroundColor: '#E8F5EF' },
  submit: { backgroundColor: colors.orange, borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 22 }, submitText: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  hint: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 15, marginTop: 10, textAlign: 'center' },
});
