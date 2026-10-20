import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export type GroupAccessMode = 'public' | 'invite_code' | 'password';
export type ProjectAccessMode = 'public' | 'invite_code';

type Mode = GroupAccessMode | ProjectAccessMode;
type Props<T extends Mode> = {
  label: string;
  selected: T;
  onSelect: (mode: T) => void;
  modes: { id: T; title: string; description: string }[];
};

export function AccessModeSelector<T extends Mode>({ label, selected, onSelect, modes }: Props<T>) {
  return <View style={s.wrap}>
    <Text style={s.label}>{label}</Text>
    <View style={s.options}>{modes.map(mode => <Pressable key={mode.id} accessibilityRole="button" accessibilityState={{ selected: selected === mode.id }} onPress={() => onSelect(mode.id)} style={[s.option, selected === mode.id && s.optionSelected]}>
      <View style={s.optionHead}>
        <View style={[s.radio, selected === mode.id && s.radioSelected]} />
        <Text style={[s.title, selected === mode.id && s.titleSelected]}>{mode.title}</Text>
      </View>
      <Text style={[s.description, selected === mode.id && s.descriptionSelected]}>{mode.description}</Text>
    </Pressable>)}</View>
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginTop: 18 },
  label: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 12, marginBottom: 8 },
  options: { gap: 8 },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  optionSelected: { borderColor: colors.orange, backgroundColor: '#FFF7F1' },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: colors.muted },
  radioSelected: { borderColor: colors.orange, backgroundColor: colors.orange },
  title: { color: colors.navy, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  titleSelected: { color: colors.navy },
  description: { color: colors.muted, fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 15, marginTop: 5, marginLeft: 23 },
  descriptionSelected: { color: colors.navy },
});
