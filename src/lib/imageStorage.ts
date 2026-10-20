import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from './supabase';

export const COMMUNITY_IMAGE_BUCKET = 'community-images';
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getCommunityImageUrl(path: string) {
  if (!supabase) return null;
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

function extensionFor(asset: ImagePickerAsset) {
  const mime = asset.mimeType?.toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadCommunityImage(
  folder: 'profiles' | 'groups' | 'projects',
  ownerId: string,
  entityId: string,
  asset: ImagePickerAsset,
) {
  if (!supabase) throw new Error('Nincs Supabase-kapcsolat.');
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Nem sikerült megnyitni a kiválasztott képet.');
  const bytes = await response.arrayBuffer();
  const path = `${folder}/${entityId}/${ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(asset)}`;
  const { error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).upload(path, bytes, {
    contentType: asset.mimeType || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeCommunityImage(path: string | null | undefined) {
  if (!supabase || !path) return;
  const { error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
