import { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../lib/theme';
import { PrivateImage } from './PrivateImage';

type Props = {
  label: string;
  imageUri?: string | null;
  imagePath?: string | null;
  aspect?: [number, number];
  onSelect: (asset: ImagePicker.ImagePickerAsset) => void;
};

export function ImageChooser({ label, imageUri, imagePath, aspect = [16, 9], onSelect }: Props) {
  const [busy, setBusy] = useState(false);
  async function choose() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect,
        quality: 0.82,
      });
      if (!result.canceled && result.assets[0]) onSelect(result.assets[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nem sikerült megnyitni a képeket.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Kép kiválasztása', message);
    } finally {
      setBusy(false);
    }
  }
  return <View style={s.wrap}>
    <Text style={s.label}>{label}</Text>
    <Pressable onPress={() => void choose()} accessibilityRole="button" accessibilityLabel="Kép kiválasztása" style={s.button}>
      {imageUri ? <Image source={{ uri: imageUri }} style={s.preview} resizeMode="cover" /> : imagePath ? <PrivateImage path={imagePath} style={s.preview} /> : <View style={s.placeholder}><Text style={s.icon}>＋</Text><Text style={s.placeholderText}>Kép hozzáadása</Text></View>}
      <View style={s.caption}><Text style={s.captionText}>{busy ? 'Megnyitás…' : imageUri ? 'Kép cseréje' : 'Válassz képet a készülékről'}</Text></View>
    </Pressable>
    <Text style={s.hint}>JPG, PNG vagy WebP · legfeljebb 8 MB</Text>
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginTop: 16 }, label: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 11, marginBottom: 7 },
  button: { height: 150, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  preview: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' }, placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' }, icon: { color: colors.orange, fontSize: 28, fontWeight: '700' }, placeholderText: { color: colors.navy, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 2 },
  caption: { position: 'absolute', right: 8, bottom: 8, backgroundColor: '#102A43DD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }, captionText: { color: colors.white, fontFamily: 'Poppins_600SemiBold', fontSize: 10 }, hint: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 5 },
});
