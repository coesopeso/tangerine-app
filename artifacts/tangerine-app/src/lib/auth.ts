/**
 * Auth = Supabase Auth (account anonimo) + PIN 6-cifre come secondo fattore.
 * - PIN salvato come bcrypt nella tabella `auth_pin` (Edge Function).
 * - Lockout: 5 tentativi → 5 minuti (server-side, sincronizzato cross-device).
 * - Multi-device: l'utente collega un'email al proprio account anonimo;
 *   sul nuovo device fa magic-link e ri-imposta lo stesso PIN — vedi
 *   docs/MIGRATION.md, sezione "Aggiungi questo dispositivo".
 *
 * Il "PIN unlock" oltre alla verifica server salva un flag in sessionStorage
 * così non chiediamo il PIN a ogni navigazione interna alla stessa scheda.
 */
import { isSupabaseConfigured, requireSupabase } from "./supabase";

const SESSION_KEY = "tangerine.v1.session_unlocked";

export async function ensureAnonymousSession(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await requireSupabase().auth.getUser();
  return data.user?.id ?? null;
}

export async function isPinSet(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const supabase = requireSupabase();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data, error } = await supabase
    .from("auth_pin")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function lockNow(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function setupPin(pin: string): Promise<void> {
  await ensureAnonymousSession();
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string; message?: string }>(
    "auth-pin-setup",
    { body: { pin } },
  );
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message ?? "Setup PIN fallito");
  sessionStorage.setItem(SESSION_KEY, "1");
}

export interface VerifyResult {
  ok: boolean;
  remaining?: number;
  locked_until?: string;
  message?: string;
}

export async function verifyPin(pin: string): Promise<VerifyResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<VerifyResult>("auth-pin-verify", {
    body: { pin },
  });
  // L'Edge Function ritorna 401/423 con un body strutturato; supabase-js
  // mette comunque il body in `data` quando il content-type è json.
  const body: VerifyResult = (data as VerifyResult) ?? (error?.context as any)?.body ?? { ok: false, message: error?.message };
  if (body?.ok) sessionStorage.setItem(SESSION_KEY, "1");
  return body;
}

export async function signOut(): Promise<void> {
  lockNow();
  if (isSupabaseConfigured) await requireSupabase().auth.signOut();
}
