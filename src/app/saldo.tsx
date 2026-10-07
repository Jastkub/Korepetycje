import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { addDays, dayMonth, todayISO, weekday, weekRange, weekStartISO } from '@/lib/dates';
import { weekBalance } from '@/lib/stats';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function SaldoScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const { students, lessons } = useApp();

  const anchor = d ?? todayISO();
  const start = weekStartISO(anchor);
  const end = addDays(start, 6);
  const rateOf = (id: string) => students.find((s) => s.id === id)?.rate ?? 0;
  const studentOf = (id: string) => students.find((s) => s.id === id);

  const attended = lessons
    .filter((l) => l.date >= start && l.date <= end && (l.status === 'present' || l.status === 'late'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const bal = weekBalance(anchor, lessons, students);

  return (
    <Screen>
      <Header back eyebrow={`Tydzień ${weekRange(start)}`} title="Saldo" />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ flex: 1, backgroundColor: c.sageSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.5, color: c.sage }}>ZAROBIONE</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: '600', color: c.sage }}>{bal.earned} zł</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: bal.due > 0 ? c.amberSoft : c.lineSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.5, color: bal.due > 0 ? c.amber : c.inkFaint }}>DO ZAPŁATY</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: '600', color: bal.due > 0 ? c.amber : c.inkFaint }}>{bal.due} zł</Text>
        </View>
      </View>

      <SectionLabel>ODBYTE LEKCJE ({attended.length})</SectionLabel>
      {attended.length === 0 ? (
        <Card>
          <Text style={t.soft}>W tym tygodniu nie ma jeszcze odbytych lekcji.</Text>
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
