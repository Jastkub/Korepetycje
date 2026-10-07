import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { type AttendanceStatus, type Day, type Homework, type Lesson, type Slot, type Student } from '@/data/mock';
import { addDays, todayISO, weekday } from '@/lib/dates';
import { syncReminders } from '@/lib/notifications';
import { buildLessons, parseVirtualId, slotIsCurrent } from '@/lib/schedule';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/theme/useTheme';
import { showAlert } from '@/lib/alert';

/**
 * MAGAZYN DANYCH — chmura (Supabase).
 * Wzorzec: akcja zapisuje zmianę w bazie → jeśli błąd, pokazuje komunikat i
 * zwraca `false`; jeśli OK, przeładowuje dane (`refresh`) i zwraca `true`.
 * Ekrany-formularze używają tego `true/false`, żeby zamknąć się dopiero po
 * udanym zapisie.
 */

export type NewStudent = {
  name: string;
  grade: string;
  subject: string;
  rate: number;
  contact: string;
  material: string;
  color: string; // hex
};

export type LessonPatch = { status?: AttendanceStatus; paid?: boolean; note?: string };

export type SlotInput = { studentId: string; day: Day; start: string; end: string };

type AppData = { students: Student[]; slots: Slot[]; lessons: Lesson[] };

type AppContextValue = {
  students: Student[];
  /** Stałe terminy w aktualnym grafiku tygodniowym. */
  slots: Slot[];
  /** Lekcje z datami: zapisane w bazie + wyliczone z grafiku. */
  lessons: Lesson[];
  refresh: () => Promise<void>;
  getStudent: (id: string) => Student | undefined;
  getLesson: (id: string) => Lesson | undefined;
  getSlot: (id: string) => Slot | undefined;
  /** Zwraca id nowego ucznia albo null przy błędzie. */
  addStudent: (input: NewStudent) => Promise<string | null>;
  updateStudent: (id: string, input: NewStudent) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  addSlot: (input: SlotInput) => Promise<boolean>;
  updateSlot: (id: string, input: SlotInput) => Promise<boolean>;
  removeSlot: (id: string) => Promise<boolean>;
  updateLesson: (id: string, patch: LessonPatch) => Promise<boolean>;
  /** Ta sama zmiana dla wielu lekcji naraz (np. „rozlicz wszystko"). */
  updateLessons: (ids: string[], patch: LessonPatch) => Promise<boolean>;
  deleteLesson: (id: string) => Promise<boolean>;
  setAttendance: (lessonId: string, status: AttendanceStatus, note?: string) => Promise<boolean>;
  setPaid: (lessonId: string, paid: boolean) => Promise<boolean>;
  toggleHomework: (studentId: string, homeworkId: string) => Promise<boolean>;
  addHomework: (studentId: string, text: string, due: string) => Promise<boolean>;
  deleteHomework: (studentId: string, homeworkId: string) => Promise<boolean>;
};

const AppContext = createContext<AppContextValue | null>(null);

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}


function mapHomework(row: any): Homework {
  return { id: row.id, text: row.text, due: row.due, done: row.done };
}

function mapStudent(row: any, homeworkRows: any[]): Student {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    grade: row.grade,
    subject: row.subject,
    rate: row.rate,
    packageDone: row.package_done,
    packageTotal: row.package_total,
    attendancePct: row.attendance_pct,
    contactLabel: row.contact_label,
    contact: row.contact,
    materialTitle: row.material_title,
    materialProgress: row.material_progress,
    homework: homeworkRows.filter((h) => h.student_id === row.id).map(mapHomework),
  };
}

function mapSlot(row: any): Slot {
  return {
    id: row.id,
    studentId: row.student_id,
    day: row.day,
    start: row.start_time,
    end: row.end_time,
    validFrom: row.valid_from,
    validTo: row.valid_to ?? null,
  };
}

