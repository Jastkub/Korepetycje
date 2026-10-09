import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/lesson-actions';
import { Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import { showAlert } from '@/lib/alert';
import { DAY_NAME, WEEK } from '@/lib/schedule';
import { studentStats } from '@/lib/stats';
import { useApp } from '@/store/AppStore';
import { studentTone } from '@/theme/studentColors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function StudentProfile() {
  const c = useColors();
  const t = text(c);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getStudent, lessons, slots, toggleHomework, addHomework, deleteHomework, updateLessons } = useApp();
  const student = getStudent(id);
  const studentSlots = slots
    .filter((x) => x.studentId === id)
    .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day) || a.start.localeCompare(b.start));

  // Pola nowej pracy domowej (treść + termin).
  const [hwText, setHwText] = useState('');
  const [hwDue, setHwDue] = useState('');

  if (!student) {
    return (
      <Screen>
        <Header back title="Nie znaleziono" />
        <Text style={t.soft}>Ten uczeń nie istnieje.</Text>
      </Screen>
    );
  }

  const stats = studentStats(student, lessons);
  const accent = studentTone(student.color).main; // kolor ucznia w jego interfejsie

  // Udostępnij podsumowanie (np. rodzicowi) przez systemowe „Udostępnij".
  const share = () => {
    const todo = student.homework.filter((h) => !h.done).map((h) => `• ${h.text} (${h.due})`);
    const lines = [
      `${student.name} — podsumowanie`,
      `${student.subject} · klasa ${student.grade}`,
      ``,
      `Odbyte spotkania: ${stats.done}`,
      stats.attendance === null ? `Frekwencja: —` : `Frekwencja: ${stats.attendance}%`,
      stats.due > 0 ? `Do zapłaty: ${stats.due} zł` : `Rozliczenie: na bieżąco`,
      todo.length ? `\nPrace domowe:\n${todo.join('\n')}` : ``,
    ];
    Share.share({ message: lines.filter(Boolean).join('\n') });
  };

  const unpaid = lessons.filter((l) => l.studentId === id && (l.status === 'present' || l.status === 'late') && !l.paid);
  const settle = () =>
    showAlert('Rozliczyć?', `${unpaid.length} nieopłaconych lekcji · ${stats.due} zł zostanie oznaczone jako opłacone.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Rozlicz', onPress: () => updateLessons(unpaid.map((l) => l.id), { paid: true }) },
    ]);

  // Kontakt: jeśli to numer telefonu — przyciski „Zadzwoń" i „SMS".
  const phone = student.contact.replace(/[^\d+]/g, '');
  const isPhone = phone.replace('+', '').length >= 7;

  return (
    <Screen>
      <Header
        back
        eyebrow="Profil ucznia"
        title={student.name}
        right={
          <Pressable onPress={share} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={accent} />
          </Pressable>
        }
      />

      {/* Trzy kafelki statystyk */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Stat value={`${student.rate} zł`} label="STAWKA" />
        <Stat value={`${stats.done}`} label="ODBYTE" />
        <Stat value={`${stats.due} zł`} label="DO ZAPŁATY" color={stats.due > 0 ? c.amber : c.sage} />
      </View>
      {stats.due > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <Chip icon="checkmark-done" label={`Rozlicz ${stats.due} zł`} fg="#fff" bg={c.sage} onPress={settle} />
        </View>
      )}

      <SectionLabel
        right={
          <Pressable onPress={() => router.push(`/dodaj-ucznia?id=${student.id}`)} hitSlop={8}>
            <Text style={[t.mono, { color: accent }]}>Edytuj</Text>
          </Pressable>
        }>
        CECHY
      </SectionLabel>
      <Card>
        <KV k="Klasa" v={student.grade} />
        <KV k="Przedmiot" v={student.subject} />
        <KV k={student.contactLabel} v={student.contact || '—'} last />
        {isPhone && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Chip icon="call-outline" label="Zadzwoń" fg={accent} bg={c.lineSoft} onPress={() => Linking.openURL(`tel:${phone}`)} />
            <Chip icon="chatbubble-outline" label="SMS" fg={accent} bg={c.lineSoft} onPress={() => Linking.openURL(`sms:${phone}`)} />
          </View>
        )}
      </Card>

      <SectionLabel
        right={
          <Pressable onPress={() => router.push(`/dodaj-lekcje?student=${student.id}`)} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={18} color={accent} />
          </Pressable>
        }>
        STAŁE TERMINY
      </SectionLabel>
      <Card>
        {studentSlots.length === 0 && (
          <Text style={{ color: c.inkFaint, fontSize: 13 }}>Brak terminu w grafiku tygodniowym.</Text>
        )}
        {studentSlots.map((x, i) => (
          <Pressable
            key={x.id}
            onPress={() => router.push(`/dodaj-lekcje?slot=${x.id}`)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.lineSoft }}>
            <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '600' }}>{DAY_NAME[x.day]}</Text>
            <Text style={{ color: c.inkSoft, fontSize: 13.5, fontFamily: fonts.mono }}>{x.start}–{x.end}</Text>
          </Pressable>
        ))}
      </Card>

      <SectionLabel>PRACE DOMOWE</SectionLabel>
      <Card>
        {student.homework.length === 0 && (
          <Text style={{ color: c.inkFaint, fontSize: 13 }}>Brak zadań domowych.</Text>
        )}
        {student.homework.map((h, i) => (
          <Pressable
            key={h.id}
            onPress={() => toggleHomework(student.id, h.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.sm,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: c.lineSoft,
            }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: h.done ? c.sage : 'transparent',
                borderColor: h.done ? c.sage : c.line,
              }}>
              {h.done && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 13.5,
                color: h.done ? c.inkFaint : c.ink,
                textDecorationLine: h.done ? 'line-through' : 'none',
              }}>
              {h.text}
            </Text>
            <Text style={[t.mono, { fontSize: 10.5 }]}>{h.due}</Text>
            <Pressable onPress={() => deleteHomework(student.id, h.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={c.inkFaint} />
            </Pressable>
          </Pressable>
        ))}

        {/* Wiersz dodawania nowej pracy domowej */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: c.lineSoft,
          }}>
          <TextInput
            value={hwText}
            onChangeText={setHwText}
            placeholder="Nowe zadanie…"
            placeholderTextColor={c.inkFaint}
            style={{ flex: 1, fontSize: 13.5, color: c.ink, paddingVertical: spacing.xs }}
          />
          <TextInput
            value={hwDue}
            onChangeText={setHwDue}
            placeholder="termin"
            placeholderTextColor={c.inkFaint}
            style={{
              width: 64,
              fontSize: 12,
              color: c.ink,
              fontFamily: fonts.mono,
              textAlign: 'center',
            }}
          />
          <Pressable
            onPress={() => {
              addHomework(student.id, hwText, hwDue);
              setHwText('');
              setHwDue('');
            }}
            hitSlop={8}>
            <Ionicons name="add-circle" size={26} color={accent} />
          </Pressable>
        </View>
      </Card>

    </Screen>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
      }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: color ?? c.ink }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: c.inkFaint, marginTop: 5, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function KV({ k, v, last }: { k: string; v: string; last?: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm - 1,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.lineSoft,
      }}>
      <Text style={{ color: c.inkSoft, fontSize: 13 }}>{k}</Text>
      <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>{v}</Text>
    </View>
  );
}
