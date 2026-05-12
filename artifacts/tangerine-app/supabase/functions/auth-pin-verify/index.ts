// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { jsonResponse, preflight } from "../_shared/cors.ts";

const LOCKOUT_MIN = 5;
const MAX_FAILED = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { pin } = (await req.json()) as { pin: string };
    if (!/^\d{6}$/.test(pin)) {
      return jsonResponse({ ok: false, error: "VALIDATION_FAILED", message: "PIN non valido" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: ue } = await supabase.auth.getUser();
    if (ue || !userData?.user) return jsonResponse({ ok: false, error: "UNAUTHORIZED" }, 401);

    const { data: row, error: e1 } = await supabase
      .from("auth_pin")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!row) return jsonResponse({ ok: false, error: "NO_PIN", message: "PIN non impostato" }, 404);

    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      return jsonResponse({ ok: false, error: "LOCKED", locked_until: row.locked_until, message: "Bloccato" }, 423);
    }

    const ok = await bcrypt.compare(pin, row.pin_hash);
    if (ok) {
      await supabase
        .from("auth_pin")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", userData.user.id);
      return jsonResponse({ ok: true });
    }

    const failed = (row.failed_attempts ?? 0) + 1;
    const willLock = failed >= MAX_FAILED;
    const lockedUntil = willLock ? new Date(Date.now() + LOCKOUT_MIN * 60 * 1000).toISOString() : null;
    await supabase
      .from("auth_pin")
      .update({ failed_attempts: willLock ? 0 : failed, locked_until: lockedUntil })
      .eq("user_id", userData.user.id);

    return jsonResponse(
      willLock
        ? { ok: false, error: "LOCKED", locked_until: lockedUntil, message: "5 tentativi falliti. Bloccato 5 minuti." }
        : { ok: false, error: "WRONG_PIN", remaining: MAX_FAILED - failed, message: "PIN errato." },
      willLock ? 423 : 401,
    );
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
