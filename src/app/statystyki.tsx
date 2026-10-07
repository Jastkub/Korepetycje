import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SectionLabel, SortChips, text } from '@/components/ui';
import { addMonths, durationHours, monthKey, monthLabel, thisMonthKey } from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Ładna liczba godzin: 12.5 -> "12,5". */
function hrs(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export default function StatsScreen() {
  const c = useColors();
  const t = text(c);
  const { students, lessons } = useApp();
  const router = useRouter();
  const [month, setMonth] = useState(() => thisMonthKey());
  const [sort, setSort] = useState<'name' | 'amount' | 'count'>('amount');

  const monthLessons = lessons.filter((l) => l.date && monthKey(l.date) === month);
  const attended = monthLessons.filter((l) => l.status === 'present' || l.status === 'late');

  // Kwoty liczymy z AKTUALNEJ stawki ucznia (nie ze stawki zapisanej w lekcji).
  const rateOf = (studentId: string) => students.find((s) => s.id === studentId)?.rate ?? 0;
  const income = attended.reduce((sum, l) => sum + rateOf(l.studentId), 0);
  const due = attended.filter((l) => !l.paid).reduce((sum, l) => sum + rateOf(l.studentId), 0);
  const hours = attended.reduce((sum, l) => sum + durationHours(l.start, l.end), 0);

  // Frekwencja: odbyte / (odbyte + nieobecne + spóźnione)
  const counted = monthLessons.filter((l) => ['present', 'absent', 'late'].includes(l.status));
  const attendancePct = counted.length ? Math.round((attended.length / counted.length) * 100) : null;

  // Rozbicie na uczniów (tylko ci z lekcjami w tym miesiącu)
  const perStudent = students
    .map((s) => {
      const own = attended.filter((l) => l.studentId === s.id);
      return {
        student: s,
        count: own.length,
        amount: own.length * s.rate,
        dueAmount: own.filter((l) => !l.paid).length * s.rate,
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => {
      if (sort === 'amount') return b.amount - a.amount;
      if (sort === 'count') return b.count - a.count;
      return a.student.name.localeCompare(b.student.name, 'pl');
    });

  return (
    <Screen>
      <Header back eyebrow="Podsumowanie" title="Statystyki" />

      {/* Wybór miesiąca */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Arrow icon="chevron-back" onPress={() => setMonth(addMonths(month, -1))} />
        <Text style={{ flex: 1, textAlign: 'center', color: c.ink, fontSize: 15, fontWeight: '700' }}>
          {monthLabel(month)}
        </Text>
        <Arrow icon="chevron-forward" onPress={() => setMonth(addMonths(month, 1))} />
      </View>

      {/* Kafelki */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Tile value={`${income}`} unit="zł" label="PRZYCHÓD ›" color={c.sage} onPress={() => router.navigate(`/przychod?m=${month}`)} />
        <Tile value={`${due}`} unit="zł" label="DO ZAPŁATY ›" color={due > 0 ? c.amber : c.inkSoft} onPress={() => router.navigate('/platnosci')} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile value={hrs(hours)} unit="h" label="GODZINY" />
        <Tile value={`${attended.length}`} label="ODBYTE LEKCJE" />
        <Tile value={attendancePct === null ? '—' : `${attendancePct}`} unit={attendancePct === null ? '' : '%'} label="FREKWENCJA" />
      </View>

      <SectionLabel>WEDŁUG UCZNIÓW</SectionLabel>
      {perStudent.length > 0 && (
        <SortChips
          value={sort}
          onChange={setSort}
          options={[
            { key: 'amount', label: 'Kwota' },
            { key: 'count', label: 'Lekcje' },
            { key: 'name', label: 'A–Z' },
          ]}
        />
      )}
      {perStudent.length === 0 ? (
        <Card>
          <Text style={t.soft}>Brak odbytych lekcji w tym miesiącu.</Text>
        </Card>
      ) : (
        perStudent.map((r) => (
          <Card key={r.student.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar student={r.student} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{r.student.name}</Text>
                <Text style={t.soft}>
                  {r.count} {r.count === 1 ? 'lekcja' : 'lekcje'}
                  {r.dueAmount > 0 ? ` · do zapłaty ${r.dueAmount} zł` : ' · opłacone'}
                </Text>
              </View>
              <Text style={{ color: c.ink, fontWeight: '700', fontFamily: fonts.mono, fontSize: 14 }}>
                {r.amount} zł
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function Tile({ value, unit, label, color, onPress }: { value: string; unit?: string; label: string; color?: string; onPress?: () => void }) {
  const c = useColors();
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: onPress ? c.accent : c.line,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
      }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: '600', color: color ?? c.ink }}>
        {value}
        {unit ? <Text style={{ fontSize: 13 }}> {unit}</Text> : null}
      </Text>
      <Text style={{ fontSize: 9.5, color: c.inkFaint, marginTop: 5, letterSpacing: 0.3, textAlign: 'center' }}>
        {label}
      </Text>
    </Wrap>
  );
}

function Arrow({ icon, onPress }: { icon: 'chevron-back' | 'chevron-forward'; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { opacity: 0.6 },
      ]}>
      <Ionicons name={icon} size={18} color={c.inkSoft} />
    </Pressable>
  );
}