function mapLesson(row: any, student?: Student): Lesson {
  return {
    id: row.id,
    studentId: row.student_id,
    slotId: row.slot_id ?? null,
    name: student?.name ?? '—',
    subject: student?.subject ?? '',
    grade: student ? 'kl. ' + student.grade : '',
    date: row.date,
    day: row.date ? weekday(row.date) : row.day,
    start: row.start_time,
    end: row.end_time,
    status: row.status,
    rate: row.rate,
    paid: row.paid,
    note: row.note ?? '',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ students: [], slots: [], lessons: [] });
  // Wszystkie terminy, łącznie z zakończonymi (potrzebne do historii).
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const c = useColors();

  const refresh = useCallback(async () => {
    const [s, l, h, sl] = await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('lessons').select('*').order('created_at'),
      supabase.from('homework').select('*').order('created_at'),
      supabase.from('slots').select('*').order('start_time'),
    ]);
    if (sl.error) {
      showAlert(
        'Brak tabeli grafiku',
        'Uruchom w Supabase (SQL Editor) plik supabase/migracja-grafik-tygodniowy.sql.\n\n' + sl.error.message,
      );
    }
    const hRows = h.data ?? [];
    const students = (s.data ?? []).map((row) => mapStudent(row, hRows));
    const byId: Record<string, Student> = {};
    students.forEach((st) => (byId[st.id] = st));
    const records = (l.data ?? []).map((row) => mapLesson(row, byId[row.student_id]));
    const slotsAll = (sl.data ?? []).map(mapSlot);
    const lessons = buildLessons(slotsAll, records, students);
    setAllSlots(slotsAll);
    setData({ students, slots: slotsAll.filter((x) => slotIsCurrent(x)), lessons });
    // Odśwież zaplanowane przypomnienia zgodnie z aktualnymi lekcjami.
    syncReminders(lessons);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Jeśli był błąd — pokaż komunikat i zwróć true (znaczy: „był błąd").
  const failed = (error: { message: string } | null): boolean => {
    if (error) {
      showAlert('Nie udało się zapisać', error.message);
      return true;
    }
    return false;
  };

  const addStudent = async (input: NewStudent) => {
    const { data: row, error } = await supabase.from('students').insert({
      name: input.name.trim() || 'Nowy uczeń',
      initials: initialsFrom(input.name),
      color: input.color,
      grade: input.grade.trim(),
      subject: input.subject,
      rate: input.rate,
      contact: input.contact.trim(),
      material_title: input.material.trim() || '—',
    }).select('id').single();
    if (failed(error)) return null;
    await refresh();
    return (row?.id as string) ?? null;
  };

  const updateStudent = async (id: string, input: NewStudent) => {
    const { error } = await supabase
      .from('students')
      .update({
        name: input.name.trim() || 'Uczeń',
        initials: initialsFrom(input.name),
        color: input.color,
        grade: input.grade.trim(),
        subject: input.subject,
        rate: input.rate,
        contact: input.contact.trim(),
        material_title: input.material.trim() || '—',
      })
      .eq('id', id);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  /* ---------- Grafik tygodniowy (stałe terminy) ---------- */

  const addSlot = async (input: SlotInput) => {
    const { error } = await supabase.from('slots').insert({
      student_id: input.studentId,
      day: input.day,
      start_time: input.start.trim(),
      end_time: input.end.trim(),
      valid_from: todayISO(),
    });
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  // Kończy termin na wczoraj (historia zostaje) i sprząta jego puste
  // przyszłe lekcje. Termin dodany dziś po prostu usuwamy.
  const endSlot = async (slot: Slot) => {
    const today = todayISO();
    const { error: cleanErr } = await supabase
      .from('lessons')
      .delete()
      .eq('slot_id', slot.id)
      .gte('date', today)
      .eq('status', 'planned')
      .eq('paid', false);
    if (failed(cleanErr)) return false;
    const { error } =
      slot.validFrom >= today
        ? await supabase.from('slots').delete().eq('id', slot.id)
        : await supabase.from('slots').update({ valid_to: addDays(today, -1) }).eq('id', slot.id);
    return !failed(error);
  };

  // Zmiana terminu działa od dziś: stary kończy się wczoraj, nowy zaczyna dziś.
  // Dzięki temu minione lekcje zostają w starym dniu i godzinie.
  const updateSlot = async (id: string, input: SlotInput) => {
    const slot = allSlots.find((x) => x.id === id);
    if (!slot) return false;
    if (slot.validFrom >= todayISO()) {
      const { error } = await supabase
        .from('slots')
        .update({ student_id: input.studentId, day: input.day, start_time: input.start.trim(), end_time: input.end.trim() })
        .eq('id', id);
      if (failed(error)) return false;
      await refresh();
      return true;
    }
    if (!(await endSlot(slot))) return false;
    return addSlot(input);
  };

  const removeSlot = async (id: string) => {
    const slot = allSlots.find((x) => x.id === id);
    if (!slot) return false;
    const ok = await endSlot(slot);
    await refresh();
    return ok;
  };

  /* ---------- Pojedyncze lekcje ---------- */

  // Lekcje w trakcie zapisu — chroni przed podwójnym wstawieniem tej samej
  // wirtualnej lekcji przy szybkim podwójnym kliknięciu.
  const saving = useRef(new Set<string>());

  const findLesson = (id: string): Lesson | undefined => {
    const direct = data.lessons.find((l) => l.id === id);
    if (direct) return direct;
    // Wirtualna lekcja mogła już zostać zapisana — szukamy po terminie i dacie.
    const v = parseVirtualId(id);
    return v ? data.lessons.find((l) => l.slotId === v.slotId && l.date === v.date) : undefined;
  };

  // Zapisuje zmianę jednej lub wielu lekcji. Wirtualne (z grafiku) wstawia do bazy.
  // Ekran zmienia się od razu (zanim baza odpowie), żeby aplikacja była szybka;
  // przy błędzie `refresh` przywraca stan z bazy.
  const saveLessons = async (ids: string[], patch: LessonPatch) => {
    const list = ids.map(findLesson).filter((l): l is Lesson => !!l && !saving.current.has(l.id));
    if (list.length === 0) return false;
    list.forEach((l) => saving.current.add(l.id));

    // Zaznaczenie opłaty oznacza, że lekcja się odbyła.
    const statusFor = (l: Lesson) => patch.status ?? (patch.paid !== undefined && l.status === 'planned' ? 'present' : l.status);
    const touched = new Set(list.map((l) => l.id));
    setData((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) => (touched.has(l.id) ? { ...l, ...patch, status: statusFor(l) } : l)),
    }));

    try {
      const virtual = list.filter((l) => l.virtual);
      const real = list.filter((l) => !l.virtual);
      const results = await Promise.all([
        virtual.length
          ? supabase.from('lessons').insert(
              virtual.map((l) => ({
                student_id: l.studentId,
                slot_id: l.slotId,
                date: l.date,
                day: l.day,
                start_time: l.start,
                end_time: l.end,
                status: statusFor(l),
                paid: patch.paid ?? false,
                note: patch.note ?? '',
                rate: l.rate,
              })),
            )
          : null,
        ...real.map((l) =>
          supabase.from('lessons').update({ ...patch, status: statusFor(l) }).eq('id', l.id),
        ),
      ]);
      const bad = results.find((r) => r?.error);
      await refresh();
      return !failed(bad?.error ?? null);
    } finally {
      list.forEach((l) => saving.current.delete(l.id));
    }
  };

  const saveLesson = (id: string, patch: LessonPatch) => saveLessons([id], patch);

  const deleteLesson = async (id: string) => {
    const lesson = findLesson(id);
    if (!lesson || lesson.virtual) return false;
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const setAttendance = (lessonId: string, status: AttendanceStatus, note?: string) =>
    saveLesson(lessonId, note === undefined ? { status } : { status, note });

  const setPaid = (lessonId: string, paid: boolean) => saveLesson(lessonId, { paid });

  const toggleHomework = async (studentId: string, homeworkId: string) => {
    const student = data.students.find((s) => s.id === studentId);
    const hw = student?.homework.find((h) => h.id === homeworkId);
    if (!hw) return false;
    const { error } = await supabase.from('homework').update({ done: !hw.done }).eq('id', homeworkId);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const addHomework = async (studentId: string, text: string, due: string) => {
    if (!text.trim()) return false;
    const { error } = await supabase.from('homework').insert({
      student_id: studentId,
      text: text.trim(),
      due: due.trim() || '—',
    });
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const deleteHomework = async (studentId: string, homeworkId: string) => {
    const { error } = await supabase.from('homework').delete().eq('id', homeworkId);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const value: AppContextValue = {
    students: data.students,
    slots: data.slots,
    lessons: data.lessons,
    refresh,
    getStudent: (id) => data.students.find((s) => s.id === id),
    getLesson: findLesson,
    getSlot: (id) => allSlots.find((x) => x.id === id),
    addStudent,
    updateStudent,
    deleteStudent,
    addSlot,
    updateSlot,
    removeSlot,
    updateLesson: saveLesson,
    updateLessons: saveLessons,
    deleteLesson,
    setAttendance,
    setPaid,
    toggleHomework,
    addHomework,
    deleteHomework,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp musi być użyte wewnątrz <AppProvider>');
  return ctx;
}
