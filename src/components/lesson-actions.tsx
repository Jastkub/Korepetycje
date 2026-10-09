import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { type Lesson } from '@/data/mock';
import { useApp } from '@/store/AppStore';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Szybkie potwierdzenie minionej lekcji jednym dotknięciem:
 * Opłacone / Nieopłacone / Nie było. Po wyborze pokazuje wynik + „Cofnij".
 */
export function ConfirmActions({ lesson }: { lesson: Lesson }) {
  const c = useColors();
  const { updateLesson } = useApp();

  if (lesson.status !== 'planned') {
    const held = lesson.status === 'present' || lesson.status === 'late';
    const label = !held ? 'Nie odbyła się' : lesson.paid ? 'Opłacone' : 'Do zapłaty';
    const color = !held ? c.inkSoft : lesson.paid ? c.sage : c.amber;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        <Ionicons name="checkmark-done" size={16} color={color} />
        <Text style={{ flex: 1, color, fontFamily: fonts.mono, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
        <Pressable onPress={() => updateLesson(lesson.id, { status: 'planned', paid: false })} hitSlop={10}>
          <Text style={{ color: c.accent, fontFamily: fonts.mono, fontSize: 11.5 }}>Cofnij</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
      <Chip label="Opłacone" fg={c.sage} bg={c.sageSoft} onPress={() => updateLesson(lesson.id, { status: 'present', paid: true })} />
      <Chip label="Nieopłacone" fg={c.amber} bg={c.amberSoft} onPress={() => updateLesson(lesson.id, { status: 'present', paid: false })} />
      <Chip label="Nie było" fg={c.inkSoft} bg={c.lineSoft} onPress={() => updateLesson(lesson.id, { status: 'cancelled', paid: false })} />
    </View>
  );
}

export function Chip({
  icon, label, fg, bg, onPress, flex = true,
}: {
  icon?: keyof typeof Ionicons.glyphMap; label: string; fg: string; bg: string; onPress: () => void; flex?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        { flex: flex ? 1 : undefined, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: bg },
        pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] },
      ]}>
      {icon && <Ionicons name={icon} size={16} color={fg} />}
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, fontWeight: '700', color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
