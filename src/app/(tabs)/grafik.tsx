import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen, statusTone } from '@/components/ui';
import { type Lesson } from '@/data/mock';
import {
  addDays,
  addMonths,
  dayMonth,
  inMonth,
  longDate,
  monthGridDays,
  monthLabel,
  thisMonthKey,
  todayISO,
  weekday,
  weekRange,
  weekStartISO,
} from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function ScheduleScreen() {
  const c = useColors();
  const router = useRouter();
  const { lessons, refresh } = useApp();
  const today = todayISO();

  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState(() => weekStartISO(today));
  const [month, setMonth] = useState(() => thisMonthKey());

  const open = (id: string) => router.push(`/lekcja/${id}`);

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={refresh}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: c.ink, marginBottom: spacing.md }}>
          Grafik
        </Text>

        {/* Przełącznik Tydzień / Miesiąc */}
        <View style={{ flexDirection: 'row', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 3, marginBottom: spacing.lg }}>
          {(['week', 'month'] as const).map((v) => {
            const on = view === v;
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm - 2, alignItems: 'center', backgroundColor: on ? c.accent : 'transparent' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? '#fff' : c.inkSoft }}>
                  {v === 'week' ? 'Tydzień' : 'Miesiąc'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {view === 'week' ? (
          <WeekView
            weekStart={weekStart}
            today={today}
            lessons={lessons}
            onPrev={() => setWeekStart(addDays(weekStart, -7))}
            onNext={() => setWeekStart(addDays(weekStart, 7))}
            onToday={() => setWeekStart(weekStartISO(today))}
            onOpen={open}
          />
        ) : (
          <MonthView
            month={month}
            today={today}
            lessons={lessons}
            onPrev={() => setMonth(addMonths(month, -1))}
            onNext={() => setMonth(addMonths(month, 1))}
            onOpen={open}
          />
        )}
      </Screen>

      <Pressable
        onPress={() => router.push('/dodaj-lekcje')}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: spacing.xl,
            bottom: spacing.xl,
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: c.accent,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
          pressed && { opacity: 0.85 },
        ]}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

/* ---------------- Widok tygodnia ---------------- */
function WeekView({
  weekStart, today, lessons, onPrev, onNext, onToday, onOpen,
}: {
  weekStart: string; today: string; lessons: Lesson[];
  onPrev: () => void; onNext: () => void; onToday: () => void; onOpen: (id: string) => void;
}) {
  const c = useColors();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isThisWeek = weekStart === weekStartISO(today);

  return (
    <>
      <NavRow label={weekRange(weekStart)} onPrev={onPrev} onNext={onNext} />
      {!isThisWeek && (
        <Pressable onPress={onToday} style={{ alignSelf: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontFamily: fonts.mono, color: c.accent, fontSize: 12 }}>← wróć do dziś</Text>
        </Pressable>
      )}
      {days.map((date) => {
        const dayLessons = lessons.filter((l) => l.date === date).sort((a, b) => a.start.localeCompare(b.start));
        const isToday = date === today;
        return (
          <View key={date} style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm + 2, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
            <View style={{ width: 46, paddingTop: 4 }}>
              <Text style={{ color: isToday ? c.accent : c.inkFaint, fontFamily: fonts.mono, fontSize: 11, textTransform: 'uppercase', fontWeight: isToday ? '700' : '400' }}>
                {weekday(date)}
              </Text>
              <Text style={{ color: isToday ? c.accent : c.inkSoft, fontFamily: fonts.mono, fontSize: 11 }}>{dayMonth(date)}</Text>
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              {dayLessons.length === 0 ? (
                <Text style={{ color: c.inkFaint, fontSize: 12, paddingTop: 6 }}>—</Text>
              ) : (
                dayLessons.map((lesson) => <Slot key={lesson.id} lesson={lesson} onPress={() => onOpen(lesson.id)} />)
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

/* ---------------- Widok miesiąca ---------------- */
const WD_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

function MonthView({
  month, today, lessons, onPrev, onNext, onOpen,
}: {
  month: string; today: string; lessons: Lesson[];
  onPrev: () => void; onNext: () => void; onOpen: (id: string) => void;
}) {
  const c = useColors();
  const grid = monthGridDays(month);
  // Domyślnie zaznaczony: dziś (jeśli w tym miesiącu), inaczej 1. dzień.
  const [selected, setSelected] = useState(() => (inMonth(today, month) ? today : `${month}-01`));
  const selDay = inMonth(selected, month) ? selected : `${month}-01`;

  const weeks: string[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  const selLessons = lessons.filter((l) => l.date === selDay).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <NavRow label={monthLabel(month)} onPrev={onPrev} onNext={onNext} />

      {/* Nagłówek dni tygodnia */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WD_SHORT.map((d) => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, color: c.inkFaint }}>
            {d}
          </Text>
        ))}
      </View>

      {/* Siatka */}
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date) => {
            const dayLessons = lessons.filter((l) => l.date === date);
            const inThis = inMonth(date, month);
            const isToday = date === today;
            const isSel = date === selDay;
            return (
              <Pressable
                key={date}
                onPress={() => setSelected(date)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  margin: 2,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSel ? c.accentSoft : 'transparent',
                  borderWidth: isSel ? 1.5 : 0,
                  borderColor: c.accent,
                  opacity: inThis ? 1 : 0.35,
                }}>
                <Text style={{ fontSize: 13, fontWeight: isToday ? '800' : '500', color: isToday ? c.accent : c.ink }}>
                  {parseInt(date.slice(8), 10)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, height: 6, marginTop: 2 }}>
                  {dayLessons.slice(0, 3).map((l) => (
                    <View key={l.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: statusTone(c, l.status).main }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Lekcje wybranego dnia */}
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.inkFaint, marginTop: spacing.lg, marginBottom: spacing.sm }}>
        {longDate(selDay)}
      </Text>
      {selLessons.length === 0 ? (
        <Text style={{ color: c.inkFaint, fontSize: 13 }}>Brak lekcji tego dnia.</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {selLessons.map((lesson) => <Slot key={lesson.id} lesson={lesson} onPress={() => onOpen(lesson.id)} />)}
        </View>
      )}
    </>
  );
}

/* ---------------- Wspólne ---------------- */
function NavRow({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <Arrow icon="chevron-back" onPress={onPrev} />
      <Text style={{ flex: 1, textAlign: 'center', color: c.ink, fontSize: 14, fontWeight: '700' }}>{label}</Text>
      <Arrow icon="chevron-forward" onPress={onNext} />
    </View>
  );
}

function Arrow({ icon, onPress }: { icon: 'chevron-back' | 'chevron-forward'; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        { width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.6 },
      ]}>
      <Ionicons name={icon} size={18} color={c.inkSoft} />
    </Pressable>
  );
}

function Slot({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  const c = useColors();
  const st = statusTone(c, lesson.status);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: st.soft, borderLeftWidth: 3, borderLeftColor: st.main },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={{ fontSize: 13 }}>
        <Text style={{ color: c.inkSoft, fontFamily: fonts.mono, fontSize: 11 }}>{lesson.start} </Text>
        <Text style={{ color: c.ink, fontWeight: '700' }}>{lesson.name}</Text>
        <Text style={{ color: c.inkSoft }}> · {lesson.subject}</Text>
      </Text>
    </Pressable>
  );
}
