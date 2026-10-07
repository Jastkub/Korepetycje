import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, SortChips, text } from '@/components/ui';
import { studentStats } from '@/lib/stats';
import { useApp } from '@/store/AppStore';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

type StudentSort = 'name' | 'recent' | 'rate' | 'lessons';

export default function StudentsScreen() {
  const c = useColors();
  const router = useRouter();
  const t = text(c);
  const { students, lessons, refresh } = useApp();
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

        {sorted.map((s) => (
          <Card key={s.id} onPress={() => router.push(`/uczen/${s.id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar student={s} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700', fontSize: 15 }}>{s.name}</Text>
                <Text style={t.soft}>
                  {s.subject} · {s.grade} · {studentStats(s, lessons).done} spotkań
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.inkFaint} />
            </View>
          </Card>
        ))}
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
