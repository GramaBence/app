import { Alert, Platform } from 'react-native';

type ConfirmAction = () => void | Promise<void>;

export function confirmDestructive(title: string, message: string, onConfirm: ConfirmAction) {
  const run = () => { void onConfirm(); };

  if (Platform.OS === 'web') {
    if (typeof globalThis.confirm === 'function' && globalThis.confirm(`${title}\n\n${message}`)) run();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Mégse', style: 'cancel' },
    { text: 'Törlés', style: 'destructive', onPress: run },
  ]);
}

export function showNotice(title: string, message: string) {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
