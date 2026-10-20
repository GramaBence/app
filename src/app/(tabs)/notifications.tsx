import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../../components/Brand';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, initials, shortDate } from '../../lib/theme';
import type { AppNotification } from '../../lib/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const load = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const { data, error } = await supabase.from('notifications')
      .select('id,recipient_id,actor_id,project_id,comment_id,is_private,created_at,read_at,profiles!notifications_actor_id_fkey(id,full_name,username),projects!notifications_project_id_fkey(title)')
      .eq('recipient_id', session.user.id).order('created_at', { ascending: false }).limit(60);
    if (error) Alert.alert('Az értesítések nem tölthetők be', error.message);
    else setItems((data || []) as unknown as AppNotification[]);
    setLoading(false);
  }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function openNotification(item: AppNotification) {
    if (!supabase || !session) return;
    if (!item.read_at) {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('id', item.id).eq('recipient_id', session.user.id);
      if (error) { Alert.alert('Nem sikerült megnyitni', error.message); return; }
      setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
    }
    router.push({ pathname: '/project/[id]', params: { id: item.project_id } });
  }

  async function markAllRead() {
    if (!supabase || !session) return;
    setMarkingAll(true);
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: readAt })
      .eq('recipient_id', session.user.id).is('read_at', null);
    setMarkingAll(false);
    if (error) Alert.alert('Nem sikerült frissíteni', error.message);
    else setItems(current => current.map(item => ({ ...item, read_at: item.read_at || readAt })));
  }

  const unreadCount = items.filter(item => !item.read_at).length;
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
    <View style={s.header}><Brand /><View style={s.headerMark}><Text style={s.headerMarkText}>♧</Text></View></View>
    <View style={s.headingRow}><View><Text style={s.eyebrow}>MARADJ KÉPBEN</Text><Text style={s.heading}>Értesítések</Text><Text style={s.subtitle}>{unreadCount ? `${unreadCount} olvasatlan értesítésed van` : 'Minden friss válasz egy helyen.'}</Text></View>
      {unreadCount > 0 && <Pressable disabled={markingAll} onPress={() => void markAllRead()} style={s.markAll}><Text style={s.markAllText}>{markingAll ? '…' : 'Mind olvasott'}</Text></Pressable>}
    </View>
    <ScrollView style={s.scroll} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.orange} />}>
      {items.map(item => <Pressable key={item.id} onPress={() => void openNotification(item)} style={[s.card, !item.read_at && s.cardUnread]}>
        <View style={[s.avatar, item.is_private && s.avatarPrivate]}><Text style={s.avatarText}>{item.is_private ? '↩' : initials(item.profiles?.full_name)}</Text></View>
        <View style={s.copy}><View style={s.titleRow}><Text style={s.actor}>{item.profiles?.full_name || 'Egy alkotó'}</Text>{!item.read_at && <View style={s.unreadDot} />}</View>
          <Text style={s.message}>{item.is_private ? 'privát választ küldött a hozzászólásodra.' : 'válaszolt a hozzászólásodra.'}</Text>
          <Text style={s.project} numberOfLines={1}>{item.projects?.title || 'Projekt megnyitása'} · {shortDate(item.created_at)}</Text>
        </View><Text style={s.arrow}>›</Text>
      </Pressable>)}
      {!loading && items.length === 0 && <View style={s.empty}><Text style={s.emptyIcon}>✳</Text><Text style={s.emptyTitle}>Még nincsenek értesítéseid</Text><Text style={s.emptyBody}>Ha valaki válaszol a hozzászólásodra, itt fogod látni.</Text></View>}
      {loading && items.length === 0 && <ActivityIndicator color={colors.orange} style={{ marginTop: 45 }} />}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { height: 61, backgroundColor: colors.paper, paddingHorizontal: 20, maxWidth: 1240, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMark: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.paleOrange, alignItems: 'center', justifyContent: 'center' }, headerMarkText: { color: colors.orange, fontSize: 20 },
  headingRow: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 13, maxWidth: 1240, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1.5 }, heading: { color: colors.navy, fontFamily: 'Poppins_800ExtraBold', fontSize: 25, marginTop: 4 }, subtitle: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 3 },
  markAll: { borderRadius: 11, backgroundColor: colors.paleOrange, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 3 }, markAllText: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 10 },
  scroll: { flex: 1 }, list: { padding: 16, paddingTop: 6, paddingBottom: 28, gap: 9, maxWidth: 850, width: '100%', alignSelf: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.line, padding: 13 }, cardUnread: { borderColor: '#FFC18F', backgroundColor: '#FFFCF8' },
  avatar: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, avatarPrivate: { backgroundColor: colors.paleOrange }, avatarText: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 13 },
  copy: { flex: 1, minWidth: 0 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, actor: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 12 }, unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange }, message: { color: colors.navy, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }, project: { color: colors.muted, fontFamily: 'Poppins_500Medium', fontSize: 9, marginTop: 5 }, arrow: { color: colors.muted, fontSize: 24 },
  empty: { marginTop: 30, alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 25 }, emptyIcon: { color: colors.orange, fontSize: 26 }, emptyTitle: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 14, marginTop: 8, textAlign: 'center' }, emptyBody: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: 'center' },
});
