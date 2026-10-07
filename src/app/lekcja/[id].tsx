import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, Header, Pill, PrimaryButton, Screen, SectionLabel, text } from '@/components/ui';
import { type AttendanceStatus } from '@/data/mock';
import { dayMonth, weekday } from '@/lib/dates';
import { useApp } from '@/store/AppStore';
import { radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';
import { showAlert } from '@/lib/alert';

const OPTIONS: { key: AttendanceStatus; emoji: string; label: string }[] = [
  { key: 'present', emoji: '✓', label: 'Był(a)' },
  { key: 'absent', emoji: '✕', label: 'Nieobecny' },
  { key: 'cancelled', emoji: '⊘', label: 'Odwołane' },
];

export default function LessonScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLesson, setAttendance, setPaid, deleteLesson } = useApp();

  const lesson = getLesson(id);

  const remove = () => {
    showAlert('Usunąć lekcję?', 'Tej lekcji nie będzie już w grafiku.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { deleteLesson(id); router.back(); } },
    ]);
  };

  // Stan lokalny: który status jest wybrany (startuje od zapisanego w danych).
  const [status, setStatus] = useState<AttendanceStatus>(lesson?.status ?? 'planned');
  const [note, setNote] = useState(lesson?.note ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const ok = await setAttendance(id, status, note);
    setBusy(false);
    if (ok) router.back();
  };

  if (!lesson) {
    return (
      <Screen>
        <Header back title="Nie znaleziono" />
        <Text style={t.soft}>Ta lekcja nie istnieje.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        back
        eyebrow={`${weekday(lesson.date)} ${dayMonth(lesson.date)} · ${lesson.start}–${lesson.end}`}
        title={`Lekcja · ${lesson.name}`}
        right={
          lesson.slotId ? (
            <Pressable onPress={() => router.push(`/dodaj-lekcje?slot=${lesson.slotId}`)} hitSlop={8}>
              <Text style={[t.mono, { color: c.accent, fontSize: 11 }]}>Termin w grafiku</Text>
            </Pressable>
          ) : undefined
        }
      />

      <SectionLabel>OBECNOŚĆ</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 }}>
        {OPTIONS.map((opt) => {
          const selected = status === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setStatus(opt.key)}
              style={{
                width: '47.5%',
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                borderWidth: 1.5,
                backgroundColor: selected ? c.sageSoft : c.card,
                borderColor: selected ? c.sage : c.line,
              }}>
              <Text style={{ fontSize: 20, marginBottom: 5, color: selected ? c.sage : c.inkSoft }}>
                {opt.emoji}
              </Text>
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: selected ? c.sage : c.ink }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>ROZLICZENIE</SectionLabel>
      <Card>
        <Row k="Do zapłaty" v={`${lesson.rate} zł`} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: c.lineSoft,
          }}>
          <Text style={{ color: c.inkSoft, fontSize: 13 }}>Status (dotknij, by zmienić)</Text>
          <Pressable onPress={() => setPaid(id, !lesson.paid)} hitSlop={8}>
            <Pill tone={lesson.paid ? 'sage' : 'amber'}>{lesson.paid ? 'Opłacone' : 'Nieopłacone'}</Pill>
          </Pressable>
        </View>
      </Card>

      <SectionLabel>NOTATKA Z LEKCJI</SectionLabel>
      <Card style={{ padding: 0 }}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Co przerobiliście, co zadać na kolejny raz…"
          placeholderTextColor={c.inkFaint}
          multiline
          style={{
            minHeight: 72,
            padding: spacing.md,
            fontSize: 14,
            color: c.ink,
            textAlignVertical: 'top',
          }}
        />
      </Card>

      <PrimaryButton label="Zapisz lekcję" onPress={save} loading={busy} />

      {/* Lekcje z grafiku się nie usuwa — można je oznaczyć jako „Odwołane". */}
      {!lesson.slotId && (
        <Pressable onPress={remove} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: c.rose, fontWeight: '600', fontSize: 14 }}>Usuń lekcję</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.sm }}>
      <Text style={{ color: c.inkSoft, fontSize: 13 }}>{k}</Text>
      <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>{v}</Text>
    </View>
  );
}
