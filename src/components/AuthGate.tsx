import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * BRAMKA LOGOWANIA
 * Sprawdza, czy użytkownik jest zalogowany:
 *  - trwa sprawdzanie  -> kręciołek
 *  - brak sesji        -> ekran logowania
 *  - jest sesja        -> pokazujemy właściwą aplikację (children)
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const c = useColors();

  useEffect(() => {
    // 1) sprawdź, czy już jesteśmy zalogowani (sesja zapamiętana na telefonie)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    // 2) reaguj na logowanie/wylogowanie w trakcie działania apki
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!session) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Podaj e-mail i hasło.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(tłumaczBłąd(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setError(tłumaczBłąd(error.message));
        else if (!data.session) setInfo('Konto utworzone. Sprawdź e-mail, aby potwierdzić — potem zaloguj się.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    // Klawiatura nie może zasłaniać przycisku: ekran się przesuwa i przewija.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 12.5, letterSpacing: 1, color: c.accent, marginBottom: spacing.sm }}>
          KOREPETYCJE OS
        </Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 34, color: c.ink, marginBottom: spacing.xs }}>
          {mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
        </Text>
        <Text style={{ fontSize: 14.5, color: c.inkSoft, marginBottom: spacing.xl }}>
          Twoje dane uczniów są prywatne i tylko Twoje.
        </Text>

        <Label>E-mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="ty@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Label>Hasło</Label>
        <Input
          value={password}
          onChangeText={setPassword}
          ref={passwordRef}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {error && <Text style={{ color: c.rose, fontSize: 13, marginTop: spacing.sm }}>{error}</Text>}
        {info && <Text style={{ color: c.sage, fontSize: 13, marginTop: spacing.sm }}>{info}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy}
          style={({ pressed }) => [
            {
              backgroundColor: c.accent,
              borderRadius: radius.md,
              paddingVertical: spacing.lg - 2,
              alignItems: 'center',
              marginTop: spacing.lg,
              opacity: busy ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setInfo(null);
          }}
          style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: c.inkSoft, fontSize: 13.5 }}>
            {mode === 'login' ? 'Nie masz konta? ' : 'Masz już konto? '}
            <Text style={{ color: c.accent, fontWeight: '700' }}>
              {mode === 'login' ? 'Załóż je' : 'Zaloguj się'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Zamienia komunikaty błędów Supabase na czytelny polski. */
function tłumaczBłąd(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Błędny e-mail lub hasło.';
  if (/password should be at least/i.test(msg)) return 'Hasło musi mieć min. 6 znaków.';
  if (/user already registered/i.test(msg)) return 'Konto z tym e-mailem już istnieje — zaloguj się.';
  if (/unable to validate email/i.test(msg)) return 'Nieprawidłowy adres e-mail.';
  return msg;
}

function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: c.inkFaint,
        marginBottom: spacing.xs + 2,
      }}>
      {children}
    </Text>
  );
}

function Input(props: React.ComponentPropsWithRef<typeof TextInput>) {
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
        fontSize: 15,
        color: c.ink,
        marginBottom: spacing.md,
      }}
    />
  );
}
