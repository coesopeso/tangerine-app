// deno-lint-ignore-file no-explicit-any
import { calcolaRiepilogoAnno } from "../_shared/fiscal.ts";
import { clientFromRequest, loadDataset } from "../_shared/load.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { anno, mese } = (await req.json()) as { anno: number; mese: number };
    if (!Number.isInteger(anno) || !Number.isInteger(mese) || mese < 1 || mese > 12) {
      return jsonResponse({ error: "VALIDATION_FAILED", message: "anno/mese non valido" }, 400);
    }
    const supabase = clientFromRequest(req);
    const ds = await loadDataset(supabase, anno);
    const anni = calcolaRiepilogoAnno(ds.fatture as any, ds.spese as any, ds.allocazioni as any, ds.profile as any);
    return jsonResponse({ anno, ...anni[mese - 1] });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const code = msg === "PROFILE_MISSING" ? 404 : 500;
    return jsonResponse({ error: msg, message: msg }, code);
  }
});
