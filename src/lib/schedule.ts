import type { Day, Lesson, Slot, Student } from '@/data/mock';
import { addDays, todayISO, weekday } from './dates';

/**
 * GRAFIK TYGODNIOWY
 * Podstawą jest stały termin (Slot): „uczeń X, w poniedziałek 15:00–16:00".
 * Konkretne lekcje (z datą) wyliczamy z terminów — tydzień po tygodniu.
 * W bazie zapisujemy tylko lekcje, które coś „wiedzą" (obecność, opłata,
 * notatka). Pozostałe to lekcje wirtualne, oznaczone `virtual: true`.
 */

/** Ile dni wstecz szukać niepotwierdzonych lekcji. */
const LOOKBACK_DAYS = 365;
/** Ile dni w przód generować lekcje (pulpit dnia, przypomnienia). */
const LOOKAHEAD_DAYS = 56;

/** Id lekcji wirtualnej: zawiera termin i datę, więc da się ją odnaleźć po zapisie. */
export function virtualLessonId(slotId: string, date: string): string {
  return `v_${slotId}_${date}`;
}

/** Odwrotność `virtualLessonId`. null, gdy id nie jest wirtualne. */
export function parseVirtualId(id: string): { slotId: string; date: string } | null {
  const m = /^v_(.+)_(\d{4}-\d{2}-\d{2})$/.exec(id);
  return m ? { slotId: m[1], date: m[2] } : null;
}

/** Czy termin obowiązuje w danym dniu (zakres valid_from–valid_to). */
function slotActiveOn(slot: Slot, date: string): boolean {
  return date >= slot.validFrom && (!slot.validTo || date <= slot.validTo);
}

/** Czy termin jest w aktualnym grafiku (nie został zakończony przed dziś). */
export function slotIsCurrent(slot: Slot, today = todayISO()): boolean {
  return !slot.validTo || slot.validTo >= today;
}

/**
 * Łączy zapisane lekcje z lekcjami wyliczonymi z terminów.
 * Lekcja zapisana w bazie (ten sam termin i data) ma pierwszeństwo.
 */
export function buildLessons(slots: Slot[], records: Lesson[], students: Student[], today = todayISO()): Lesson[] {
  const recorded = new Set(records.filter((r) => r.slotId).map((r) => `${r.slotId}|${r.date}`));
  const byId: Record<string, Student> = {};
  students.forEach((s) => (byId[s.id] = s));

  const from = addDays(today, -LOOKBACK_DAYS);
  const to = addDays(today, LOOKAHEAD_DAYS);
  const virtual: Lesson[] = [];

  for (const slot of slots) {
    const student = byId[slot.studentId];
    if (!student || !WEEK.includes(slot.day)) continue;
    const start = slot.validFrom > from ? slot.validFrom : from;
    const end = slot.validTo && slot.validTo < to ? slot.validTo : to;
    // Pierwszy dzień >= start, który wypada w dzień tygodnia terminu.
    let d = start;
    for (let i = 0; i < 7 && weekday(d) !== slot.day; i++) d = addDays(d, 1);
    for (; d <= end; d = addDays(d, 7)) {
      if (!slotActiveOn(slot, d) || recorded.has(`${slot.id}|${d}`)) continue;
      virtual.push({
        id: virtualLessonId(slot.id, d),
        studentId: student.id,
        slotId: slot.id,
        virtual: true,
        name: student.name,
        subject: student.subject,
        grade: 'kl. ' + student.grade,
        date: d,
        day: slot.day,
        start: slot.start,
        end: slot.end,
        status: 'planned',
        rate: student.rate,
        paid: false,
        note: '',
      });
    }
  }

  return [...records, ...virtual];
}

const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Czy lekcja już się skończyła (data w przeszłości albo dziś po godzinie końca). */
export function hasEnded(lesson: Lesson, now = new Date()): boolean {
  const today = todayISO();
  if (lesson.date < today) return true;
  if (lesson.date > today) return false;
  return toMin(lesson.end || lesson.start) <= now.getHours() * 60 + now.getMinutes();
}

/** Minione lekcje, przy których nie zaznaczono jeszcze, co się wydarzyło. */
export function pendingLessons(lessons: Lesson[], now = new Date()): Lesson[] {
  return lessons
    .filter((l) => l.status === 'planned' && hasEnded(l, now))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
}

/** Kolejność dni w grafiku (od poniedziałku). */
export const WEEK: Day[] = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

/** Pełna nazwa dnia tygodnia. */
export const DAY_NAME: Record<Day, string> = {
  Pon: 'Poniedziałek',
  Wt: 'Wtorek',
  Śr: 'Środa',
  Czw: 'Czwartek',
  Pt: 'Piątek',
  Sob: 'Sobota',
  Nd: 'Niedziela',
};
