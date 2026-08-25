/**
 * supabase.js — Safe Dual-Mode Supabase Client Initializer
 *
 * Dynamically resolves @supabase/supabase-js when installed.
 * Safe fallback: if @supabase/supabase-js is not installed or environment variables
 * are unconfigured, `isSupabaseConfigured` evaluates to false, allowing all service
 * modules to seamlessly operate via LocalStorage fallback.
 */

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

let createClientFn = null;
try {
  const pkgName = '@supabase/supabase-js';
  const mod = await import(/* @vite-ignore */ pkgName);
  createClientFn = mod?.createClient || null;
} catch (e) {
  createClientFn = null;
}

export const isSupabaseConfigured = Boolean(
  createClientFn &&
  supabaseUrl &&
  supabaseUrl !== 'https://your-supabase-project.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase = isSupabaseConfigured && createClientFn
  ? createClientFn(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export default supabase;
