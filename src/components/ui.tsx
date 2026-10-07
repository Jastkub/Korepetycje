import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AttendanceStatus, Student, StudentColor } from '@/data/mock';
import { studentTone, textOn } from '@/theme/studentColors';
import { fonts, radius, spacing, type Colors } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Mapowanie „koloru" ucznia/statusu na konkretną wartość z motywu. */
export function tone(c: Colors, key: StudentColor) {
  return {
    accent: { main: c.accent, soft: c.accentSoft },
    indigo: { main: c.indigo, soft: c.indigoSoft },
    sage: { main: c.sage, soft: c.sageSoft },
    amber: { main: c.amber, soft: c.amberSoft },
    rose: { main: c.rose, soft: c.roseSoft },
    teal: { main: c.teal, soft: c.tealSoft },
    violet: { main: c.violet, soft: c.violetSoft },
    blue: { main: c.blue, soft: c.blueSoft },
  }[key];
}

/** Kolor krawędzi/tła bloku lekcji zależny od statusu obecności. */
export function statusTone(c: Colors, status: AttendanceStatus) {
  if (status === 'present') return { main: c.sage, soft: c.sageSoft };
  if (status === 'absent' || status === 'cancelled') return { main: c.rose, soft: c.roseSoft };
  if (status === 'late') return { main: c.amber, soft: c.amberSoft };
  return { main: c.indigo, soft: c.indigoSoft };
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  planned: 'Zaplanowana',
  present: 'Był(a)',
  absent: 'Nieobecny',
  late: 'Spóźniony',
  cancelled: 'Odwołane',
};

/** Ekran: bezpieczne marginesy + tło + opcjonalne przewijanie. */
export function Screen({
  children,
  scroll = true,
  edges = true,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: boolean;
  onRefresh?: () => Promise<void> | void; // gdy podane — włącza „pociągnij, by odświeżyć"
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const pad = {
    paddingTop: edges ? insets.top : 0,
    paddingBottom: insets.bottom,
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: c.paper }, pad]}>{children}</View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, ...pad, paddingBottom: insets.bottom + spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.accent} colors={[c.accent]} />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </View>
  );
}

/** Nagłówek ekranu: mała etykieta + duży tytuł, opcjonalnie strzałka wstecz. */
export function Header({
  eyebrow,
  title,
  back = false,
  right,
}: {
  eyebrow?: string;
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={styles.header}>
      {back && (
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: c.card, borderColor: c.line }]}
          hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.inkSoft} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: c.inkFaint }]}>{eyebrow}</Text>
        ) : null}
        <Text style={[styles.title, { color: c.ink, fontFamily: fonts.serif }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Karta — biały prostokąt z obramowaniem. */
export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const c = useColors();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: c.card, borderColor: c.line },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

/** Mała etykieta sekcji (mono, wersaliki). */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.sectionLabel}>
      <Text style={[styles.sectionLabelText, { color: c.inkFaint, fontFamily: fonts.mono }]}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** „Pigułka" — kolorowy znacznik statusu. */
export function Pill({
  children,
  tone: t = 'indigo',
}: {
  children: ReactNode;
  tone?: StudentColor;
}) {
  const c = useColors();
  const col = tone(c, t);
  return (
    <View style={[styles.pill, { backgroundColor: col.soft }]}>
      <Text style={[styles.pillText, { color: col.main, fontFamily: fonts.mono }]}>{children}</Text>
    </View>
  );
}

/** Awatar z inicjałami. */
export function Avatar({ student, size = 40 }: { student: Student; size?: number }) {
  const col = studentTone(student.color);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: col.main,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: col.text, fontFamily: fonts.serif, fontSize: size * 0.4, fontWeight: '600' }}>
        {student.initials}
      </Text>
    </View>
  );
}

/** Pasek postępu 0–100. */
export function Progress({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  return (
    <View style={{ height: 7, borderRadius: radius.pill, backgroundColor: c.line, overflow: 'hidden', marginTop: spacing.sm }}>
      <View style={{ height: '100%', width: `${value}%`, backgroundColor: color ?? c.accent, borderRadius: radius.pill }} />
    </View>
  );
}

/** Duży przycisk akcji. Gdy `loading` — pokazuje kręciołek i blokuje kliknięcie. */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  color,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  color?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: color ?? c.accent },
        (pressed || loading) && { opacity: 0.85 },
      ]}>
      {loading ? (
        <ActivityIndicator color={color ? textOn(color) : '#fff'} />
      ) : (
        <Text style={[styles.ctaText, color ? { color: textOn(color) } : null]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Rząd „chipsów" do wyboru sortowania. */
export function SortChips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              backgroundColor: on ? c.accentSoft : 'transparent',
              borderColor: on ? c.accent : c.line,
            }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const text = (c: Colors) => ({
  h3: { fontFamily: fonts.serif, fontSize: 19, fontWeight: '600' as const, color: c.ink },
  body: { fontSize: 14.5, color: c.ink },
  soft: { fontSize: 13, color: c.inkSoft },
  mono: { fontFamily: fonts.mono, fontSize: 11, color: c.inkFaint },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { fontSize: 12.5, marginBottom: 1 },
  title: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md + 1,
    marginBottom: spacing.sm + 2,
  },
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 1,
    marginHorizontal: spacing.xs,
  },
  sectionLabelText: { fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  cta: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg - 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 } as TextStyle,
});
