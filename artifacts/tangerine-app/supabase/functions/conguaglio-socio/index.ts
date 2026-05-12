// deno-lint-ignore-file no-explicit-any
import { clientFromRequest } from "../_shared/load.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { anno, tasse_reali_socio } = (await req.json()) as { anno: number; tasse_reali_socio: number };
    if (!Number.isInteger(anno) || typeof tasse_reali_socio !== "number") {
      return jsonResponse({ error: "VALIDATION_FAILED", message: "input non valido" }, 400);
    }
    const supabase = clientFromRequest(req);
    const start = `${anno}-01-01`;
    const end = `${anno + 1}-01-01`;

    const { data: sock, error: e1 } = await supabase
      .from("secchiello")
      .select("id")
      .eq("slug", "QUOTA_SOCIO")
      .maybeSingle();
    if (e1) throw e1;
    if (!sock) return jsonResponse({ error: "NOT_FOUND", message: "Secchiello QUOTA_SOCIO mancante" }, 404);

    const { data: allocs, error: e2 } = await supabase
      .from("allocazione_secchiello")
      .select("importo")
      .eq("secchiello_id", sock.id)
      .gte("mese", start)
      .lt("mese", end);
    if (e2) throw e2;

    const totale = (allocs ?? []).reduce((s, a: any) => s + Number(a.importo), 0);
    const delta = totale - tasse_reali_socio;
    const azione = Math.abs(delta) < 0.01
      ? "PAREGGIO"
      : delta > 0
      ? "BONIFICO_AL_SOCIO"
      : "RICHIESTA_INTEGRAZIONE";

    // Azzera il secchiello per l'anno: cancella le allocazioni del periodo.
    const { error: e3 } = await supabase
      .from("allocazione_secchiello")
      .delete()
      .eq("secchiello_id", sock.id)
      .gte("mese", start)
      .lt("mese", end);
    if (e3) throw e3;

    return jsonResponse({ totale_trattenuto: totale, delta, azione });
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? String(e), message: e?.message ?? String(e) }, 500);
  }
});
