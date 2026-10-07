import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';

import { Card, Header, Progress, Screen, SectionLabel, STATUS_LABEL, statusTone, text } from '@/components/ui';
import { dayMonth, todayISO, weekday } from '@/lib/dates';
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
  const { getStudent, lessons, slots, toggleHomework, addHomework, deleteHomework, setMaterialProgress } = useApp();
  const student = getStudent(id);
  const today = todayISO();
  const studentSlots = slots
    .filter((x) => x.studentId === id)
    .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day) || a.start.localeCompare(b.start));
  // Historia: lekcje do dziś (przyszłe wynikają z grafiku).
  const studentLessons = lessons
    .filter((l) => l.studentId === id && l.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));

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
      `Materiał: ${student.materialTitle} (${student.materialProgress}%)`,
      stats.due > 0 ? `Do zapłaty: ${stats.due} zł` : `Rozliczenie: na bieżąco`,
      todo.length ? `\nPrace domowe:\n${todo.join('\n')}` : ``,
    ];
    Share.share({ message: lines.filter(Boolean).join('\n') });
  };

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
        <Stat value={`${stats.done}`} label="ODBYTE" />
        <Stat value={stats.attendance === null ? '—' : `${stats.attendance}%`} label="FREKWENCJA" color={c.sage} />
        <Stat value={`${student.rate}zł`} label="STAWKA" />
      </View>

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
        <KV k={student.contactLabel} v={student.contact} last />
      </Card>

      <SectionLabel>MATERIAŁ · {student.materialTitle.toUpperCase()}</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.ink, fontSize: 13 }}>Postęp działu</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Stepper label="−" onPress={() => setMaterialProgress(student.id, student.materialProgress - 10)} />
            <Text style={{ color: c.ink, fontSize: 13, fontWeight: '700', width: 44, textAlign: 'center' }}>
              {student.materialProgress}%
            </Text>
            <Stepper label="+" onPress={() => setMaterialProgress(student.id, student.materialProgress + 10)} />
          </View>
        </View>
        <Progress value={student.materialProgress} color={accent} />
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

      <SectionLabel
        right={
          <Pressable onPress={() => router.push('/dodaj-lekcje')} hitSlop={8}>
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

      <SectionLabel>HISTORIA LEKCJI</SectionLabel>
      <Card>
        {studentLessons.length === 0 && (
          <Text style={{ color: c.inkFaint, fontSize: 13 }}>Brak minionych lekcji.</Text>
        )}
        {studentLessons.map((l, i) => {
          const st = statusTone(c, l.status);
          return (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/lekcja/${l.id}`)}
              style={{
                paddingVertical: spacing.sm,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.lineSoft,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '600' }}>
                  {weekday(l.date)} {dayMonth(l.date)} · {l.start}–{l.end}
                </Text>
                <View style={{ backgroundColor: st.soft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill }}>
                  <Text style={{ color: st.main, fontSize: 10.5, fontWeight: '700', fontFamily: fonts.mono }}>
                    {STATUS_LABEL[l.status]}
                  </Text>
                </View>
              </View>
              {l.note ? (
                <Text style={{ color: c.inkSoft, fontSize: 12.5, marginTop: 4 }} numberOfLines={2}>
                  „{l.note}"
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: 30,
          height: 30,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.paper,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>{label}</Text>
    </Pressable>
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
