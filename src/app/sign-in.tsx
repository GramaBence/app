import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Brand } from '../components/Brand';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

function Input({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} placeholderTextColor="#8290A1" /></View>;
}

export default function SignInScreen() {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 960;
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function submit() {
    setFeedback(null);
    if (!supabase) {
      setFeedback({ type: 'error', text: 'A Supabase-kapcsolat nincs beállítva. Ellenőrizd az app .env fájlját.' });
      return;
    }
    if (!email.trim() || password.length < 8 || (mode === 'register' && name.trim().length < 2)) {
      setFeedback({ type: 'error', text: 'Töltsd ki az összes mezőt. A jelszó legalább 8 karakter legyen.' });
      return;
    }
    setBusy(true);
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: Linking.createURL('/sign-in') } });
      if (result.error) setFeedback({ type: 'error', text: result.error.message });
      else if (mode === 'register' && !result.data.session) setFeedback({ type: 'success', text: 'A fiók létrejött. Nézd meg a beérkező leveleket és a spam mappát is a megerősítő e-mailért.' });
      else router.replace('/(tabs)');
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Nem sikerült kapcsolódni. Próbáld újra.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={[s.page, wide && s.pageWide]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {wide && <View style={s.promo}>
          <Brand light />
          <View style={s.promoCopy}>
            <Text style={s.promoEyebrow}>TANULJ. TERVEZZ. ALKOSS.</Text>
            <Text style={s.promoTitle}>A következő nagy ötletet együtt hozzuk létre.</Text>
            <Text style={s.promoBody}>Találd meg az alkotótársaidat, oszd meg a projektedet, és induljatok el közösen.</Text>
          </View>
          <View style={s.promoFooter}><View style={s.promoDot} /><Text style={s.promoFooterText}>Közösség, ahol az ötletből projekt lesz.</Text></View>
          <View pointerEvents="none" style={s.decorRing} /><View pointerEvents="none" style={s.decorDisc} />
        </View>}

        <ScrollView contentContainerStyle={[s.content, wide && s.contentWide]} keyboardShouldPersistTaps="handled">
          {!wide && <Brand />}
          <View style={s.card}>
            <View style={s.cardMark}><Text style={s.cardMarkText}>01</Text></View>
            <Text style={s.eyebrow}>{mode === 'login' ? 'ÜDV ÚJRA ITT' : 'CSATLAKOZZ A KÖZÖSSÉGHEZ'}</Text>
            <Text style={s.title}>{mode === 'login' ? 'Jó újra látni.' : 'Kezdjük együtt.'}</Text>
            <Text style={s.subtitle}>Lépj be a SkillSync-fiókodba, és folytasd az alkotást.</Text>
            {mode === 'register' && <Input label="TELJES NÉV" value={name} onChangeText={setName} placeholder="Hogy szólíthatunk?" autoCapitalize="words" />}
            <Input label="E-MAIL-CÍM" value={email} onChangeText={setEmail} placeholder="te@email.hu" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Input label="JELSZÓ" value={password} onChangeText={setPassword} placeholder="Legalább 8 karakter" secureTextEntry />
            {feedback && <Text accessibilityRole="alert" style={[s.feedback, feedback.type === 'error' ? s.feedbackError : s.feedbackSuccess]}>{feedback.text}</Text>}
            {busy ? <ActivityIndicator style={{ marginTop: 22 }} color={colors.orange} /> : <Pressable style={s.primary} onPress={() => void submit()}><Text style={s.primaryText}>{mode === 'login' ? 'Belépés' : 'Fiók létrehozása'} <Text style={s.arrow}>→</Text></Text></Pressable>}
            <Pressable onPress={() => { setFeedback(null); setMode(mode === 'login' ? 'register' : 'login'); }}><Text style={s.switch}>{mode === 'login' ? 'Még nincs fiókod? ' : 'Már van fiókod? '}<Text style={s.switchStrong}>{mode === 'login' ? 'Regisztrálj' : 'Lépj be'}</Text></Text></Pressable>
          </View>
          <Text style={s.footer}>SkillSync · Tanuljunk és alkossunk együtt</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white }, page: { flex: 1 }, pageWide: { flexDirection: 'row' },
  promo: { flex: 0.88, backgroundColor: colors.navy, paddingHorizontal: 48, paddingTop: 42, paddingBottom: 34, justifyContent: 'space-between', overflow: 'hidden' },
  promoCopy: { maxWidth: 470, marginTop: 'auto', marginBottom: 'auto', zIndex: 1 }, promoEyebrow: { color: '#FFAE79', fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 2 },
  promoTitle: { color: colors.white, fontFamily: 'Poppins_800ExtraBold', fontSize: 38, lineHeight: 48, marginTop: 17, letterSpacing: -1.2 },
  promoBody: { color: '#D6E0EC', fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 25, marginTop: 15, maxWidth: 410 },
  promoFooter: { flexDirection: 'row', alignItems: 'center', gap: 9, zIndex: 1 }, promoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange }, promoFooterText: { color: '#D6E0EC', fontFamily: 'Poppins_500Medium', fontSize: 11 },
  decorRing: { position: 'absolute', width: 370, height: 370, borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 185, right: -130, top: '20%' }, decorDisc: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#FF6B001A', right: -50, top: '30%' },
  content: { flexGrow: 1, justifyContent: 'center', gap: 24, paddingHorizontal: 22, paddingVertical: 24, width: '100%', maxWidth: 560, alignSelf: 'center' }, contentWide: { flex: 1, maxWidth: 640, paddingHorizontal: 52 },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 28 },
  cardMark: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.paleOrange, alignItems: 'center', justifyContent: 'center', marginBottom: 19 }, cardMarkText: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 11 },
  eyebrow: { color: colors.orange, fontSize: 10, letterSpacing: 1.35, fontFamily: 'Poppins_700Bold' }, title: { color: colors.ink, fontSize: 30, lineHeight: 39, fontFamily: 'Poppins_800ExtraBold', marginTop: 7, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 8 }, field: { marginTop: 18 }, label: { color: colors.ink, fontSize: 10, fontFamily: 'Poppins_700Bold', marginBottom: 7, letterSpacing: 0.45 },
  input: { minHeight: 48, borderColor: colors.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#F8FAFC', color: colors.ink, fontSize: 13, fontFamily: 'Poppins_400Regular' },
  feedback: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14, fontSize: 11, lineHeight: 17, fontFamily: 'Poppins_500Medium' }, feedbackError: { color: colors.danger, backgroundColor: '#FDECEC' }, feedbackSuccess: { color: '#246B45', backgroundColor: '#E8F5EF' },
  primary: { backgroundColor: colors.orange, alignItems: 'center', padding: 15, borderRadius: 10, marginTop: 24 }, primaryText: { color: colors.white, fontSize: 13, fontFamily: 'Poppins_700Bold' }, arrow: { color: '#FFE3D1' },
  switch: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 19 }, switchStrong: { color: colors.orange, fontFamily: 'Poppins_700Bold' }, footer: { color: colors.muted, fontSize: 10, textAlign: 'center' },
});
