import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, Header, PrimaryButton, Screen, SectionLabel, text } from '@/components/ui';
import { type AttendanceStatus } from '@/data/mock';
import { showAlert } from '@/lib/alert';
import { DAY_NAME } from '@/lib/schedule';
import { dayMonth } from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const OPTIONS: { key: AttendanceStatus; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'present', icon: 'checkmark', label: 'Odbyła się' },
  { key: 'absent', icon: 'person-remove-outline', label: 'Nieobecny' },
  { key: 'cancelled', icon: 'close', label: 'Odwołana' },
];

/** Szczegóły lekcji. Każda zmiana zapisuje się od razu. */
export default function LessonScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLesson, getStudent, updateLesson, deleteLesson } = useApp();

  const lesson = getLesson(id);
  const [note, setNote] = useState(lesson?.note ?? '');

  if (!lesson) {
    return (
      <Screen>
        <Header back title="Nie znaleziono" />
        <Text style={t.soft}>Ta lekcja nie istnieje.</Text>
      </Screen>
    );
  }

  const rate = getStudent(lesson.studentId)?.rate ?? lesson.rate;
  const held = lesson.status === 'present' || lesson.status === 'late';
  const saveNote = () => {
    if (note !== (lesson.note ?? '')) updateLesson(lesson.id, { note });
  };
  const done = () => {
    saveNote();
    router.back();
  };
  // Dotknięcie wybranego statusu jeszcze raz cofa go do „zaplanowana".
  const pick = (status: AttendanceStatus) =>
    updateLesson(lesson.id, status === lesson.status ? { status: 'planned', paid: false } : { status, ...(status === 'present' ? {} : { paid: false }) });

  const remove = () => {
    showAlert('Usunąć lekcję?', 'Tej lekcji nie będzie już w historii.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { deleteLesson(lesson.id); router.back(); } },
    ]);
  };

  return (
    <Screen>
      <Header
        back
        eyebrow={`${DAY_NAME[lesson.day]} ${dayMonth(lesson.date)} · ${lesson.start}–${lesson.end}`}
        title={lesson.name}
        right={
          lesson.slotId ? (
            <Pressable onPress={() => router.push(`/dodaj-lekcje?slot=${lesson.slotId}`)} hitSlop={8}>
              <Ionicons name="create-outline" size={22} color={c.accent} />
            </Pressable>
          ) : undefined
        }
      />

      <SectionLabel>CZY SIĘ ODBYŁA?</SectionLabel>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {OPTIONS.map((opt) => {
          const on = lesson.status === opt.key || (opt.key === 'present' && lesson.status === 'late');
          const col = opt.key === 'present' ? c.sage : c.rose;
          return (
            <Pressable
              key={opt.key}
              onPress={() => pick(opt.key)}
              style={({ pressed }) => [
                { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1.5, backgroundColor: on ? col + '22' : c.card, borderColor: on ? col : c.line },
                pressed && { opacity: 0.7 },
              ]}>
              <Ionicons name={opt.icon} size={20} color={on ? col : c.inkSoft} />
              <Text style={{ fontWeight: '700', fontSize: 12.5, color: on ? col : c.ink }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>PŁATNOŚĆ · {rate} ZŁ</SectionLabel>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[true, false].map((paid) => {
          const on = held && lesson.paid === paid;
          const col = paid ? c.sage : c.amber;
          return (
            <Pressable
              key={String(paid)}
              onPress={() => updateLesson(lesson.id, { paid })}
              style={({ pressed }) => [
                { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingVertical: spacing.md, borderWidth: 1.5, backgroundColor: on ? col + '22' : c.card, borderColor: on ? col : c.line },
                pressed && { opacity: 0.7 },
              ]}>
              <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={18} color={on ? col : c.inkSoft} />
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: on ? col : c.ink }}>{paid ? 'Opłacona' : 'Nieopłacona'}</Text>
            </Pressable>
          );
        })}
      </View>
      {!held && (
        <Text style={[t.soft, { marginTop: spacing.xs }]}>Zaznaczenie płatności oznacza też, że lekcja się odbyła.</Text>
      )}

      <SectionLabel>NOTATKA</SectionLabel>
      <Card style={{ padding: 0 }}>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={saveNote}
          placeholder="Co przerobiliście, co zadać na kolejny raz…"
          placeholderTextColor={c.inkFaint}
          multiline
          style={{ minHeight: 72, padding: spacing.md, fontSize: 14, color: c.ink, textAlignVertical: 'top' }}
        />
      </Card>

      <PrimaryButton label="Gotowe" onPress={done} />

      {/* Lekcje z grafiku się nie usuwa — można je oznaczyć jako „Odwołana". */}
      {!lesson.slotId && !lesson.virtual && (
        <Pressable onPress={remove} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: c.rose, fontWeight: '600', fontSize: 14, fontFamily: fonts.sans }}>Usuń lekcję</Text>
        </Pressable>
      )}
    </Screen>
  );
}
