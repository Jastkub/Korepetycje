import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { dayMonth, weekday } from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const isUnpaidDone = (l: { status: string; paid: boolean }) =>
  (l.status === 'present' || l.status === 'late') && !l.paid;

export default function PaymentsScreen() {
  const c = useColors();
  const t = text(c);
  const { students, lessons, setPaid, refresh } = useApp();

  const rateOf = (id: string) => students.find((s) => s.id === id)?.rate ?? 0;
  const studentOf = (id: string) => students.find((s) => s.id === id);

  // „Zamrożona" lista na czas wizyty w zakładce: ustalamy ją przy wejściu.
  // Dzięki temu po oznaczeniu „Opłacono" wiersz zostaje (na wypadek przypadkowego
  // kliknięcia) aż do wyjścia i powrotu do zakładki.
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      const ids = lessonsRef.current
        .filter(isUnpaidDone)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
        .map((l) => l.id);
      setFrozenIds(ids);
    }, []),
  );

  const rows = frozenIds.map((id) => lessons.find((l) => l.id === id)).filter(Boolean) as typeof lessons;

  // Suma liczona na żywo z aktualnie nieopłaconych — maleje, gdy oznaczasz.
  const total = lessons.filter(isUnpaidDone).reduce((sum, l) => sum + rateOf(l.studentId), 0);

  return (
    <Screen onRefresh={refresh}>
      <Header eyebrow="Rozliczenia" title="Do zapłaty" />

      <View style={{ backgroundColor: total > 0 ? c.amberSoft : c.sageSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: total > 0 ? c.amber : c.sage }}>
          Łącznie do zapłaty
        </Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 40, fontWeight: '600', color: total > 0 ? c.amber : c.sage }}>
          {total} zł
        </Text>
      </View>

      {rows.length === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="checkmark-circle" size={22} color={c.sage} />
            <Text style={[t.body, { flex: 1 }]}>Wszystko opłacone. 🎉</Text>
          </View>
        </Card>
      ) : (
        <>
          <SectionLabel>{rows.length} {rows.length === 1 ? 'LEKCJA' : 'LEKCJE'}</SectionLabel>
          {rows.map((l) => {
            const s = studentOf(l.studentId);
            const paid = l.paid;
            return (
              <Card key={l.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: paid ? 0.6 : 1 }}>
                  {s && <Avatar student={s} size={38} />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{l.name}</Text>
                    <Text style={t.soft}>
                      {weekday(l.date)} {dayMonth(l.date)} · {l.start} · {rateOf(l.studentId)} zł
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setPaid(l.id, !paid)}
                    hitSlop={6}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: paid ? c.sageSoft : c.amberSoft },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Ionicons name={paid ? 'checkmark-circle' : 'cash-outline'} size={15} color={paid ? c.sage : c.amber} />
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', color: paid ? c.sage : c.amber }}>
                      {paid ? 'Opłacono' : 'Do opłacenia'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
