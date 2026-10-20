import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Project } from '../lib/types';
import { colors, initials, shortDate } from '../lib/theme';
import { PrivateImage } from './PrivateImage';

const categoryColors: Record<string, string> = {
  'Design': '#8654CC', 'Technológia': '#2576C5', 'Környezet': '#22845B',
  'Film és fotó': '#C45D3B', 'Zene': '#C18512', 'Más': colors.orange,
};
const categoryMarks: Record<string, string> = {
  Design: 'D', Technológia: 'T', Környezet: 'K', 'Film és fotó': 'F', Zene: 'Z', Más: 'S',
};

type Props = {
  project: Project;
  userId: string;
  onPress: () => void;
  onLike: () => void;
  onJoin: () => void;
  onDelete?: () => void;
  onProfile?: () => void;
};

export function ProjectCard({ project, userId, onPress, onLike, onJoin, onDelete, onProfile }: Props) {
  const liked = project.project_likes?.some(row => row.profile_id === userId) || false;
  const joined = project.project_members?.some(row => row.profile_id === userId) || project.owner_id === userId;
  const isOwner = project.owner_id === userId;
  const accent = categoryColors[project.category] || colors.orange;

  return (
    <View style={s.card}>
      <Pressable onPress={onPress} style={[s.art, { backgroundColor: `${accent}18` }]} accessibilityRole="button" accessibilityLabel={`${project.title} projekt megnyitása`}>
        <PrivateImage path={project.image_path} style={StyleSheet.absoluteFill} />
        {project.image_path ? <View pointerEvents="none" style={s.photoShade} /> : null}
        <View style={s.artLabel}><View style={[s.categoryDot, { backgroundColor: accent }]} /><Text style={[s.category, { color: accent }]}>{project.category.toUpperCase()}  /  PROJEKT</Text><View style={s.statusChip}><Text style={s.statusDot}>●</Text><Text style={s.status}>{project.status}</Text></View></View>
        <Text style={[s.artMark, { color: accent }]}>{categoryMarks[project.category] || 'S'}</Text>
        <View style={[s.artOrbit, { borderColor: `${accent}55` }]} />
      </Pressable>
      <Pressable onPress={onPress} style={s.content}>
        <Text numberOfLines={2} style={s.title}>{project.title}</Text>
        <Text numberOfLines={3} style={s.description}>{project.description}</Text>
      </Pressable>

      {project.groups?.name ? <Text style={s.groupTag}>Csoport · {project.groups.name}</Text> : null}

      <View style={s.authorRow}>
        <Pressable onPress={onProfile} style={s.avatar}><PrivateImage path={project.profiles?.avatar_url} style={s.avatarImage} /><Text style={s.avatarText}>{!project.profiles?.avatar_url ? initials(project.profiles?.full_name) : ''}</Text></Pressable>
        <View style={s.author}>
          <Pressable onPress={onProfile}><Text style={s.authorName}>{project.profiles?.full_name || 'Alkotó'}</Text></Pressable>
          <Text style={s.date}>{shortDate(project.created_at)}</Text>
        </View>
        <Text style={s.memberCount}>{project.project_members?.length || 0} tag</Text>
      </View>

      <View style={s.actions}>
        <Pressable onPress={onLike} style={s.action} accessibilityRole="button" accessibilityLabel="Kedvelés">
          <Text style={[s.actionIcon, liked && s.liked]}>{liked ? '♥' : '♡'}</Text>
          <Text style={s.actionText}>{project.project_likes?.length || 0}</Text>
        </Pressable>
        <Pressable onPress={onPress} style={s.action}>
          <Text style={s.actionIcon}>◌</Text><Text style={s.actionText}>Hozzászólások</Text>
        </Pressable>
        {!isOwner && <Pressable onPress={onJoin} style={[s.join, joined && s.joined]}>
          <Text style={[s.joinText, joined && s.joinTextJoined]}>{joined ? 'Tag vagy' : 'Csatlakozás'}</Text>
        </Pressable>}
        {isOwner && onDelete && <Pressable onPress={onDelete} style={s.delete} accessibilityRole="button" accessibilityLabel="Projekt törlése">
          <Text style={s.deleteText}>Törlés</Text>
        </Pressable>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22, overflow: 'hidden', shadowColor: colors.navy, shadowOpacity: 0.07, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  art: { height: 112, paddingHorizontal: 18, paddingVertical: 15, overflow: 'hidden', justifyContent: 'space-between' }, photoShade: { ...StyleSheet.absoluteFill, backgroundColor: '#102A4338' },
  artLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 2 },
  artMark: { position: 'absolute', right: 26, top: 1, fontSize: 102, lineHeight: 116, fontFamily: 'Poppins_800ExtraBold', opacity: 0.2 },
  artOrbit: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 2, right: -13, bottom: -42 },
  categoryDot: { width: 7, height: 7, borderRadius: 4 }, category: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  statusChip: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }, statusDot: { color: '#38A169', fontSize: 8 }, status: { color: colors.muted, fontSize: 9, fontFamily: 'Poppins_500Medium' },
  content: { marginTop: 12, paddingHorizontal: 18 }, title: { color: colors.ink, fontSize: 18, lineHeight: 24, fontFamily: 'Poppins_700Bold', letterSpacing: -0.35 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 },
  groupTag: { color: colors.navy, fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 10, paddingHorizontal: 18 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, paddingHorizontal: 18 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EAF0F7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { ...StyleSheet.absoluteFill },
  avatarText: { color: colors.navy, fontSize: 11, fontFamily: 'Poppins_700Bold' }, author: { flex: 1 },
  authorName: { color: colors.ink, fontSize: 12, fontFamily: 'Poppins_600SemiBold' }, date: { color: colors.muted, fontSize: 10, marginTop: 1 },
  memberCount: { color: colors.muted, backgroundColor: colors.paper, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, overflow: 'hidden', fontSize: 10, fontFamily: 'Poppins_500Medium' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 13, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 18, paddingVertical: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 }, actionIcon: { color: colors.muted, fontSize: 17 }, liked: { color: colors.orange }, actionText: { color: colors.muted, fontSize: 10, fontFamily: 'Poppins_500Medium' },
  join: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.orange, borderRadius: 12 }, joined: { backgroundColor: colors.pale }, joinText: { color: colors.white, fontSize: 10, fontFamily: 'Poppins_600SemiBold' }, joinTextJoined: { color: colors.navy },
  delete: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FDECEC' }, deleteText: { color: colors.danger, fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
});
