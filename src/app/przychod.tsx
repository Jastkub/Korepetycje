import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { dayMonth, monthKey, monthLabel, thisMonthKey, weekday } from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function IncomeScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { m } = useLocalSearchParams<{ m?: string }>();
  const { students, lessons } = useApp();

  const month = m ?? thisMonthKey();
  const rateOf = (id: string) => students.find((s) => s.id === id)?.rate ?? 0;
  const studentOf = (id: string) => students.find((s) => s.id === id);

  const attended = lessons
    .filter((l) => l.date && monthKey(l.date) === month && (l.status === 'present' || l.status === 'late'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const total = attended.reduce((sum, l) => sum + rateOf(l.studentId), 0);

  return (
    <Screen>
      <Header back eyebrow={monthLabel(month)} title="Przychód" />

      <View style={{ backgroundColor: c.sageSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.sage }}>
          Przychód z odbytych lekcji
        </Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 40, fontWeight: '600', color: c.sage }}>{total} zł</Text>
      </View>

      <SectionLabel>SKŁADA SIĘ Z ({attended.length})</SectionLabel>
      {attended.length === 0 ? (
        <Card>
          <Text style={t.soft}>Brak odbytych lekcji w tym miesiącu.</Text>
        </Card>
      ) : (
        attended.map((l) => {
          const s = studentOf(l.studentId);
          return (
            <Card key={l.id} onPress={() => router.push(`/lekcja/${l.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {s && <Avatar student={s} size={36} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{l.name}</Text>
                  <Text style={t.soft}>
                    {weekday(l.date)} {dayMonth(l.date)} · {l.start}–{l.end}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ color: c.ink, fontFamily: fonts.mono, fontWeight: '700', fontSize: 14 }}>{rateOf(l.studentId)} zł</Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', color: l.paid ? c.sage : c.amber }}>
                    {l.paid ? 'opłacone' : 'do zapłaty'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
