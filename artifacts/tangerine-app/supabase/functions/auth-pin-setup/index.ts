// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { jsonResponse, preflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { pin } = (await req.json()) as { pin: string };
    if (!/^\d{6}$/.test(pin)) {
      return jsonResponse({ error: "VALIDATION_FAILED", message: "PIN deve essere di 6 cifre" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: ue } = await supabase.auth.getUser();
    if (ue || !userData?.user) return jsonResponse({ error: "UNAUTHORIZED", message: "Sessione mancante" }, 401);

    const hash = await bcrypt.hash(pin, 10);
    const { error } = await supabase
      .from("auth_pin")
      .upsert({ user_id: userData.user.id, pin_hash: hash, failed_attempts: 0, locked_until: null });
    if (error) throw error;
    return jsonResponse({ ok: true });
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? String(e), message: e?.message ?? String(e) }, 500);
  }
});
