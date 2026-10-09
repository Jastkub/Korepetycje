import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmActions } from '@/components/lesson-actions';
import { statusTone } from '@/components/ui';
import { type Lesson } from '@/data/mock';
import { addDays, dayMonth, longDate, todayISO, weekday, weekStartISO } from '@/lib/dates';
import { hasEnded } from '@/lib/schedule';
import { weekBalance } from '@/lib/stats';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const toMin = (x: string) => {
  const [h, m] = x.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export default function DayScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { lessons, students, setPaid } = useApp();

  const today = todayISO();
  // Okno dni: 5 tygodni wstecz do ~7 w przód (od poniedziałku), do przesuwania palcem.
  const days = useMemo(() => {
    const start = addDays(weekStartISO(today), -35);
    return Array.from({ length: 84 }, (_, i) => addDays(start, i));
  }, [today]);
  const todayIndex = Math.max(0, days.indexOf(today));

  const [index, setIndex] = useState(todayIndex);
  const listRef = useRef<FlatList<string>>(null);
  const focused = days[index] ?? today;

  const goto = (i: number) => {
    const clamped = Math.max(0, Math.min(days.length - 1, i));
    setIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  const bal = weekBalance(focused, lessons, students);

  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      {/* Nagłówek: nawigacja dni + saldo tygodnia */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Arrow icon="chevron-back" onPress={() => goto(index - 1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: focused === today ? c.accent : c.inkFaint }}>
              {focused === today ? 'Dziś' : weekday(focused)}
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 24, color: c.ink }}>{longDate(focused)}</Text>
          </View>
          <Arrow icon="chevron-forward" onPress={() => goto(index + 1)} />
        </View>

        {/* Saldo tygodnia — dotknij, by zobaczyć odbyte lekcje */}
        <Pressable
          onPress={() => router.push(`/saldo?d=${focused}`)}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
            pressed && { opacity: 0.7 },
          ]}>
          <Ionicons name="wallet-outline" size={18} color={c.sage} />
          <Text style={{ flex: 1, color: c.inkSoft, fontSize: 13 }}>Saldo tygodnia</Text>
          <Text style={{ color: c.ink, fontWeight: '700', fontFamily: fonts.mono, fontSize: 14 }}>{bal.earned} zł</Text>
          {bal.due > 0 && (
            <View style={{ backgroundColor: c.amberSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: c.amber, fontFamily: fonts.mono, fontSize: 11, fontWeight: '700' }}>−{bal.due} zł</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={c.inkFaint} />
        </Pressable>

        {focused !== today && (
          <Pressable onPress={() => goto(todayIndex)} style={{ alignSelf: 'center', marginTop: spacing.sm }}>
            <Text style={{ fontFamily: fonts.mono, color: c.accent, fontSize: 12 }}>● wróć do dziś</Text>
          </Pressable>
        )}
      </View>

      {/* Strony dni — przesuwanie palcem */}
      <FlatList
        ref={listRef}
        data={days}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d}
        initialScrollIndex={todayIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <DayPage
            date={item}
            width={width}
            today={today}
            lessons={lessons}
            bottomInset={insets.bottom}
            onOpen={(id) => router.push(`/lekcja/${id}`)}
            onTogglePaid={(l) => setPaid(l.id, !l.paid)}
          />
        )}
      />
    </View>
  );
}

function DayPage({
  date, width, today, lessons, bottomInset, onOpen, onTogglePaid,
}: {
  date: string; width: number; today: string; lessons: Lesson[]; bottomInset: number;
  onOpen: (id: string) => void; onTogglePaid: (l: Lesson) => void;
}) {
  const c = useColors();
  const dayLessons = lessons.filter((l) => l.date === date).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <View style={{ width }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: bottomInset + spacing.xxl * 2 }} showsVerticalScrollIndicator={false}>
        {dayLessons.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 2 }}>
            <Ionicons name="cafe-outline" size={30} color={c.inkFaint} />
            <Text style={{ color: c.inkFaint, fontSize: 13, marginTop: spacing.sm }}>Brak lekcji tego dnia.</Text>
          </View>
        ) : (
          dayLessons.map((lesson) => (
            <DayLessonCard
              key={lesson.id}
              lesson={lesson}
              isToday={date === today}
              onPress={() => onOpen(lesson.id)}
              onTogglePaid={() => onTogglePaid(lesson)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function DayLessonCard({
  lesson, isToday, onPress, onTogglePaid,
}: {
  lesson: Lesson; isToday: boolean; onPress: () => void; onTogglePaid: () => void;
}) {
  const c = useColors();
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const ongoing = isToday && lesson.status === 'planned' && now >= toMin(lesson.start) && now <= toMin(lesson.end);
  const accent = ongoing ? c.accent : statusTone(c, lesson.status).main;
  const attended = lesson.status === 'present' || lesson.status === 'late';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, borderLeftWidth: 3, borderLeftColor: accent, padding: spacing.md, marginTop: spacing.sm + 2 },
        pressed && { opacity: 0.75 },
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 50 }}>
          <Text style={{ color: c.ink, fontFamily: fonts.mono, fontWeight: '700', fontSize: 12 }}>{lesson.start}</Text>
          <Text style={{ color: c.inkSoft, fontFamily: fonts.mono, fontSize: 11 }}>{lesson.end}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.ink, fontWeight: '700', fontSize: 15 }}>{lesson.name}</Text>
          <Text style={{ color: c.inkSoft, fontSize: 13 }}>{lesson.subject} · {lesson.grade}</Text>
        </View>
        <AttendanceMark lesson={lesson} ongoing={ongoing} />
      </View>

      {/* Minęła, a nic nie zaznaczono → szybkie potwierdzenie */}
      {lesson.status === 'planned' && hasEnded(lesson) && <ConfirmActions lesson={lesson} />}

      {/* Ikonka opłacone/nieopłacone — tylko dla odbytych, dotknij by zmienić */}
      {attended && (
        <Pressable
          onPress={onTogglePaid}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.sm, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: lesson.paid ? c.sageSoft : c.amberSoft }}>
          <Ionicons name={lesson.paid ? 'checkmark-circle' : 'cash-outline'} size={14} color={lesson.paid ? c.sage : c.amber} />
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', color: lesson.paid ? c.sage : c.amber }}>
            {lesson.paid ? 'Opłacone' : 'Do zapłaty'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

/** Znacznik obecności po prawej stronie karty. */
function AttendanceMark({ lesson, ongoing }: { lesson: Lesson; ongoing: boolean }) {
  const c = useColors();
  if (ongoing) {
    return (
      <View style={{ backgroundColor: c.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
        <Text style={{ color: '#fff', fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700' }}>TERAZ</Text>
      </View>
    );
  }
  const dot = (bg: string, border: string, icon?: keyof typeof Ionicons.glyphMap, iconColor?: string, dashed?: boolean) => (
    <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: 1.5, borderStyle: dashed ? 'dashed' : 'solid', borderColor: border }}>
      {icon && <Ionicons name={icon} size={18} color={iconColor} />}
    </View>
  );
  if (lesson.status === 'present') return dot(c.sageSoft, c.sage, 'checkmark', c.sage);
  if (lesson.status === 'absent') return dot(c.roseSoft, c.rose, 'close', c.rose);
  if (lesson.status === 'cancelled') return dot(c.lineSoft, c.line, 'remove', c.inkFaint);
  return dot('transparent', c.line, undefined, c.inkFaint, true);
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
