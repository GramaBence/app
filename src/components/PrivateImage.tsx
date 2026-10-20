import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { getCommunityImageUrl } from '../lib/imageStorage';

type Props = { path?: string | null; style: StyleProp<ImageStyle>; resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center' };

export function PrivateImage({ path, style, resizeMode = 'cover' }: Props) {
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (path) {
      void getCommunityImageUrl(path).then(url => { if (active && url) setResolved({ path, url }); });
    }
    return () => { active = false; };
  }, [path]);
  return path && resolved?.path === path ? <Image source={{ uri: resolved.url }} style={style} resizeMode={resizeMode} /> : null;
}
