import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Chip, ConfirmActions } from '@/components/lesson-actions';
import { Avatar, Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { type Lesson, type Student } from '@/data/mock';
import { showAlert } from '@/lib/alert';
import { dayMonth, todayISO, weekday } from '@/lib/dates';
import { pendingLessons } from '@/lib/schedule';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const isUnpaid = (l: Lesson) => (l.status === 'present' || l.status === 'late') && !l.paid;

/**
 * ROZLICZENIA — jedno miejsce na pieniądze:
 *  1. Do potwierdzenia: minione lekcje, przy których nic nie zaznaczono.
 *  2. Do zapłaty: odbyte, nieopłacone — pogrupowane po uczniach, z „Rozlicz".
 */
export default function BillingScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { lessons, students, getLesson, updateLessons, refresh } = useApp();

  // Listy „zamrożone" na czas wizyty w zakładce — potwierdzona lekcja zostaje
  // na ekranie (z możliwością cofnięcia), aż wrócisz do zakładki.
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [unpaidIds, setUnpaidIds] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      setPendingIds(pendingLessons(lessonsRef.current).map((l) => l.id));
      setUnpaidIds(lessonsRef.current.filter(isUnpaid).map((l) => l.id));
    }, []),
  );

  const rateOf = (id: string) => students.find((s) => s.id === id)?.rate ?? 0;
  const pendingRows = pendingIds.map(getLesson).filter(Boolean) as Lesson[];
  const pendingLeft = pendingRows.filter((l) => l.status === 'planned');

  // Do zapłaty: zamrożone + nowe nieopłacone (np. właśnie potwierdzone wyżej).
  const unpaidAll = [
    ...(unpaidIds.map(getLesson).filter(Boolean) as Lesson[]),
    ...lessons.filter((l) => isUnpaid(l) && !unpaidIds.includes(l.id) && !pendingIds.some((p) => getLesson(p)?.id === l.id)),
  ];
  const groups = students
    .map((s) => ({
      student: s,
      items: unpaidAll.filter((l) => l.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .filter((g) => g.items.length > 0);
  const totalDue = lessons.filter(isUnpaid).reduce((sum, l) => sum + rateOf(l.studentId), 0);

  const confirmAllPaid = () => {
    const n = pendingLeft.length;
    showAlert('Wszystkie opłacone?', `Oznaczy ${n} ${lekcje(n)} jako odbyte i opłacone.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Tak', onPress: () => updateLessons(pendingLeft.map((l) => l.id), { status: 'present', paid: true }) },
    ]);
  };

  return (
    <Screen onRefresh={refresh}>
      <Header eyebrow="Pieniądze" title="Rozliczenia" />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Tile label="Do zapłaty" value={`${totalDue} zł`} fg={totalDue > 0 ? c.amber : c.sage} bg={totalDue > 0 ? c.amberSoft : c.sageSoft} />
        <Tile label="Do potwierdzenia" value={`${pendingLeft.length}`} fg={pendingLeft.length > 0 ? c.indigo : c.sage} bg={pendingLeft.length > 0 ? c.indigoSoft : c.sageSoft} />
      </View>

      {pendingRows.length === 0 && groups.length === 0 && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="checkmark-circle" size={22} color={c.sage} />
            <Text style={[t.body, { flex: 1 }]}>Wszystko rozliczone. 🎉</Text>
          </View>
        </Card>
      )}

      {pendingRows.length > 0 && (
        <>
          <SectionLabel
            right={
              pendingLeft.length > 1 ? (
                <Pressable onPress={confirmAllPaid} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: c.sage, fontWeight: '700' }}>✓ wszystkie opłacone</Text>
                </Pressable>
              ) : undefined
            }>
            DO POTWIERDZENIA
          </SectionLabel>
          {pendingRows.map((l) => {
            const s = students.find((x) => x.id === l.studentId);
            return (
              <Card key={l.id} onPress={() => router.push(`/lekcja/${l.id}`)}>
                <LessonHead lesson={l} student={s} rate={rateOf(l.studentId)} />
                <ConfirmActions lesson={l} />
              </Card>
            );
          })}
        </>
      )}

      {groups.length > 0 && (
        <>
          <SectionLabel>DO ZAPŁATY</SectionLabel>
          {groups.map((g) => (
            <DebtCard key={g.student.id} student={g.student} items={g.items} rate={g.student.rate} />
          ))}
        </>
      )}
    </Screen>
  );
}

/** Karta ucznia z zaległościami: suma, „Rozlicz" i lista lekcji (dotknij = opłacone). */
function DebtCard({ student, items, rate }: { student: Student; items: Lesson[]; rate: number }) {
  const c = useColors();
  const t = text(c);
  const { updateLesson, updateLessons } = useApp();
  const open = items.filter((l) => !l.paid);
  const due = open.length * rate;

  const settle = () => {
    showAlert(`Rozliczyć ${student.name}?`, `${open.length} ${lekcje(open.length)} · ${due} zł zostanie oznaczone jako opłacone.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Rozlicz', onPress: () => updateLessons(open.map((l) => l.id), { paid: true }) },
    ]);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar student={student} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{student.name}</Text>
          <Text style={t.soft}>
            {open.length > 0 ? `${open.length} ${lekcje(open.length)} · ${due} zł` : 'Rozliczone ✓'}
          </Text>
        </View>
        {open.length > 0 && <Chip icon="checkmark-done" label="Rozlicz" fg="#fff" bg={c.sage} onPress={settle} flex={false} />}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
        {items.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => updateLesson(l.id, { paid: !l.paid })}
            hitSlop={4}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: l.paid ? c.sage : c.line, backgroundColor: l.paid ? c.sageSoft : 'transparent' },
              pressed && { opacity: 0.6 },
            ]}>
            {l.paid && <Ionicons name="checkmark" size={12} color={c.sage} />}
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: l.paid ? c.sage : c.inkSoft }}>
              {weekday(l.date)} {dayMonth(l.date)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

function LessonHead({ lesson, student, rate }: { lesson: Lesson; student?: Student; rate: number }) {
  const c = useColors();
  const t = text(c);
  const when = lesson.date === todayISO() ? 'Dziś' : `${weekday(lesson.date)} ${dayMonth(lesson.date)}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {student && <Avatar student={student} size={38} />}
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{lesson.name}</Text>
        <Text style={t.soft}>
          {when} · {lesson.start}–{lesson.end} · {rate} zł
        </Text>
      </View>
    </View>
  );
}

function Tile({ label, value, fg, bg }: { label: string; value: string; fg: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: fg }}>{label}</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: '600', color: fg }}>{value}</Text>
    </View>
  );
}

function lekcje(n: number) {
  if (n === 1) return 'lekcja';
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? 'lekcje' : 'lekcji';
}
