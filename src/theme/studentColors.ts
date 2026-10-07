/**
 * Kolory uczniów jako HEX (nie zależą od motywu). Kilka palet w różnych odcieniach.
 * `studentTone(hex)` daje kolor główny, przezroczyste tło i KONTRASTOWY kolor tekstu
 * (jasne kolory dostają ciemny tekst — dzięki temu pastele są czytelne).
 */

export type Palette = { name: string; colors: string[] };

export const PALETTES: Palette[] = [
  { name: 'Żywe', colors: ['#e8536e', '#ef7f4a', '#e6a52c', '#3fa76a', '#2fa39c', '#3f8ad6', '#6d6bd6', '#b558c0'] },
  { name: 'Pastelowe', colors: ['#f4a6b0', '#f6c79a', '#f3e0a0', '#a9dcb5', '#a3d9d2', '#a9c8f0', '#c2b8ef', '#e2b3e6'] },
  { name: 'Słodkie', colors: ['#ef7aa6', '#f2a1c0', '#c79ae0', '#9ab8ef', '#7ececf', '#8fd6a8', '#f4b58a', '#e98aa0'] },
  { name: 'Tęcza', colors: ['#e2483b', '#e8863a', '#e0b93a', '#4fa564', '#2f9e94', '#3a72c4', '#5a4bb0', '#a24bb0'] },
];

// Stare wartości enum -> hex (zgodność z uczniami dodanymi wcześniej).
const LEGACY_HEX: Record<string, string> = {
  accent: '#e8536e',
  indigo: '#6d6bd6',
  sage: '#3fa76a',
  amber: '#e6a52c',
  rose: '#ef7aa6',
  teal: '#2fa39c',
  violet: '#b558c0',
  blue: '#3f8ad6',
};

export const DEFAULT_STUDENT_COLOR = PALETTES[0].colors[0];

/** Czytelny kolor tekstu na danym tle (jasne tło -> ciemny tekst). */
export function textOn(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#20233a' : '#ffffff';
}

/** Zamienia zapis koloru ucznia na { main, soft, text }. */
export function studentTone(color: string | undefined): { main: string; soft: string; text: string } {
  const main = color && color.startsWith('#') ? color : LEGACY_HEX[color ?? ''] ?? DEFAULT_STUDENT_COLOR;
  return { main, soft: main + '2A', text: textOn(main) };
}
