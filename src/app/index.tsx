import { Redirect } from 'expo-router';
import { isConfigured } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../lib/theme';

export default function IndexRoute() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.orange} /></View>;
  if (!isConfigured) return <Redirect href="/setup" />;
  return <Redirect href={session ? '/(tabs)' : '/sign-in'} />;
}
