import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SortChips, text } from '@/components/ui';
import { WEEK } from '@/lib/schedule';
import { studentStats } from '@/lib/stats';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

type StudentSort = 'name' | 'recent' | 'rate' | 'lessons';

export default function StudentsScreen() {
  const c = useColors();
  const router = useRouter();
  const t = text(c);
  const { students, lessons, slots, refresh } = useApp();

  // Stałe terminy ucznia w skrócie, np. „Pon 15:00 · Czw 17:30".
  const slotsLabel = (id: string) =>
    slots
      .filter((x) => x.studentId === id)
      .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day) || a.start.localeCompare(b.start))
      .map((x) => `${x.day} ${x.start}`)
      .join(' · ');
  const [sort, setSort] = useState<StudentSort>('name');

  // Data ostatniej odbytej lekcji ucznia ('' gdy brak).
  const lastAttended = (id: string) =>
    lessons
      .filter((l) => l.studentId === id && (l.status === 'present' || l.status === 'late'))
      .reduce((mx, l) => (l.date > mx ? l.date : mx), '');

  const sorted = [...students].sort((a, b) => {
    if (sort === 'rate') return b.rate - a.rate;
    if (sort === 'lessons') return studentStats(b, lessons).done - studentStats(a, lessons).done;
    if (sort === 'recent') return lastAttended(b.id).localeCompare(lastAttended(a.id));
    return a.name.localeCompare(b.name, 'pl');
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={refresh}>
        <Header eyebrow={students.length === 0 ? 'brak uczniów' : `${students.length} aktywnych`} title="Uczniowie" />

        {students.length === 0 && (
          <Card>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
              Nie masz jeszcze uczniów
            </Text>
            <Text style={t.soft}>Dodaj pierwszego przyciskiem „+" w prawym dolnym rogu.</Text>
          </Card>
        )}

        {students.length > 0 && (
          <SortChips<StudentSort>
            value={sort}
            onChange={setSort}
            options={[
              { key: 'name', label: 'A–Z' },
              { key: 'recent', label: 'Ostatnie' },
              { key: 'rate', label: 'Stawka' },
              { key: 'lessons', label: 'Spotkania' },
            ]}
          />
        )}

        {sorted.map((s) => {
          const due = studentStats(s, lessons).due;
          const when = slotsLabel(s.id);
          return (
            <Card key={s.id} onPress={() => router.push(`/uczen/${s.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar student={s} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontWeight: '700', fontSize: 15 }}>{s.name}</Text>
                  <Text style={t.soft} numberOfLines={1}>{s.subject} · {s.grade}</Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: when ? c.indigo : c.inkFaint, marginTop: 2 }} numberOfLines={1}>
                    {when || 'brak terminu w grafiku'}
                  </Text>
                </View>
                {due > 0 && (
                  <View style={{ backgroundColor: c.amberSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: c.amber, fontFamily: fonts.mono, fontSize: 11, fontWeight: '700' }}>{due} zł</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={c.inkFaint} />
              </View>
            </Card>
          );
        })}
      </Screen>

      {/* Pływający przycisk dodawania */}
      <Pressable
        onPress={() => router.push('/dodaj-ucznia')}
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
