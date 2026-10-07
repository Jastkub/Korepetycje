import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { type AttendanceStatus, type Homework, type Lesson, type Student } from '@/data/mock';
import { weekday } from '@/lib/dates';
import { syncReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/theme/useTheme';

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

type AppData = { students: Student[]; lessons: Lesson[] };

type AppContextValue = {
  students: Student[];
  lessons: Lesson[];
  refresh: () => Promise<void>;
  getStudent: (id: string) => Student | undefined;
  getLesson: (id: string) => Lesson | undefined;
  addStudent: (input: NewStudent) => Promise<boolean>;
  updateStudent: (id: string, input: NewStudent) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  addLessons: (studentId: string, dates: string[], start: string, end: string) => Promise<boolean>;
  updateLesson: (id: string, patch: { date: string; start: string; end: string }) => Promise<boolean>;
  updateLessonsBulk: (updates: { id: string; date: string; start: string; end: string }[]) => Promise<boolean>;
  deleteLesson: (id: string) => Promise<boolean>;
  setAttendance: (lessonId: string, status: AttendanceStatus, note?: string) => Promise<boolean>;
  setPaid: (lessonId: string, paid: boolean) => Promise<boolean>;
  toggleHomework: (studentId: string, homeworkId: string) => Promise<boolean>;
  addHomework: (studentId: string, text: string, due: string) => Promise<boolean>;
  deleteHomework: (studentId: string, homeworkId: string) => Promise<boolean>;
  setMaterialProgress: (studentId: string, progress: number) => Promise<boolean>;
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

function mapLesson(row: any, student?: Student): Lesson {
  return {
    id: row.id,
    studentId: row.student_id,
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
  const [data, setData] = useState<AppData>({ students: [], lessons: [] });
  const [loading, setLoading] = useState(true);
  const c = useColors();

  const refresh = useCallback(async () => {
    const [s, l, h] = await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('lessons').select('*').order('created_at'),
      supabase.from('homework').select('*').order('created_at'),
    ]);
    const hRows = h.data ?? [];
    const students = (s.data ?? []).map((row) => mapStudent(row, hRows));
    const byId: Record<string, Student> = {};
    students.forEach((st) => (byId[st.id] = st));
    const lessons = (l.data ?? []).map((row) => mapLesson(row, byId[row.student_id]));
    setData({ students, lessons });
    // Odśwież zaplanowane przypomnienia zgodnie z aktualnymi lekcjami.
    syncReminders(lessons);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Jeśli był błąd — pokaż komunikat i zwróć true (znaczy: „był błąd").
  const failed = (error: { message: string } | null): boolean => {
    if (error) {
      Alert.alert('Nie udało się zapisać', error.message);
      return true;
    }
    return false;
  };

  const addStudent = async (input: NewStudent) => {
    const { error } = await supabase.from('students').insert({
      name: input.name.trim() || 'Nowy uczeń',
      initials: initialsFrom(input.name),
      color: input.color,
      grade: input.grade.trim(),
      subject: input.subject,
      rate: input.rate,
      contact: input.contact.trim(),
      material_title: input.material.trim() || '—',
    });
    if (failed(error)) return false;
    await refresh();
    return true;
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

  // Tworzy po jednej lekcji dla każdej daty z listy (obsługuje cykliczność).
  const addLessons = async (studentId: string, dates: string[], start: string, end: string) => {
    const student = data.students.find((s) => s.id === studentId);
    if (!student || dates.length === 0) return false;
    const rows = dates.map((d) => ({
      student_id: student.id,
      date: d,
      day: weekday(d),
      start_time: start.trim(),
      end_time: end.trim(),
      status: 'planned',
      rate: student.rate,
      paid: false,
    }));
    const { error } = await supabase.from('lessons').insert(rows);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const updateLesson = async (id: string, patch: { date: string; start: string; end: string }) => {
    const { error } = await supabase
      .from('lessons')
      .update({
        date: patch.date,
        day: weekday(patch.date),
        start_time: patch.start.trim(),
        end_time: patch.end.trim(),
      })
      .eq('id', id);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  // Zbiorcza zmiana wielu lekcji (np. przeniesienie całego stałego terminu).
  const updateLessonsBulk = async (updates: { id: string; date: string; start: string; end: string }[]) => {
    if (updates.length === 0) return false;
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from('lessons')
          .update({ date: u.date, day: weekday(u.date), start_time: u.start.trim(), end_time: u.end.trim() })
          .eq('id', u.id),
      ),
    );
    const bad = results.find((r) => r.error);
    if (bad && failed(bad.error)) return false;
    await refresh();
    return true;
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const setAttendance = async (lessonId: string, status: AttendanceStatus, note?: string) => {
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (!lesson) return false;
    const { error } = await supabase
      .from('lessons')
      .update({ status, note: note ?? lesson.note })
      .eq('id', lessonId);
    if (failed(error)) return false;
    // Licznik spotkań i frekwencja liczą się z historii lekcji (patrz lib/stats.ts).
    await refresh();
    return true;
  };

  const setPaid = async (lessonId: string, paid: boolean) => {
    const { error } = await supabase.from('lessons').update({ paid }).eq('id', lessonId);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

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

  const setMaterialProgress = async (studentId: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress));
    const { error } = await supabase.from('students').update({ material_progress: clamped }).eq('id', studentId);
    if (failed(error)) return false;
    await refresh();
    return true;
  };

  const value: AppContextValue = {
    students: data.students,
    lessons: data.lessons,
    refresh,
    getStudent: (id) => data.students.find((s) => s.id === id),
    getLesson: (id) => data.lessons.find((l) => l.id === id),
    addStudent,
    updateStudent,
    deleteStudent,
    addLessons,
    updateLesson,
    updateLessonsBulk,
    deleteLesson,
    setAttendance,
    setPaid,
    toggleHomework,
    addHomework,
    deleteHomework,
    setMaterialProgress,
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
