// deno-lint-ignore-file no-explicit-any
import { calcolaRiepilogoAnno } from "../_shared/fiscal.ts";
import { clientFromRequest, loadDataset } from "../_shared/load.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { anno } = (await req.json()) as { anno: number };
    if (!Number.isInteger(anno)) {
      return jsonResponse({ error: "VALIDATION_FAILED", message: "anno non valido" }, 400);
    }
    const supabase = clientFromRequest(req);
    const ds = await loadDataset(supabase, anno);
    const mesi = calcolaRiepilogoAnno(ds.fatture as any, ds.spese as any, ds.allocazioni as any, ds.profile as any);
    const totali = mesi.reduce(
      (acc, m) => ({
        incasso_piva: acc.incasso_piva + m.incassato_piva,
        incasso_privato: acc.incasso_privato + m.incassato_privato,
        imponibile_ytd: m.imponibile_ytd,
        tasse: acc.tasse + m.tasse_mese,
        inps_fisso: acc.inps_fisso + m.inps_fisso_mese,
        inps_eccedenza: acc.inps_eccedenza + m.inps_eccedenza_mese,
        zavorra: acc.zavorra + m.zavorra_fiscale_mese,
        quota_socio: acc.quota_socio + m.quota_socio_mese,
        allocato: acc.allocato + m.allocazioni_secchielli_mese,
      }),
      {
        incasso_piva: 0, incasso_privato: 0, imponibile_ytd: 0, tasse: 0,
        inps_fisso: 0, inps_eccedenza: 0, zavorra: 0, quota_socio: 0, allocato: 0,
      },
    );
    return jsonResponse({ anno, mesi, totali });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const code = msg === "PROFILE_MISSING" ? 404 : 500;
    return jsonResponse({ error: msg, message: msg }, code);
  }
});
