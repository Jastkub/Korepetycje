import { Platform } from 'react-native';

/**
 * System kolorów aplikacji — jasny i ciemny motyw.
 * Te same nazwy w obu motywach, więc komponenty nie muszą wiedzieć,
 * który motyw jest aktywny — po prostu używają np. colors.accent.
 */
export const palette = {
  light: {
    paper: '#f7f4ee', // tło ekranu
    card: '#ffffff', // tło kart
    ink: '#20233a', // główny tekst
    inkSoft: '#565a76', // tekst drugorzędny
    inkFaint: '#8b8fa8', // etykiety, podpisy
    line: '#e5e0d6', // obramowania
    lineSoft: '#efebe2', // delikatne linie działowe
    accent: '#c65b3c', // kolor wiodący (terakota)
    accentSoft: '#f3e0d7',
    indigo: '#3d4b8c',
    indigoSoft: '#e6e9f5',
    sage: '#4a7a5c', // obecny / sukces
    sageSoft: '#e0efe4',
    amber: '#b7822a', // ostrzeżenie / do zapłaty
    amberSoft: '#f4e9d3',
    rose: '#b23b4e', // nieobecność / błąd
    roseSoft: '#f6e0e3',
    teal: '#2f8f83',
    tealSoft: '#d9ece9',
    violet: '#6b4ea6',
    violetSoft: '#e7e0f2',
    blue: '#2f6cb0',
    blueSoft: '#dde8f5',
  },
  dark: {
    paper: '#131319',
    card: '#22242f',
    ink: '#ecebf2',
    inkSoft: '#a6a9bd',
    inkFaint: '#71748c',
    line: '#313543',
    lineSoft: '#282b36',
    accent: '#e2795a',
    accentSoft: '#3a2820',
    indigo: '#96a2de',
    indigoSoft: '#262b40',
    sage: '#84b794',
    sageSoft: '#1f2b24',
    amber: '#d6a24e',
    amberSoft: '#302716',
    rose: '#dd8794',
    roseSoft: '#301f23',
    teal: '#6cc0b2',
    tealSoft: '#17332e',
    violet: '#a98fd6',
    violetSoft: '#241d33',
    blue: '#7ba7dd',
    blueSoft: '#1a2636',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

/** Odstępy — jedna skala używana w całej apce (w pikselach). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Zaokrąglenia rogów. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

/**
 * Rodziny fontów. Fraunces (serif, nagłówki) i JetBrains Mono (etykiety) —
 * wczytywane przy starcie w `src/app/_layout.tsx`. `sans` zostaje systemowy.
 * Uwaga: przy własnych fontach każda grubość to osobna rodzina, dlatego
 * `fontWeight` na nich nie działa — grubość niesie sama nazwa kroju.
 */
export const fonts = {
  serif: 'Fraunces_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
};
