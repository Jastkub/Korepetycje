import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Połączenie z chmurą Supabase.
 * URL i klucz „publishable" są jawne (trafiają do aplikacji) — to bezpieczne.
 * TAJNY klucz `service_role` NIGDY nie może się tu znaleźć.
 */
const SUPABASE_URL = 'https://nuxbsdrxsvtiuhdjsduf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vI0CgbN0y9bx9gw5KAS6IQ_KK7-kIZJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage, // sesja logowania pamiętana na telefonie
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // to aplikacja mobilna, nie strona
  },
});
