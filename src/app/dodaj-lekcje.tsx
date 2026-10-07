import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Avatar, PrimaryButton, Screen, text } from '@/components/ui';
import {
  addMonthsDate,
  dayMonth,
  longDate,
  occurrences,
  parseISO,
  plusHour,
  setWeekday,
  todayISO,
  weekday,
  type RepeatFreq,
} from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const FREQS: { f: RepeatFreq; label: string }[] = [
  { f: 'once', label: 'Raz' },
  { f: 'daily', label: 'Codziennie' },
  { f: 'weekly', label: 'Co tydzień' },
  { f: 'monthly', label: 'Co miesiąc' },
];

// 'HH:MM' <-> Date (tylko godzina)
const hmToDate = (hm: string) => {
  const [h, m] = (hm || '12:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dateToIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function LessonForm() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { students, lessons, getStudent, addLessons, getLesson, updateLesson, updateLessonsBulk } = useApp();

  const editing = !!id;
  const existing = id ? getLesson(id) : undefined;
  const editedStudent = existing ? getStudent(existing.studentId) : undefined;

  const [studentId, setStudentId] = useState(existing?.studentId ?? students[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [start, setStart] = useState(existing?.start ?? '');
  const [end, setEnd] = useState(existing?.end ?? '');
  const [freq, setFreq] = useState<RepeatFreq>('once');
  const [until, setUntil] = useState('');
  const [applyToSeries, setApplyToSeries] = useState(false); // przenieś cały stały termin
  const [busy, setBusy] = useState(false);

  // Lekcje tego samego stałego terminu (ten uczeń, ten dzień tygodnia i ta godzina startu),
  // przyszłe (od dziś) — do zbiorczego przeniesienia.
  const seriesLessons =
    editing && existing
      ? lessons.filter(
          (l) =>
            l.studentId === existing.studentId &&
            weekday(l.date) === weekday(existing.date) &&
            l.start === existing.start &&
            l.date >= todayISO(),
        )
      : [];
  // Tylko jedna rolka otwarta naraz (inaczej OD i DO nakładały się na siebie).
  const [picker, setPicker] = useState<'start' | 'end' | 'until' | null>(null);
  const toggle = (p: 'start' | 'end' | 'until') => setPicker((cur) => (cur === p ? null : p));

  const dateOptions = Array.from({ length: 28 }, (_, i) => addDaysLocal(todayISO(), i));
  if (existing?.date && !dateOptions.includes(existing.date)) dateOptions.unshift(existing.date);

  // Zmiana początku: podpowiedz koniec +1h (gdy pusty).
  const onStart = (v: string) => {
    setStart(v);
    if (!end.trim()) {
      const e = plusHour(v);
      if (e) setEnd(e);
    }
  };

  // Zmiana częstotliwości: dla powtarzania ustaw domyślną datę końca (miesiąc do przodu).
  const onFreq = (f: RepeatFreq) => {
    setFreq(f);
    if (f !== 'once' && !until) setUntil(addMonthsDate(date, 1));
  };

  const dates = occurrences(date, freq, freq === 'once' ? undefined : until);
  const extraCount = editing ? dates.filter((d) => d !== date).length : dates.length;
  const canSave = studentId && date && start.trim() && end.trim();

  const newDay = weekday(date); // docelowy dzień tygodnia (z wybranej daty)

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    let ok = true;
    if (editing && id && applyToSeries) {
      // Przenieś cały stały termin: każdą przyszłą lekcję tego terminu ustaw na nowy
      // dzień tygodnia (w jej własnym tygodniu) i nową godzinę.
      const updates = seriesLessons.map((l) => ({
        id: l.id,
        date: setWeekday(l.date, newDay),
        start,
        end,
      }));
      ok = await updateLessonsBulk(updates);
    } else if (editing && id) {
      ok = await updateLesson(id, { date, start, end });
      const extra = dates.filter((d) => d !== date);
      if (ok && extra.length > 0) ok = await addLessons(studentId, extra, start, end);
    } else {
      ok = await addLessons(studentId, dates, start, end);
    }
    setBusy(false);
    if (ok) router.back();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <View>
          <Text style={[t.mono, { fontSize: 12.5, color: c.inkFaint }]}>{editing ? 'Edycja lekcji' : 'Nowa lekcja'}</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: c.ink }}>
            {editing ? 'Edytuj lekcję' : 'Dodaj lekcję'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={c.inkSoft} />
        </Pressable>
      </View>

      <Label>UCZEŃ</Label>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, marginBottom: spacing.lg }}>
          {editedStudent && <Avatar student={editedStudent} size={34} />}
          <Text style={{ flex: 1, fontWeight: '700', fontSize: 14.5, color: c.ink }}>{editedStudent?.name ?? '—'}</Text>
        </View>
      ) : students.length === 0 ? (
        <Text style={{ color: c.inkFaint, fontSize: 13, marginBottom: spacing.md }}>
          Najpierw dodaj ucznia w zakładce „Uczniowie".
        </Text>
      ) : (
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {students.map((s) => {
            const on = studentId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setStudentId(s.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, backgroundColor: on ? c.accentSoft : c.card, borderColor: on ? c.accent : c.line }}>
                <Avatar student={s} size={34} />
                <Text style={{ flex: 1, fontWeight: '700', fontSize: 14.5, color: c.ink }}>{s.name}</Text>
                <Text style={t.soft}>{s.subject} · {s.grade}</Text>
                {on && <Ionicons name="checkmark-circle" size={20} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}

      <Label>DZIEŃ</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>
        {dateOptions.map((d) => {
          const on = date === d;
          return (
            <Pressable key={d} onPress={() => setDate(d)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', minWidth: 54, backgroundColor: on ? c.indigoSoft : c.card, borderColor: on ? c.indigo : c.line }}>
              <Text style={{ fontSize: 11, fontFamily: fonts.mono, color: on ? c.indigo : c.inkFaint, textTransform: 'uppercase' }}>{weekday(d)}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: on ? c.indigo : c.ink, marginTop: 2 }}>{dayMonth(d)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <TimeField label="OD" value={start} onChange={onStart} active={picker === 'start'} onToggle={() => toggle('start')} />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField label="DO" value={end} onChange={setEnd} active={picker === 'end'} onToggle={() => toggle('end')} />
        </View>
      </View>

      {/* Rolka na całą szerokość — jedna naraz, wyśrodkowana pod polami */}
      {(picker === 'start' || picker === 'end') && Platform.OS !== 'web' && (
        <DateTimePicker
          value={hmToDate(picker === 'start' ? start : end)}
          mode="time"
          is24Hour
          display="spinner"
          textColor={c.ink}
          style={{ alignSelf: 'stretch' }}
          onChange={(e, d) => {
            if (Platform.OS === 'android') setPicker(null);
            if (d && e.type !== 'dismissed') {
              const hm = dateToHm(d);
              if (picker === 'start') onStart(hm);
              else setEnd(hm);
            }
          }}
        />
      )}

      {editing && existing && seriesLessons.length >= 1 && (
        <View style={{ marginTop: spacing.md, borderWidth: 1, borderColor: applyToSeries ? c.accent : c.line, backgroundColor: c.card, borderRadius: radius.md, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14 }}>Przenieś cały stały termin</Text>
              <Text style={[t.soft, { marginTop: 2 }]}>
                {weekday(existing.date)} {existing.start} → {newDay} {start || '—'} · {seriesLessons.length} {plural(seriesLessons.length)} od dziś
              </Text>
            </View>
            <Switch value={applyToSeries} onValueChange={setApplyToSeries} trackColor={{ true: c.accent, false: c.line }} thumbColor="#fff" />
          </View>
        </View>
      )}

      {!(editing && applyToSeries) && (
        <>
      <View style={{ height: spacing.md }} />
      <Label>POWTARZANIE</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {FREQS.map((o) => {
          const on = freq === o.f;
          return (
            <Pressable key={o.f} onPress={() => onFreq(o.f)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5, backgroundColor: on ? c.indigoSoft : c.card, borderColor: on ? c.indigo : c.line }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? c.indigo : c.inkSoft }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {freq !== 'once' && (
        <View style={{ marginTop: spacing.md }}>
          <Label>POWTARZAJ DO DNIA</Label>
          <DateField value={until} min={date} onChange={setUntil} active={picker === 'until'} onToggle={() => toggle('until')} />
        </View>
      )}

      <Text style={[t.soft, { marginTop: spacing.sm }]}>
        {freq === 'once'
          ? 'Jedna lekcja w wybranym dniu.'
          : editing
            ? `Dołoży ${extraCount} ${plural(extraCount)} (do ${until ? longDate(until) : '—'}).`
            : `Utworzy ${dates.length} ${plural(dates.length)} (do ${until ? longDate(until) : '—'}).`}
      </Text>
        </>
      )}

      <View style={{ height: spacing.md }} />
      <PrimaryButton label={editing ? 'Zapisz zmiany' : 'Dodaj do grafiku'} onPress={save} loading={busy} />
    </Screen>
  );
}

function plural(n: number) {
  if (n === 1) return 'lekcję';
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? 'lekcje' : 'lekcji';
}

// prosty odpowiednik addDays bez importu kolizji nazw
function addDaysLocal(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Pole godziny: zawsze można wpisać ręcznie (pole tekstowe), a ikonka zegara
 * otwiera „rolkę" (spinner). Tylko jedna rolka otwarta naraz (sterowane z góry).
 */
function TimeField({
  label, value, onChange, active, onToggle,
}: {
  label: string; value: string; onChange: (v: string) => void; active: boolean; onToggle: () => void;
}) {
  const c = useColors();
  return (
    <>
      <Label>{label}</Label>
      <View style={[inputStyle(c), { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="15:00"
          placeholderTextColor={c.inkFaint}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          style={{ flex: 1, fontSize: 16, color: c.ink, fontFamily: fonts.mono, paddingVertical: spacing.md }}
        />
        <Pressable onPress={onToggle} hitSlop={8} style={{ padding: 6 }}>
          <Ionicons name="time-outline" size={20} color={active ? c.accent : c.inkSoft} />
        </Pressable>
      </View>
    </>
  );
}

/** Pole daty (koniec powtarzania) — natywny kalendarz; w web pole tekstowe. */
function DateField({
  value, min, onChange, active, onToggle,
}: {
  value: string; min: string; onChange: (v: string) => void; active: boolean; onToggle: () => void;
}) {
  const c = useColors();

  if (Platform.OS === 'web') {
    return (
      <TextInput value={value} onChangeText={onChange} placeholder="RRRR-MM-DD" placeholderTextColor={c.inkFaint} style={[inputStyle(c), { fontSize: 15, color: c.ink }]} />
    );
  }

  return (
    <>
      <Pressable onPress={onToggle} style={inputStyle(c)}>
        <Text style={{ fontSize: 15, color: value ? c.ink : c.inkFaint }}>{value ? longDate(value) : 'Wybierz datę'}</Text>
      </Pressable>
      {active && (
        <DateTimePicker
          value={value ? parseISO(value) : parseISO(min)}
          mode="date"
          display="inline"
          minimumDate={parseISO(min)}
          onChange={(e, d) => {
            if (Platform.OS === 'android') onToggle();
            if (d && e.type !== 'dismissed') onChange(dateToIso(d));
          }}
        />
      )}
    </>
  );
}

function inputStyle(c: ReturnType<typeof useColors>) {
  return {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  } as const;
}

function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: c.inkFaint, marginBottom: spacing.sm }}>
      {children}
    </Text>
  );
}
