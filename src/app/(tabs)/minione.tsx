import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { type Lesson } from '@/data/mock';
import { dayMonth, todayISO, weekday } from '@/lib/dates';
import { DAY_NAME, pendingLessons } from '@/lib/schedule';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * MINIONE — lekcje z grafiku, które już się odbyły (wg planu), a nie zaznaczono
 * jeszcze, czy zapłacono. Jedno dotknięcie: opłacone / nieopłacone / nie było.
 */
export default function PastScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { lessons, getLesson, getStudent, updateLesson, refresh } = useApp();

  // Lista „zamrożona" na czas wizyty w zakładce: potwierdzona lekcja zostaje
  // na ekranie (z możliwością cofnięcia) aż do ponownego wejścia.
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFrozenIds(pendingLessons(lessonsRef.current).map((l) => l.id));
    }, []),
  );

  const rows = frozenIds.map((id) => getLesson(id)).filter(Boolean) as Lesson[];
  const left = pendingLessons(lessons).length;

  // Grupowanie po dacie (lista jest już posortowana od najnowszych).
  const groups: { date: string; items: Lesson[] }[] = [];
  for (const l of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === l.date) last.items.push(l);
    else groups.push({ date: l.date, items: [l] });
  }

  const today = todayISO();

  return (
    <Screen onRefresh={refresh}>
      <Header eyebrow="Do potwierdzenia" title="Minione lekcje" />

      <View style={{ backgroundColor: left > 0 ? c.indigoSoft : c.sageSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: left > 0 ? c.indigo : c.sage }}>
          Czeka na potwierdzenie
        </Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 40, fontWeight: '600', color: left > 0 ? c.indigo : c.sage }}>{left}</Text>
        <Text style={[t.soft, { textAlign: 'center' }]}>Zaznacz, czy lekcja została opłacona.</Text>
      </View>

      {rows.length === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="checkmark-circle" size={22} color={c.sage} />
            <Text style={[t.body, { flex: 1 }]}>Wszystkie minione lekcje są potwierdzone.</Text>
          </View>
        </Card>
      ) : (
        groups.map((g) => (
          <View key={g.date}>
            <SectionLabel>
              {g.date === today ? 'Dziś' : DAY_NAME[weekday(g.date)]} · {dayMonth(g.date)}
            </SectionLabel>
            {g.items.map((l) => {
              const s = getStudent(l.studentId);
              return (
                <Card key={l.id} onPress={() => router.push(`/lekcja/${l.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    {s && <Avatar student={s} size={38} />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14.5 }}>{l.name}</Text>
                      <Text style={t.soft}>
                        {l.start}–{l.end} · {s?.rate ?? l.rate} zł
                      </Text>
                    </View>
                  </View>
                  {l.status === 'planned' ? (
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                      <Choice icon="checkmark-circle" label="Opłacone" fg={c.sage} bg={c.sageSoft} onPress={() => updateLesson(l.id, { status: 'present', paid: true })} />
                      <Choice icon="cash-outline" label="Nieopłacone" fg={c.amber} bg={c.amberSoft} onPress={() => updateLesson(l.id, { status: 'present', paid: false })} />
                      <Choice icon="close-circle-outline" label="Nie było" fg={c.inkSoft} bg={c.lineSoft} onPress={() => updateLesson(l.id, { status: 'cancelled', paid: false })} />
                    </View>
                  ) : (
                    <Done lesson={l} onUndo={() => updateLesson(l.id, { status: 'planned', paid: false })} />
                  )}
                </Card>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

function Choice({
  icon, label, fg, bg, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; fg: string; bg: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: bg },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Wynik po potwierdzeniu + „Cofnij" (na wypadek pomyłki). */
function Done({ lesson, onUndo }: { lesson: Lesson; onUndo: () => void }) {
  const c = useColors();
  const held = lesson.status === 'present' || lesson.status === 'late';
  const label = !held ? 'Nie odbyła się' : lesson.paid ? 'Opłacone' : 'Nieopłacone — w „Do zapłaty"';
  const color = !held ? c.inkSoft : lesson.paid ? c.sage : c.amber;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
      <Ionicons name="checkmark-done" size={16} color={color} />
      <Text style={{ flex: 1, color, fontFamily: fonts.mono, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
      <Pressable onPress={onUndo} hitSlop={8}>
        <Text style={{ color: c.accent, fontFamily: fonts.mono, fontSize: 11.5 }}>Cofnij</Text>
      </Pressable>
    </View>
  );
}
