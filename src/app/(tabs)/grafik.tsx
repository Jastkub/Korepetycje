import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { type Slot } from '@/data/mock';
import { durationHours, todayISO, weekday } from '@/lib/dates';
import { DAY_NAME, WEEK } from '@/lib/schedule';
import { useApp } from '@/store/AppStore';
import { studentTone } from '@/theme/studentColors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Grafik tygodniowy: jeden stały plan, bez dat. Wpis „Pon 15:00" oznacza
 * lekcję w każdy poniedziałek o 15:00.
 */
export default function ScheduleScreen() {
  const c = useColors();
  const router = useRouter();
  const { slots, students, refresh } = useApp();
  const todayDay = weekday(todayISO());

  const studentOf = (id: string) => students.find((s) => s.id === id);
  const hours = slots.reduce((sum, s) => sum + durationHours(s.start, s.end), 0);
  const income = slots.reduce((sum, s) => sum + (studentOf(s.studentId)?.rate ?? 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={refresh}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: c.ink }}>Grafik</Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: c.inkFaint, marginBottom: spacing.lg }}>
          {slots.length} {slots.length === 1 ? 'lekcja' : 'lekcji'} w tygodniu · {hours.toLocaleString('pl-PL')} h · {income} zł
        </Text>

        {WEEK.map((day) => {
          const daySlots = slots.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
          const isToday = day === todayDay;
          return (
            <View key={day} style={{ paddingVertical: spacing.sm + 2, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: daySlots.length ? spacing.sm : 0 }}>
                <Text style={{ flex: 1, fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: isToday ? c.accent : c.inkFaint, fontWeight: isToday ? '700' : '400' }}>
                  {DAY_NAME[day]}{isToday ? ' · dziś' : ''}
                </Text>
                <Pressable onPress={() => router.push(`/dodaj-lekcje?day=${day}`)} hitSlop={10}>
                  <Ionicons name="add-circle-outline" size={20} color={c.inkFaint} />
                </Pressable>
              </View>
              <View style={{ gap: spacing.sm }}>
                {daySlots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} onPress={() => router.push(`/dodaj-lekcje?slot=${slot.id}`)} />
                ))}
              </View>
            </View>
          );
        })}
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

function SlotCard({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const c = useColors();
  const { getStudent } = useApp();
  const student = getStudent(slot.studentId);
  const tone = studentTone(student?.color ?? '');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderLeftWidth: 4, borderLeftColor: tone.main },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={{ width: 48 }}>
        <Text style={{ color: c.ink, fontFamily: fonts.mono, fontWeight: '700', fontSize: 12.5 }}>{slot.start}</Text>
        <Text style={{ color: c.inkSoft, fontFamily: fonts.mono, fontSize: 11 }}>{slot.end}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>{student?.name ?? '—'}</Text>
        <Text style={{ color: c.inkSoft, fontSize: 12.5 }} numberOfLines={1}>
          {student ? `${student.subject} · ${student.grade} · ${student.rate} zł` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.inkFaint} />
    </Pressable>
  );
}
