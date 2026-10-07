import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Card, Header, Screen, SectionLabel, text } from '@/components/ui';
import {
  ensurePermission,
  getReminderPrefs,
  setReminderEnabled,
  setReminderMinutes,
  syncReminders,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppStore';
import { ACCENTS, useThemePref, type ThemePref } from '@/theme/ThemeContext';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';
import { showAlert } from '@/lib/alert';

export default function MoreScreen() {
  const c = useColors();
  const t = text(c);
  const router = useRouter();
  return (
    <Screen>
      <Header eyebrow="Ustawienia" title="Więcej" />

      <SectionLabel>NARZĘDZIA</SectionLabel>
      <Card onPress={() => router.push('/statystyki')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="stats-chart-outline" size={22} color={c.accent} />
          <Text style={[t.body, { flex: 1 }]}>Statystyki i rozliczenia</Text>
          <Ionicons name="chevron-forward" size={20} color={c.inkFaint} />
        </View>
      </Card>

      <SectionLabel>WYGLĄD</SectionLabel>
      <ThemeCard />

      <SectionLabel>PRZYPOMNIENIA</SectionLabel>
      <RemindersCard />

      <SectionLabel>KONTO</SectionLabel>
      <Pressable onPress={() => supabase.auth.signOut()}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="log-out-outline" size={22} color={c.rose} />
            <Text style={[t.body, { flex: 1, color: c.rose, fontWeight: '600' }]}>Wyloguj się</Text>
          </View>
        </Card>
      </Pressable>

      <Text style={[t.soft, { textAlign: 'center', marginTop: spacing.xl }]}>
        Korepetycje OS · dane w chmurze (Supabase)
      </Text>
    </Screen>
  );
}

const THEME_OPTS: { p: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { p: 'light', label: 'Jasny', icon: 'sunny-outline' },
  { p: 'dark', label: 'Ciemny', icon: 'moon-outline' },
  { p: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function ThemeCard() {
  const c = useColors();
  const { pref, setPref, accentKey, setAccent, scheme } = useThemePref();
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {THEME_OPTS.map((o) => {
          const on = pref === o.p;
          return (
            <Pressable
              key={o.p}
              onPress={() => setPref(o.p)}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 5,
                paddingVertical: spacing.md,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                backgroundColor: on ? c.accentSoft : 'transparent',
                borderColor: on ? c.accent : c.line,
              }}>
              <Ionicons name={o.icon} size={20} color={on ? c.accent : c.inkSoft} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: c.inkFaint, marginTop: spacing.md, marginBottom: spacing.sm }}>
        KOLOR AKCENTU
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 }}>
        {ACCENTS.map((a) => {
          const hex = scheme === 'dark' ? a.dark.main : a.light.main;
          const on = accentKey === a.key;
          return (
            <Pressable
              key={a.key}
              onPress={() => setAccent(a.key)}
              hitSlop={4}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: hex, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 3 : 0, borderColor: c.paper }}>
              {on && <Ionicons name="checkmark" size={18} color="#fff" />}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const MINUTE_OPTIONS = [15, 30, 60];

function RemindersCard() {
  const c = useColors();
  const t = text(c);
  const { lessons } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState(60);

  // Wczytaj zapisane ustawienia przy wejściu.
  useEffect(() => {
    getReminderPrefs().then((p) => {
      setEnabled(p.enabled);
      setMinutes(p.minutes);
    });
  }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      const ok = await ensurePermission();
      if (!ok) {
        showAlert('Brak zgody', 'Włącz powiadomienia dla aplikacji w ustawieniach telefonu.');
        return;
      }
    }
    setEnabled(value);
    await setReminderEnabled(value);
    await syncReminders(lessons);
  };

  const pickMinutes = async (m: number) => {
    setMinutes(m);
    await setReminderMinutes(m);
    if (enabled) await syncReminders(lessons);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name="notifications-outline" size={22} color={enabled ? c.accent : c.inkSoft} />
        <View style={{ flex: 1 }}>
          <Text style={t.body}>Przypomnienia przed lekcją</Text>
          <Text style={t.soft}>Powiadomienie na telefonie przed startem</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ true: c.accent, false: c.line }}
          thumbColor="#fff"
        />
      </View>

      {enabled && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
          {MINUTE_OPTIONS.map((m) => {
            const on = minutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => pickMinutes(m)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.sm,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  backgroundColor: on ? c.accentSoft : 'transparent',
                  borderColor: on ? c.accent : c.line,
                }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>
                  {m} min
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}
