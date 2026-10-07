import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Screen, text } from '@/components/ui';
import { SUBJECTS } from '@/data/mock';
import { useApp } from '@/store/AppStore';
import { DEFAULT_STUDENT_COLOR, PALETTES, studentTone } from '@/theme/studentColors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

// 3 najczęstsze przedmioty pokazywane od razu; reszta pod „…".
const TOP_SUBJECTS = ['Matematyka', 'Język angielski', 'Fizyka'];

/**
 * Ekran robi DWIE rzeczy zależnie od tego, czy dostał `id`:
 *  - bez `id`  -> dodawanie nowego ucznia
 *  - z `id`    -> edycja istniejącego (pola wypełnione, można usunąć)
 */
export default function StudentForm() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getStudent, addStudent, updateStudent, deleteStudent } = useApp();

  const editing = !!id;
  const existing = id ? getStudent(id) : undefined;

  // Wartości początkowe: przy edycji z istniejącego ucznia, inaczej puste.
  const [name, setName] = useState(existing?.name ?? '');
  const [grade, setGrade] = useState(existing?.grade ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? 'Matematyka');
  const [rate, setRate] = useState(existing ? String(existing.rate) : '');
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [material, setMaterial] = useState(
    existing && existing.materialTitle !== '—' ? existing.materialTitle : '',
  );
  const [color, setColor] = useState<string>(existing?.color ?? DEFAULT_STUDENT_COLOR);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);

  const [busy, setBusy] = useState(false);
  const toNumber = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;

  const save = async () => {
    const input = {
      name,
      grade,
      subject,
      rate: toNumber(rate),
      contact,
      material,
      color,
    };
    setBusy(true);
    const ok = editing && id ? await updateStudent(id, input) : await addStudent(input);
    setBusy(false);
    if (ok) router.back();
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Usunąć ucznia?', `„${existing?.name ?? ''}" i jego lekcje zostaną usunięte.`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          deleteStudent(id);
          router.dismissAll?.(); // zamknij formularz i wróć do listy
          router.replace('/uczniowie');
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <View>
          <Text style={[t.mono, { fontSize: 12.5, color: c.inkFaint }]}>
            {editing ? 'Edycja profilu' : 'Nowy profil'}
          </Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: c.ink }}>
            {editing ? 'Edytuj ucznia' : 'Dodaj ucznia'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={c.inkSoft} />
        </Pressable>
      </View>

      <Field label="Imię i nazwisko">
        <Input value={name} onChangeText={setName} placeholder="np. Marta Nowak" />
      </Field>

      <Field label="Klasa">
        <Input value={grade} onChangeText={setGrade} placeholder="np. 6 SP" />
      </Field>

      <Field label="Przedmiot">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm - 1 }}>
          {(() => {
            // Domyślnie 3 najważniejsze; „…" pokazuje resztę. Aktualnie wybrany zawsze widoczny.
            const list = showAllSubjects
              ? SUBJECTS
              : [...TOP_SUBJECTS, ...(TOP_SUBJECTS.includes(subject) ? [] : [subject])];
            return list.map((s) => {
              const on = subject === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSubject(s)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    backgroundColor: on ? c.accentSoft : 'transparent',
                    borderColor: on ? c.accent : c.line,
                  }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: on ? c.accent : c.inkSoft }}>{s}</Text>
                </Pressable>
              );
            });
          })()}
          <Pressable
            onPress={() => setShowAllSubjects((v) => !v)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: c.line,
            }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.inkSoft }}>
              {showAllSubjects ? 'mniej' : '…'}
            </Text>
          </Pressable>
        </View>
      </Field>

      <Field label="Stawka za godzinę (zł)">
        <Input value={rate} onChangeText={setRate} placeholder="70" keyboardType="numeric" />
      </Field>

      <Field label="Kontakt">
        <Input value={contact} onChangeText={setContact} placeholder="Telefon do rodzica…" keyboardType="phone-pad" />
      </Field>

      <Field label="Materiał / dział">
        <Input value={material} onChangeText={setMaterial} placeholder="np. Funkcje kwadratowe" />
      </Field>

      <Field label="Kolor ucznia">
        {(showPalettes ? PALETTES : [PALETTES[0]]).map((pal) => (
          <View key={pal.name} style={{ marginBottom: spacing.sm }}>
            {showPalettes && (
              <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: c.inkFaint, marginBottom: 6 }}>{pal.name}</Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 }}>
              {pal.colors.map((hex) => {
                const on = color.toLowerCase() === hex.toLowerCase();
                return (
                  <Pressable
                    key={hex}
                    onPress={() => setColor(hex)}
                    hitSlop={4}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: hex,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: on ? 3 : 0,
                      borderColor: c.paper,
                    }}>
                    {on && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Pressable onPress={() => setShowPalettes((v) => !v)} style={{ paddingVertical: 4 }}>
          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 13 }}>
            {showPalettes ? 'mniej' : 'więcej palet'}
          </Text>
        </Pressable>
      </Field>

      <PrimaryButton
        label={editing ? 'Zapisz zmiany' : 'Zapisz ucznia'}
        onPress={save}
        loading={busy}
        color={studentTone(color).main}
      />

      {editing && (
        <Pressable onPress={remove} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: c.rose, fontWeight: '600', fontSize: 14 }}>Usuń ucznia</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: c.inkFaint,
          marginBottom: spacing.xs + 2,
        }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      {...props}
      placeholderTextColor={c.inkFaint}
      style={{
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 14,
        color: c.ink,
      }}
    />
  );
}
