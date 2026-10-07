import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Motyw aplikacji: jasny/ciemny/system ORAZ kolor akcentu (kilka do wyboru).
 * Wszystko zapamiętywane w pamięci telefonu.
 */
export type ThemePref = 'light' | 'dark' | 'system';

type Tone = { main: string; soft: string };
export type Accent = { key: string; name: string; light: Tone; dark: Tone };

export const ACCENTS: Accent[] = [
  { key: 'coral', name: 'Koral', light: { main: '#e05a67', soft: '#fadfe1' }, dark: { main: '#f0838d', soft: '#37211f' } },
  { key: 'blue', name: 'Niebieski', light: { main: '#3b7fd6', soft: '#dde9f9' }, dark: { main: '#7fabe8', soft: '#182536' } },
  { key: 'violet', name: 'Fiolet', light: { main: '#7d5bd6', soft: '#e7e0f9' }, dark: { main: '#ab92ea', soft: '#221c37' } },
  { key: 'pink', name: 'Róż', light: { main: '#df5c9e', soft: '#fadcec' }, dark: { main: '#ef8fc0', soft: '#331f2b' } },
  { key: 'red', name: 'Czerwień', light: { main: '#dc4b52', soft: '#fadcdd' }, dark: { main: '#ef8288', soft: '#341d1e' } },
  { key: 'teal', name: 'Morski', light: { main: '#1f9b93', soft: '#d7efec' }, dark: { main: '#5fc7bd', soft: '#12302d' } },
];

type ThemeCtx = {
  pref: ThemePref;
  scheme: 'light' | 'dark';
  setPref: (p: ThemePref) => void;
  accentKey: string;
  setAccent: (key: string) => void;
  accent: Tone; // kolor akcentu dla aktualnego motywu
};

const Ctx = createContext<ThemeCtx>({
  pref: 'system',
  scheme: 'light',
  setPref: () => {},
  accentKey: 'coral',
  setAccent: () => {},
  accent: ACCENTS[0].light,
});

const KEY_PREF = 'theme.pref';
const KEY_ACCENT = 'theme.accent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [accentKey, setAccentState] = useState('coral');

  useEffect(() => {
    AsyncStorage.getItem(KEY_PREF).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
    });
    AsyncStorage.getItem(KEY_ACCENT).then((v) => {
      if (v && ACCENTS.some((a) => a.key === v)) setAccentState(v);
    });
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY_PREF, p).catch(() => {});
  };
  const setAccent = (key: string) => {
    setAccentState(key);
    AsyncStorage.setItem(KEY_ACCENT, key).catch(() => {});
  };

  const scheme: 'light' | 'dark' = pref === 'system' ? (device === 'dark' ? 'dark' : 'light') : pref;
  const accentDef = ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0];
  const accent = scheme === 'dark' ? accentDef.dark : accentDef.light;

  return (
    <Ctx.Provider value={{ pref, scheme, setPref, accentKey, setAccent, accent }}>{children}</Ctx.Provider>
  );
}

export function useThemePref(): ThemeCtx {
  return useContext(Ctx);
}
