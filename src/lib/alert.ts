import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Okienko komunikatu / potwierdzenia, działające też w przeglądarce
 * (tam `Alert.alert` z React Native nic nie robi).
 * Użycie identyczne jak `Alert.alert(tytuł, treść, przyciski)`.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const action = buttons?.find((b) => b.style !== 'cancel');
  const cancel = buttons?.find((b) => b.style === 'cancel');
  if (buttons && buttons.length > 1 && action) {
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  } else {
    window.alert(text);
    action?.onPress?.();
  }
}
