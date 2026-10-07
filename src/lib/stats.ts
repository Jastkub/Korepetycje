import type { Lesson, Student } from '@/data/mock';
import { addDays, weekStartISO } from './dates';

/**
 * Statystyki ucznia liczone z realnej historii lekcji (nie z zapisanej liczby).
 *  - done       — odbyte spotkania (był + spóźniony)
 *  - attendance — frekwencja % (odbyte / (odbyte + nieobecne)); null gdy brak danych
 *  - due        — do zapłaty: liczba odbytych, nieopłaconych lekcji × AKTUALNA stawka ucznia
 *
 * Kwotę liczymy z aktualnej `student.rate`, żeby zmiana stawki od razu była widoczna
 * (nie ze stawki „zamrożonej" w lekcji przy jej tworzeniu).
 */
export function studentStats(student: Student, lessons: Lesson[]) {
  const own = lessons.filter((l) => l.studentId === student.id);
  const present = own.filter((l) => l.status === 'present').length;
  const late = own.filter((l) => l.status === 'late').length;
  const absent = own.filter((l) => l.status === 'absent').length;

  const done = present + late; // spotkania, które faktycznie się odbyły
  const counted = done + absent; // lekcje wliczane do frekwencji
  const attendance = counted > 0 ? Math.round((done / counted) * 100) : null;

  const unpaidDone = own.filter(
    (l) => (l.status === 'present' || l.status === 'late') && !l.paid,
  ).length;
  const due = unpaidDone * student.rate;

  return { done, attendance, due };
}

/**
 * Saldo tygodnia zawierającego `anyDate` (poniedziałek–niedziela).
 *  - earned — zarobione z odbytych lekcji (× aktualna stawka ucznia)
 *  - due    — z tego jeszcze nieopłacone
 */
export function weekBalance(anyDate: string, lessons: Lesson[], students: Student[]) {
  const start = weekStartISO(anyDate);
  const end = addDays(start, 6);
  const rateOf = (id: string) => students.find((s) => s.id === id)?.rate ?? 0;
  const attended = lessons.filter(
    (l) => l.date >= start && l.date <= end && (l.status === 'present' || l.status === 'late'),
  );
  const earned = attended.reduce((sum, l) => sum + rateOf(l.studentId), 0);
  const due = attended.filter((l) => !l.paid).reduce((sum, l) => sum + rateOf(l.studentId), 0);
  return { earned, due };
}
