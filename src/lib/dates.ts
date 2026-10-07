import type { Day } from '@/data/mock';

/**
 * Narzędzia do dat. Pracujemy na tekstach 'YYYY-MM-DD' (tak trzyma je baza),
 * żeby uniknąć problemów ze strefami czasowymi.
 */

const WEEKDAYS: Day[] = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
const MONTHS_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const MONTHS_NOM = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

/** Data z obiektu Date na tekst 'YYYY-MM-DD' (lokalnie). */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tekst 'YYYY-MM-DD' na obiekt Date (lokalnie, bez przesunięć stref). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Dzisiejsza data jako 'YYYY-MM-DD'. */
export function todayISO(): string {
  return toISO(new Date());
}

/** Data przesunięta o n dni. */
export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Data przesunięta o n miesięcy (dzień przycięty do długości miesiąca). */
export function addMonthsDate(iso: string, n: number): string {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISO(d);
}

/** Częstotliwość powtarzania lekcji. */
export type RepeatFreq = 'once' | 'daily' | 'weekly' | 'monthly';

/**
 * Lista dat powtarzania od `startISO` z krokiem `freq`, aż do `until` (włącznie).
 * 'once' albo brak/wcześniejsze `until` → tylko [startISO]. `cap` chroni przed lawiną.
 */
export function occurrences(startISO: string, freq: RepeatFreq, until?: string, cap = 366): string[] {
  if (freq === 'once') return [startISO];
  const step = (d: string) =>
    freq === 'daily' ? addDays(d, 1) : freq === 'weekly' ? addDays(d, 7) : addMonthsDate(d, 1);
  const end = until && until >= startISO ? until : startISO;
  const list: string[] = [];
  let d = startISO;
  let i = 0;
  while (d <= end && i < cap) {
    list.push(d);
    d = step(d);
    i++;
  }
  return list;
}

/** Poniedziałek tygodnia, w którym leży podana data. */
export function weekStartISO(iso: string): string {
  const d = parseISO(iso);
  const mondayOffset = (d.getDay() + 6) % 7; // Pn=0, Nd=6
  return addDays(iso, -mondayOffset);
}

/** Skrót dnia tygodnia, np. 'Śr'. */
export function weekday(iso: string): Day {
  return WEEKDAYS[parseISO(iso).getDay()];
}

// Kolejność dni z poniedziałkiem na początku (Pon=0 ... Nd=6).
const MON_FIRST: Day[] = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

/** Indeks dnia tygodnia liczony od poniedziałku (Pon=0 ... Nd=6). */
export function weekdayIndex(day: Day): number {
  return MON_FIRST.indexOf(day);
}

/** Ta sama data, ale przesunięta na wskazany dzień tygodnia (w obrębie tego tygodnia). */
export function setWeekday(iso: string, target: Day): string {
  return addDays(weekStartISO(iso), weekdayIndex(target));
}

/** Dzień i miesiąc, np. '4.09'. */
export function dayMonth(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Długa forma, np. '4 września'. */
export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** Klucz miesiąca z daty, np. '2026-09'. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Bieżący miesiąc jako '2026-09'. */
export function thisMonthKey(): string {
  return todayISO().slice(0, 7);
}

/** Etykieta miesiąca, np. 'wrzesień 2026'. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_NOM[m - 1]} ${y}`;
}

/** Miesiąc przesunięty o n (np. +1 = następny). */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Dodaje godzinę do 'HH:MM' (np. '11:00' -> '12:00', '23:30' -> '00:30'). '' gdy nie da się sparsować. */
export function plusHour(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return '';
  const total = ((parseInt(m[1], 10) + 1) * 60 + parseInt(m[2], 10)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Liczba godzin między 'HH:MM' i 'HH:MM' (np. 15:00–16:30 = 1.5). */
export function durationHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const diff = toMin(end) - toMin(start);
  return diff > 0 ? diff / 60 : 0;
}

/** Czy data należy do danego miesiąca ('2026-09'). */
export function inMonth(iso: string, key: string): boolean {
  return iso.slice(0, 7) === key;
}

/**
 * Wszystkie dni do wyświetlenia w siatce miesiąca — od poniedziałku tygodnia
 * z 1. dniem miesiąca do niedzieli tygodnia z ostatnim dniem (pełne tygodnie).
 */
export function monthGridDays(key: string): string[] {
  const [y, m] = key.split('-').map(Number);
  const first = `${key}-01`;
  const lastDayNum = new Date(y, m, 0).getDate();
  const last = `${key}-${String(lastDayNum).padStart(2, '0')}`;
  const start = weekStartISO(first);
  const end = addDays(weekStartISO(last), 6);
  const days: string[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

/** Zakres tygodnia, np. '2–8 września' albo '29 września – 5 października'. */
export function weekRange(mondayISO: string): string {
  const sun = addDays(mondayISO, 6);
  const dMon = parseISO(mondayISO);
  const dSun = parseISO(sun);
  if (dMon.getMonth() === dSun.getMonth()) {
    return `${dMon.getDate()}–${dSun.getDate()} ${MONTHS_GEN[dMon.getMonth()]}`;
  }
  return `${longDate(mondayISO)} – ${longDate(sun)}`;
}
