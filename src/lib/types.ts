export type Profile = { id: string; full_name: string; username: string | null; bio: string | null; skills?: string | null; avatar_url?: string | null };
export type Project = {
  id: string; owner_id: string; title: string; description: string; category: string; status: string; created_at: string; group_id?: string | null; access_mode?: 'public' | 'invite_code'; image_path?: string | null;
  profiles?: Profile; groups?: { id?: string; name: string } | null; project_members?: { profile_id: string; profiles?: Profile }[]; project_likes?: { profile_id: string }[];
};
export type Group = {
  id: string; owner_id: string; name: string; description: string; topic: string; created_at: string; access_mode?: 'public' | 'invite_code' | 'password'; image_path?: string | null;
  profiles?: Profile; group_members?: { profile_id: string; profiles?: Profile }[];
};
export type Comment = { id: string; author_id: string; body: string; created_at: string; visibility?: 'public' | 'private'; recipient_id?: string | null; reply_to_id?: string | null; profiles?: Profile; recipient_profile?: Profile };

export type AppNotification = { id: string; recipient_id: string; actor_id: string; project_id: string; comment_id: string; is_private: boolean; created_at: string; read_at: string | null; profiles?: Profile; projects?: { title: string } | null };
