import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrivateImage } from './PrivateImage';
import type { Group } from '../lib/types';
import { colors, initials } from '../lib/theme';

type Props = { group: Group; userId: string; onJoin: () => void; onOpen: () => void; onDelete?: () => void; onProfile?: () => void };

export function GroupCard({ group, userId, onJoin, onOpen, onDelete, onProfile }: Props) {
  const joined = group.group_members?.some(row => row.profile_id === userId) || group.owner_id === userId;
  const isOwner = group.owner_id === userId;
  return (
    <View style={s.card}>
      <Pressable onPress={onOpen} style={s.cover} accessibilityRole="button" accessibilityLabel={`${group.name} csoport megnyitása`}>
        <PrivateImage path={group.image_path} style={StyleSheet.absoluteFill} />
        {group.image_path ? <View pointerEvents="none" style={s.photoShade} /> : null}
        <Text style={s.coverTopic}>{group.topic.toUpperCase()}  /  KÖR</Text>
        <Text style={s.coverMark}>{initials(group.name).slice(0, 2)}</Text>
        <View style={s.coverRing} />
      </Pressable>
      <View style={s.header}>
        <View style={s.heading}>
          <Text numberOfLines={2} style={s.name}>{group.name}</Text>
        </View>
        <View style={s.memberPill}><Text style={s.memberIcon}>●</Text><Text style={s.members}>{group.group_members?.length || 0} tag</Text></View>
      </View>
      <Text numberOfLines={2} style={s.description}>{group.description}</Text>
      <Pressable onPress={onProfile}><Text style={s.owner}><Text style={s.ownerLabel}>SZERVEZŐ  </Text>{group.profiles?.full_name || 'Alkotó'}</Text></Pressable>
      <View style={s.actions}>
        <Pressable onPress={onOpen} style={s.open}><Text style={s.openText}>Csoport megnyitása</Text></Pressable>
        <Pressable onPress={onJoin} style={[s.join, joined && s.joined]}><Text style={[s.joinText, joined && s.joinTextJoined]}>{joined ? 'Tag vagy' : 'Csatlakozás'}</Text></Pressable>
        {isOwner && onDelete && <Pressable onPress={onDelete} style={s.delete} accessibilityRole="button" accessibilityLabel="Csoport törlése"><Text style={s.deleteText}>Törlés</Text></Pressable>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22, overflow: 'hidden', shadowColor: colors.navy, shadowOpacity: 0.07, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  cover: { height: 94, backgroundColor: colors.navy, paddingHorizontal: 18, paddingTop: 15, overflow: 'hidden' }, photoShade: { ...StyleSheet.absoluteFill, backgroundColor: '#102A4355' }, coverTopic: { color: '#FFC18F', fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 1.2, zIndex: 1 }, coverMark: { position: 'absolute', right: 20, top: -12, color: '#FFFFFF', opacity: 0.14, fontFamily: 'Poppins_800ExtraBold', fontSize: 94, lineHeight: 110 }, coverRing: { position: 'absolute', width: 103, height: 103, borderRadius: 52, borderWidth: 2, borderColor: '#FF6B0088', right: 47, bottom: -61 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 17, paddingTop: 15 },
  heading: { flex: 1 }, name: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 16 }, memberPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.paleOrange, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, memberIcon: { color: colors.orange, fontSize: 8 }, members: { color: colors.navy, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  description: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, marginTop: 8, paddingHorizontal: 17 }, owner: { color: colors.ink, fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 12, paddingHorizontal: 17 }, ownerLabel: { color: colors.orange, fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.7 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 17, paddingVertical: 12 },
  open: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.pale }, openText: { color: colors.navy, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  join: { backgroundColor: colors.orange, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginLeft: 'auto' }, joined: { backgroundColor: colors.pale }, joinText: { color: colors.white, fontFamily: 'Poppins_600SemiBold', fontSize: 10 }, joinTextJoined: { color: colors.navy },
  delete: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FDECEC' }, deleteText: { color: colors.danger, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
});
