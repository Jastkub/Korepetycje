import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Avatar, PrimaryButton, Screen, text } from '@/components/ui';
import { type Day } from '@/data/mock';
import { plusHour, todayISO, weekday } from '@/lib/dates';
import { DAY_NAME, WEEK } from '@/lib/schedule';
import { useApp } from '@/store/AppStore';
import { useThemePref } from '@/theme/ThemeContext';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';
import { showAlert } from '@/lib/alert';

// 'HH:MM' <-> Date (tylko godzina)
const hmToDate = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
// Do wyszukiwania: małe litery, bez polskich znaków („ś" = „s").
const norm = (x: string) =>
  x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
const validHm = (hm: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(hm.trim());

/**
 * Dodawanie / edycja stałego terminu w grafiku tygodniowym.
 * `?slot=<id>` — edycja istniejącego terminu, `?day=Pon` — podpowiedź dnia.
 */
export default function SlotForm() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: string; day?: string; student?: string }>();
  const { students, slots, getSlot, getStudent, addSlot, updateSlot, removeSlot } = useApp();

  const existing = params.slot ? getSlot(params.slot) : undefined;
  const editing = !!existing;
  const presetDay = WEEK.includes(params.day as Day) ? (params.day as Day) : weekday(todayISO());

  const presetStudent = params.student && getStudent(params.student) ? params.student : undefined;
  const [studentId, setStudentId] = useState(existing?.studentId ?? presetStudent ?? '');
  const [day, setDay] = useState<Day>(existing?.day ?? presetDay);
  const [start, setStart] = useState(existing?.start ?? '15:00');
  const [end, setEnd] = useState(existing?.end ?? '16:00');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  // Lista uczniów zwija się po wyborze — zostaje tylko wybrany + „Zmień".
  const [picking, setPicking] = useState(!existing && !presetStudent);
  // Tylko jedna rolka otwarta naraz.
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  // Zmiana początku przesuwa koniec, zachowując długość lekcji.
  const onStart = (v: string) => {
    if (validHm(v) && validHm(start) && validHm(end)) {
      const len = toMin(end) - toMin(start);
      if (len > 0) {
        const e = hmToDate(v);
        e.setMinutes(e.getMinutes() + len);
        setEnd(dateToHm(e));
      } else {
        setEnd(plusHour(v));
      }
    }
    setStart(v);
  };

  const timesOk = validHm(start) && validHm(end) && toMin(end) > toMin(start);
  const canSave = !!studentId && timesOk;

  // Inne terminy tego dnia, które nachodzą na wybrane godziny.
  const clashes = timesOk
    ? slots.filter(
        (x) => x.id !== existing?.id && x.day === day && toMin(x.start) < toMin(end) && toMin(start) < toMin(x.end),
      )
    : [];

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const input = { studentId, day, start: start.trim(), end: end.trim() };
    const ok = editing ? await updateSlot(existing.id, input) : await addSlot(input);
    setBusy(false);
    if (ok) router.back();
  };

  const remove = () => {
    if (!existing) return;
    showAlert('Usunąć z grafiku?', 'Termin zniknie z grafiku od dziś. Minione lekcje zostaną w historii.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          if (await removeSlot(existing.id)) router.back();
        },
      },
    ]);
  };

  const editedStudent = existing ? getStudent(existing.studentId) : undefined;
  const picked = !editing && !picking ? getStudent(studentId) : undefined;
  const q = norm(query.trim());
  const found = q
    ? students.filter((s) => norm(`${s.name} ${s.subject} ${s.grade}`).includes(q))
    : students;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <View>
          <Text style={[t.mono, { fontSize: 12.5, color: c.inkFaint }]}>Grafik tygodniowy</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: c.ink }}>
            {editing ? 'Edytuj termin' : 'Dodaj termin'}
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
      ) : picked ? (
        <Pressable
          onPress={() => setPicking(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.accent, backgroundColor: c.accentSoft, marginBottom: spacing.lg }}>
          <Avatar student={picked} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14.5, color: c.ink }} numberOfLines={1}>{picked.name}</Text>
            <Text style={t.soft} numberOfLines={1}>{picked.subject} · {picked.grade}</Text>
          </View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: c.accent }}>Zmień</Text>
        </Pressable>
      ) : students.length === 0 ? (
        <Text style={{ color: c.inkFaint, fontSize: 13, marginBottom: spacing.md }}>
          Najpierw dodaj ucznia w zakładce „Uczniowie".
        </Text>
      ) : (
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            <Ionicons name="search" size={17} color={c.inkFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Szukaj ucznia…"
              placeholderTextColor={c.inkFaint}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={{ flex: 1, minWidth: 0, fontSize: 15, color: c.ink }}
            />
          </View>
          {found.length === 0 && (
            <Text style={{ color: c.inkFaint, fontSize: 13, paddingVertical: spacing.sm }}>Brak ucznia „{query.trim()}".</Text>
          )}
          {found.map((s) => {
            const on = studentId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setStudentId(s.id);
                  setPicking(false);
                  setQuery('');
                  Keyboard.dismiss();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, backgroundColor: on ? c.accentSoft : c.card, borderColor: on ? c.accent : c.line }}>
                <Avatar student={s} size={34} />
                <Text style={{ flex: 1, fontWeight: '700', fontSize: 14.5, color: c.ink }} numberOfLines={1}>{s.name}</Text>
                <Text style={t.soft} numberOfLines={1}>{s.subject} · {s.grade}</Text>
                {on && <Ionicons name="checkmark-circle" size={20} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}

      <Label>DZIEŃ TYGODNIA</Label>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.lg }}>
        {WEEK.map((d) => {
          const on = day === d;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={{ flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', backgroundColor: on ? c.indigoSoft : c.card, borderColor: on ? c.indigo : c.line }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? c.indigo : c.inkSoft }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TimeField label="OD" value={start} onChange={onStart} active={picker === 'start'} onPress={() => setPicker(picker === 'start' ? null : 'start')} />
        <TimeField label="DO" value={end} onChange={setEnd} active={picker === 'end'} onPress={() => setPicker(picker === 'end' ? null : 'end')} />
      </View>

      {picker && (
        <TimeWheel
          value={picker === 'start' ? start : end}
          onChange={(hm) => (picker === 'start' ? onStart(hm) : setEnd(hm))}
          onClose={() => setPicker(null)}
        />
      )}

      <Text style={[t.soft, { marginTop: spacing.md, color: timesOk ? c.inkSoft : c.rose }]}>
        {timesOk
          ? `Co tydzień: ${DAY_NAME[day].toLowerCase()}, ${start}–${end}.`
          : 'Godzina końca musi być późniejsza niż początku.'}
      </Text>
      {clashes.map((x) => (
        <Text key={x.id} style={[t.soft, { color: c.amber, marginTop: 4 }]}>
          ⚠ Nachodzi na: {getStudent(x.studentId)?.name ?? '—'} {x.start}–{x.end}
        </Text>
      ))}
      {!studentId && !editing && students.length > 0 && (
        <Text style={[t.soft, { color: c.rose, marginTop: 4 }]}>Wybierz ucznia z listy.</Text>
      )}

      <View style={{ height: spacing.lg }} />
      <PrimaryButton label={editing ? 'Zapisz zmiany' : 'Dodaj do grafiku'} onPress={save} loading={busy} />

      {editing && (
        <Pressable onPress={remove} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: c.rose, fontWeight: '600', fontSize: 14 }}>Usuń z grafiku</Text>
        </Pressable>
      )}
    </Screen>
  );
}

/**
 * Pole godziny. Na telefonie to przycisk (dotknij → rolka pod polami),
 * w przeglądarce zwykłe pole tekstowe.
 */
function TimeField({
  label, value, onChange, active, onPress,
}: {
  label: string; value: string; onChange: (v: string) => void; active: boolean; onPress: () => void;
}) {
  const c = useColors();
  const box = {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: active ? c.accent : c.line,
    backgroundColor: c.card,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const;

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Label>{label}</Label>
      {Platform.OS === 'web' ? (
        <View style={box}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="15:00"
            placeholderTextColor={c.inkFaint}
            maxLength={5}
            style={{ flex: 1, minWidth: 0, fontSize: 18, color: c.ink, fontFamily: fonts.mono }}
          />
        </View>
      ) : (
        <Pressable onPress={onPress} style={box}>
          <Text style={{ fontSize: 18, color: c.ink, fontFamily: fonts.mono }}>{value || '--:--'}</Text>
          <Ionicons name="time-outline" size={20} color={active ? c.accent : c.inkSoft} />
        </Pressable>
      )}
    </View>
  );
}

/** Rolka wyboru godziny (co 5 minut). iOS: pod polami, Android: systemowe okienko. */
function TimeWheel({ value, onChange, onClose }: { value: string; onChange: (hm: string) => void; onClose: () => void }) {
  const c = useColors();
  const { scheme } = useThemePref();
  if (Platform.OS === 'web') return null;

  return (
    <View style={{ marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: 'hidden' }}>
      <DateTimePicker
        value={hmToDate(validHm(value) ? value : '15:00')}
        mode="time"
        is24Hour
        locale="pl-PL"
        display="spinner"
        minuteInterval={5}
        themeVariant={scheme}
        textColor={c.ink}
        style={{ alignSelf: 'center' }}
        onChange={(e, d) => {
          if (Platform.OS === 'android') onClose();
          if (d && e.type !== 'dismissed') onChange(dateToHm(d));
        }}
      />
      {Platform.OS === 'ios' && (
        <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: spacing.sm + 2, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 14 }}>Gotowe</Text>
        </Pressable>
      )}
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: c.inkFaint, marginBottom: spacing.sm }}>
      {children}
    </Text>
  );
}
