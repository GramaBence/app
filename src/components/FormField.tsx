import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../lib/theme';

export function FormField({ label, ...props }: TextInputProps & { label: string }) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={[s.input, props.multiline && s.multiline, props.style]} placeholderTextColor="#94A3B8" /></View>; }
const s = StyleSheet.create({ field: { marginTop: 15 }, label: { color: colors.navy, fontFamily: 'Poppins_700Bold', fontSize: 12, marginBottom: 6 }, input: { minHeight: 43, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FBFCFE', color: colors.navy, fontFamily: 'Poppins_400Regular', fontSize: 14 }, multiline: { minHeight: 100, textAlignVertical: 'top' } });
