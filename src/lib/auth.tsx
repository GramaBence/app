import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthState = { session: Session | null; loading: boolean };
const Context = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false); } });
    const { data } = client.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const code = Linking.parse(url).queryParams?.code;
      if (typeof code === 'string') await client.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(handleUrl);
    const linkSubscription = Linking.addEventListener('url', event => { void handleUrl(event.url); });
    return () => { active = false; data.subscription.unsubscribe(); linkSubscription.remove(); };
  }, []);
  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAuth = () => useContext(Context);
