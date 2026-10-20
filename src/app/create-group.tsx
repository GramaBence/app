import { useState } from 'react';
import type { ImagePickerAsset } from 'expo-image-picker';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccessModeSelector, type GroupAccessMode } from '../components/AccessModeSelector';
import { FormField } from '../components/FormField';
import { ImageChooser } from '../components/ImageChooser';
import { TopicSelector } from '../components/TopicSelector';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { removeCommunityImage, uploadCommunityImage } from '../lib/imageStorage';
import { colors } from '../lib/theme';

const accessModes = [
  { id: 'public', title: 'Nyilvános', description: 'Bárki megtalálhatja és csatlakozhat.' },
  { id: 'invite_code', title: 'Meghívókódos', description: 'A csoportot csak a kóddal lehet megnyitni.' },
  { id: 'password', title: 'Jelszóval védett', description: 'A belépéshez jelszó szükséges.' },
] satisfies { id: GroupAccessMode; title: string; description: string }[];

export default function CreateGroupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('Design');
  const [accessMode, setAccessMode] = useState<GroupAccessMode>('public');
  const [accessCode, setAccessCode] = useState('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function submit() {
    setFeedback('');
    if (!supabase) { setFeedback('Nincs Supabase-kapcsolat. Ellenőrizd az app .env beállítását.'); return; }
    if (!session) { setFeedback('A csoport létrehozásához előbb jelentkezz be.'); return; }
    if (name.trim().length < 3 || description.trim().length < 10) {
      setFeedback('A csoport neve legalább 3, a leírás legalább 10 karakter legyen.');
      return;
    }
    if (accessMode !== 'public' && accessCode.trim().length < 6) {
      setFeedback('A meghívókód vagy jelszó legalább 6 karakter legyen.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_group_with_access', {
        p_name: name.trim(),
        p_description: description.trim(),
        p_topic: topic,
        p_access_mode: accessMode,
        p_code: accessMode === 'public' ? null : accessCode.trim(),
      });

      if (error || !data) {
        const message = error?.message || 'A Supabase nem adott vissza új csoportot.';
        setFeedback(message.includes('create_group_with_access') && message.includes('schema cache')
          ? 'Az adatbázis még nem lett frissítve az új funkciókhoz. Futtasd le egyszer a supabase/privacy-migration.sql fájlt a Supabase SQL Editorban.'
          : message);
        return;
      }
      let imagePath: string | null = null;
      try {
        if (image) {
          imagePath = await uploadCommunityImage('groups', session.user.id, data, image);
          const { error: imageError } = await supabase.from('groups').update({ image_path: imagePath }).eq('id', data).eq('owner_id', session.user.id);
          if (imageError) throw imageError;
        }
      } catch (imageError) {
        if (imagePath) await removeCommunityImage(imagePath).catch(() => undefined);
        await supabase.from('groups').delete().eq('id', data).eq('owner_id', session.user.id);
        setFeedback(`A csoport képe nem menthető: ${imageError instanceof Error ? imageError.message : 'próbáld újra.'}`);
        return;
      }
      router.replace({ pathname: '/group/[id]', params: { id: data } });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nem sikerült kapcsolódni a Supabase-hez.');
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/groups');
  }

  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}><Pressable onPress={goBack}><Text style={s.cancel}>Mégse</Text></Pressable><Text style={s.headerTitle}>Új csoport</Text><View style={{ width: 42 }} /></View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>TALÁLJ TÁRSAKAT</Text>
        <Text style={s.title}>Hozzatok létre egy közösséget.</Text>
        <Text style={s.sub}>Adj nevet a csoportnak, és mondd el, kiket vársz.</Text>
        <ImageChooser label="CSOPORTKÉP" imageUri={image?.uri} onSelect={setImage} />
        <FormField label="A CSOPORT NEVE" value={name} onChangeText={setName} placeholder="pl. Kreatív sarok" maxLength={70} />
        <FormField label="MIRŐL SZÓL?" value={description} onChangeText={setDescription} placeholder="Mi az, ami összeköt benneteket?" multiline maxLength={600} />
        <TopicSelector selected={topic} onSelect={setTopic} />
        <AccessModeSelector label="KI LÉPHET BE?" selected={accessMode} onSelect={setAccessMode} modes={accessModes} />
        {accessMode !== 'public' && <FormField label={accessMode === 'password' ? 'CSOPORTJELSZÓ' : 'MEGHÍVÓKÓD'} value={accessCode} onChangeText={setAccessCode} placeholder="Legalább 6 karakter" secureTextEntry maxLength={64} autoCapitalize="none" autoCorrect={false} />}
        {feedback ? <Text accessibilityRole="alert" style={s.feedback}>{feedback}</Text> : null}
        <Pressable onPress={() => void submit()} disabled={busy} style={[s.submit, busy && { opacity: 0.6 }]}><Text style={s.submitText}>{busy ? 'Létrehozás…' : 'Csoport létrehozása ↗'}</Text></Pressable>
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
  title: { color: colors.navy, fontFamily: 'Poppins_800ExtraBold', fontSize: 24, lineHeight: 32, marginTop: 5 },
  sub: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, marginTop: 5 },
  submit: { backgroundColor: colors.orange, borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 22 },
  submitText: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  feedback: { color: colors.danger, backgroundColor: '#FDECEC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 15, fontSize: 11, lineHeight: 17, fontFamily: 'Poppins_500Medium' },
});
