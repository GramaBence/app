import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { colors } from '../lib/theme';

function RouteGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    if (!isConfigured && first !== 'setup') router.replace('/setup' as Href);
    else if (isConfigured && !session && first !== 'sign-in') router.replace('/sign-in' as Href);
    else if (isConfigured && session && (first === 'sign-in' || first === 'setup' || !first)) router.replace('/(tabs)' as Href);
  }, [segments, session, loading, router]);
  return null;
}

function AppShell() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.orange} /></View>;
  return <SafeAreaProvider><AuthProvider><RouteGate /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
    <Stack.Screen name="index" /><Stack.Screen name="setup" /><Stack.Screen name="sign-in" />
    <Stack.Screen name="(tabs)" /><Stack.Screen name="create-project" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="create-group" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} /><Stack.Screen name="group/[id]" options={{ animation: 'slide_from_right' }} />
  </Stack></AuthProvider></SafeAreaProvider>;
}

export default function RootLayout() { return <AppShell />; }
