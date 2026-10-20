import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Brand } from '../../components/Brand';
import { useAuth } from '../../lib/auth';
import { colors, initials } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveringBrand, setHoveringBrand] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarWidth] = useState(() => new Animated.Value(264));
  const [brandHover] = useState(() => new Animated.Value(0));
  const desktop = Platform.OS === 'web' && width >= 1024;
  useEffect(() => {
    Animated.timing(sidebarWidth, { toValue: collapsed ? 76 : 264, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [collapsed, sidebarWidth]);
  useEffect(() => {
    let active = true;
    async function refreshUnread() {
      if (!supabase || !session) { setUnreadCount(0); return; }
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', session.user.id).is('read_at', null);
      if (active && !error) setUnreadCount(count || 0);
    }
    void refreshUnread();
    const timer = setInterval(() => void refreshUnread(), 20000);
    return () => { active = false; clearInterval(timer); };
  }, [pathname, session]);
  useEffect(() => {
    Animated.timing(brandHover, { toValue: hoveringBrand ? 1 : 0, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [brandHover, hoveringBrand]);
  const nav = [
    { label: 'Felfedezés', hint: 'Projektek a közösségtől', path: '/(tabs)', icon: '◈' },
    { label: 'Csoportok', hint: 'Alkossatok együtt', path: '/(tabs)/groups', icon: '◉' },
    { label: 'Értesítések', hint: 'Válaszok és újdonságok', path: '/(tabs)/notifications', icon: '♧', badge: unreadCount },
    { label: 'Profil', hint: 'Saját fiók', path: '/(tabs)/profile', icon: '○' },
  ];

  return (
    <View style={[s.shell, desktop && s.desktopShell]}>
      {desktop && <Animated.View style={[s.sidebar, collapsed && s.sidebarCollapsed, { width: sidebarWidth }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Oldalsáv kinyitása' : 'Oldalsáv behajtása'} onPress={() => setCollapsed(value => !value)} onHoverIn={() => setHoveringBrand(true)} onHoverOut={() => setHoveringBrand(false)} style={[s.brandToggle, collapsed && s.brandToggleCollapsed]}>
          <View pointerEvents="none"><Brand light compact={collapsed} /></View>
          <Animated.View pointerEvents="none" style={[s.brandHoverCover, { opacity: brandHover, transform: [{ translateX: brandHover.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }, { scale: brandHover.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }]}><Text style={s.brandHoverArrow}>{collapsed ? '›' : '‹'}</Text></Animated.View>
        </Pressable>
        {!collapsed && <Text style={s.workspaceLabel}>KÖZÖSSÉGI MŰHELY</Text>}
        <View style={s.nav}>
          {nav.map(item => {
            const key = item.path.split('/').pop() || '';
            const active = item.path === '/(tabs)' ? pathname === '/' || pathname === '/(tabs)' : pathname.includes(key);
            return <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push(item.path)} style={[s.navItem, collapsed && s.navItemCollapsed, active && s.navItemActive]}>
              <View style={s.navIconWrap}><Text style={[s.navIcon, active && s.navIconActive]}>{item.icon}</Text>{item.badge ? <View style={s.navBadge}><Text style={s.navBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text></View> : null}</View>
              {!collapsed && <View style={s.navCopy}><Text style={[s.navTitle, active && s.navTitleActive]}>{item.label}</Text><Text style={s.navHint}>{item.hint}</Text></View>}
            </Pressable>;
          })}
        </View>
        <View style={s.spacer} />
        <View style={[s.sidebarNote, collapsed && s.sidebarNoteCollapsed]}>{!collapsed && <><Text style={s.noteEyebrow}>KÖVETKEZŐ LÉPÉS</Text><Text style={s.noteText}>Van egy ötleted? Hozz létre egy projektet, és találj hozzá társakat.</Text></>}<Pressable accessibilityRole="button" accessibilityLabel="Új projekt létrehozása" style={[s.create, collapsed && s.createCollapsed]} onPress={() => router.push('/create-project')}><Text style={[s.createText, collapsed && s.createTextCollapsed]}>{collapsed ? '＋' : '＋  Új projekt'}</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Profil megnyitása" style={[s.account, collapsed && s.accountCollapsed]} onPress={() => router.push('/(tabs)/profile')}>
          <View style={s.accountAvatar}><Text style={s.accountInitial}>{initials(session?.user.email)}</Text></View>
          {!collapsed && <><View style={s.accountCopy}><Text numberOfLines={1} style={s.accountName}>{session?.user.email || 'Saját profil'}</Text><Text style={s.accountRole}>SkillSync-tag</Text></View><Text style={s.accountArrow}>↗</Text></>}
        </Pressable>
      </Animated.View>}
      <View style={s.content}><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: '#B6C5D4', tabBarStyle: desktop ? { display: 'none' } : { height: 73, paddingTop: 8, paddingBottom: 8, borderTopWidth: 0, backgroundColor: colors.navy, elevation: 18, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 18 }, tabBarLabelStyle: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', marginTop: 2 }, tabBarItemStyle: { paddingVertical: 1 } }}>
        <Tabs.Screen name="index" options={{ title: 'Felfedezés', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>◈</Text> }} />
        <Tabs.Screen name="groups" options={{ title: 'Csoportok', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◉</Text> }} />
        <Tabs.Screen name="notifications" options={{ title: 'Értesítések', tabBarBadge: unreadCount ? (unreadCount > 99 ? '99+' : unreadCount) : undefined, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>♧</Text> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>○</Text> }} />
      </Tabs>{!desktop && <Pressable accessibilityRole="button" accessibilityLabel="Új projekt létrehozása" onPress={() => router.push('/create-project')} style={s.fab}><Text style={s.fabPlus}>＋</Text></Pressable>}</View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper }, desktopShell: { flexDirection: 'row' },
  sidebar: { width: 264, backgroundColor: colors.navy, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, minHeight: '100%', borderRightWidth: 1, borderRightColor: '#112A4A', position: 'relative' },
  sidebarCollapsed: { paddingHorizontal: 10 },
  brandToggle: { alignSelf: 'flex-start', position: 'relative' }, brandToggleCollapsed: { alignSelf: 'center' }, brandHoverCover: { position: 'absolute', top: 0, left: 0, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF' }, brandHoverArrow: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 28, lineHeight: 32, marginTop: -3 },
  workspaceLabel: { color: '#91A5BF', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 1.5, marginTop: 42, marginBottom: 14, paddingHorizontal: 9 },
  nav: { gap: 6 }, navIconWrap: { width: 24, height: 25, alignItems: 'center', justifyContent: 'center', position: 'relative' }, navBadge: { position: 'absolute', top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: colors.navy }, navBadgeText: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 8, lineHeight: 10 }, navItem: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, navItemCollapsed: { width: 54, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  navItemActive: { backgroundColor: '#284568' }, navIcon: { width: 24, textAlign: 'center', color: '#A7B8CC', fontSize: 20 }, navIconActive: { color: '#FF9A54' },
  navCopy: { flex: 1 }, navTitle: { color: '#E6EDF5', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }, navTitleActive: { color: '#FFFFFF' }, navHint: { color: '#A7B8CC', fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 1 },
  spacer: { flex: 1, minHeight: 30 }, sidebarNote: { backgroundColor: '#203F64', borderRadius: 14, padding: 15, marginBottom: 18 }, sidebarNoteCollapsed: { padding: 7, alignItems: 'center', borderRadius: 14 }, noteEyebrow: { color: '#F5A36A', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 1 }, noteText: { color: '#E8EFF7', fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  create: { backgroundColor: colors.orange, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 11, alignItems: 'center', marginTop: 14 }, createCollapsed: { width: 42, height: 42, borderRadius: 13, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', marginTop: 0 }, createText: { color: colors.white, fontFamily: 'Poppins_700Bold', fontSize: 12 }, createTextCollapsed: { fontSize: 25, lineHeight: 30 },
  account: { borderTopWidth: 1, borderTopColor: '#385575', paddingTop: 15, flexDirection: 'row', alignItems: 'center', gap: 9 }, accountCollapsed: { justifyContent: 'center' }, accountAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5EDF5', alignItems: 'center', justifyContent: 'center' }, accountInitial: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 10 }, accountCopy: { flex: 1, minWidth: 0 }, accountName: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontSize: 10 }, accountRole: { color: '#A7B8CC', fontFamily: 'Poppins_400Regular', fontSize: 9, marginTop: 2 }, accountArrow: { color: '#A7B8CC', fontSize: 14 },
  content: { flex: 1, minWidth: 0 },
  fab: { position: 'absolute', right: 18, bottom: 88, width: 58, height: 58, borderRadius: 20, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8, zIndex: 20 },
  fabPlus: { color: colors.white, fontSize: 34, lineHeight: 40, fontWeight: '400', marginTop: -2 },
});
