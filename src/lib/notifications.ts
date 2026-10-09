import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { Lesson } from '@/data/mock';
import { parseISO } from './dates';

/**
 * PRZYPOMNIENIA (lokalne powiadomienia)
 * Planowane na telefonie — działają offline, bez serwera push.
 * Zasada: przy każdej zmianie danych kasujemy wszystkie zaplanowane i
 * ustawiamy je od nowa dla przyszłych lekcji (jeśli włączone w ustawieniach).
 */

// Gdy powiadomienie przyjdzie przy otwartej apce — i tak pokaż baner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ENABLED_KEY = 'reminders.enabled';
const MIN_KEY = 'reminders.minutes';
const MAX_SCHEDULED = 60;

export type ReminderPrefs = { enabled: boolean; minutes: number };

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const e = await AsyncStorage.getItem(ENABLED_KEY);
    const m = await AsyncStorage.getItem(MIN_KEY);
    return { enabled: e === '1', minutes: m ? parseInt(m, 10) : 60 };
  } catch {
    return { enabled: false, minutes: 60 };
  }
}

export async function setReminderEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

export async function setReminderMinutes(minutes: number) {
  await AsyncStorage.setItem(MIN_KEY, String(minutes));
}

/** Poproś o zgodę na powiadomienia. Zwraca true, jeśli przyznana. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Ustaw przypomnienia od nowa na podstawie aktualnych lekcji.
 * Kasuje wszystkie zaplanowane i tworzy je dla przyszłych lekcji.
 */
export async function syncReminders(lessons: Lesson[]) {
  try {
    const { enabled, minutes } = await getReminderPrefs();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    const now = Date.now();
    const upcoming: { l: Lesson; fireAt: number }[] = [];
    for (const l of lessons) {
      if (!l.date || !l.start || l.status === 'cancelled') continue;
      const [h, m] = l.start.split(':').map(Number);
      const when = parseISO(l.date);
      when.setHours(h || 0, m || 0, 0, 0);
      const fireAt = when.getTime() - minutes * 60_000;
      if (fireAt > now) upcoming.push({ l, fireAt }); // tylko przyszłe
    }
    // iOS pozwala zaplanować najwyżej 64 powiadomienia — bierzemy najbliższe.
    upcoming.sort((a, b) => a.fireAt - b.fireAt);
    for (const { l, fireAt } of upcoming.slice(0, MAX_SCHEDULED)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Za ${minutes} min: ${l.name}`,
          body: `${l.start}–${l.end} · ${l.subject}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
        },
      });
    }
  } catch {
    // Ciche pominięcie — brak powiadomień nie może wywalić apki.
  }
}
