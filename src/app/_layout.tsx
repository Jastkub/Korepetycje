import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/AuthGate';
import { AppProvider } from '@/store/AppStore';
import { ThemeProvider } from '@/theme/ThemeContext';

/**
 * Główny układ aplikacji. Wszystkie ekrany żyją w „stosie" (Stack):
 *  - (tabs)        → dolne zakładki (Dzisiaj / Grafik / Uczniowie / Więcej)
 *  - uczen/[id]    → profil ucznia (wchodzi z listy)
 *  - lekcja/[id]   → szczegóły lekcji + obecność
 *  - dodaj-ucznia  → formularz (wysuwany z dołu jako okno)
 */
export default function RootLayout() {
  // Wczytujemy własne fonty; do tego czasu nic nie renderujemy (unikamy „mrugnięcia").
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold, JetBrainsMono_400Regular });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthGate>
          <AppProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="uczen/[id]" />
              <Stack.Screen name="lekcja/[id]" />
              <Stack.Screen name="statystyki" />
              <Stack.Screen name="saldo" />
              <Stack.Screen name="przychod" />
              <Stack.Screen name="dodaj-ucznia" options={{ presentation: 'modal' }} />
              <Stack.Screen name="dodaj-lekcje" options={{ presentation: 'modal' }} />
            </Stack>
          </AppProvider>
          </AuthGate>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
