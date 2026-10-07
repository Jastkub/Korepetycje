import { palette, type Colors } from './tokens';
import { useThemePref } from './ThemeContext';

/**
 * Zwraca zestaw kolorów pasujący do wybranego motywu (jasny / ciemny).
 * Motyw pochodzi z ThemeContext (wybór użytkownika lub ustawienie telefonu).
 *
 *   const c = useColors();
 *   <View style={{ backgroundColor: c.paper }} />
 */
export function useColors(): Colors {
  const { scheme, accent } = useThemePref();
  const base = scheme === 'dark' ? palette.dark : palette.light;
  // Nadpisujemy akcent wybranym przez użytkownika kolorem motywu.
  return { ...base, accent: accent.main, accentSoft: accent.soft };
}
