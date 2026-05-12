/**
 * Hook che consulta l'Edge Function `compute-anno` (usata da FiscoScreen).
 *
 * NOTA (task #11, mag 2026): l'hook `useComputeMese` e la corrispondente
 * Edge Function `compute-mese` sono stati rimossi. Dopo l'introduzione del
 * modello "Netto Lordo / Tax-safe" (secchielli TAX vs DISCRETIONARY,
 * `taxBucketIds`, `netto_lordo_mese`, `alloc_tax/discrezionali`) la
 * Dashboard calcola tutto lato client via `src/lib/fiscal.ts` e non
 * referenziava più l'hook. Per evitare il trabocchetto di chiamate
 * server che restituirebbero numeri diversi dal client, abbiamo scelto
 * di rimuovere `compute-mese` invece di duplicarne il porting.
 *
 * `compute-anno` è invece ancora usata da FiscoScreen e legge solo i
 * campi base del riepilogo (zavorra, tasse, INPS, quota socio,
 * allocato totale, imponibile_ytd), che restano identici fra modello
 * vecchio e nuovo: nessun re-deploy necessario.
 */
import { useEffect, useState } from "react";
import { requireSupabase } from "./supabase";
import type { RiepilogoMese } from "./types";

export interface AnnoTotali {
  incasso_piva: number;
  incasso_privato: number;
  imponibile_ytd: number;
  tasse: number;
  inps_fisso: number;
  inps_eccedenza: number;
  zavorra: number;
  quota_socio: number;
  allocato: number;
}

export function useComputeAnno(anno: number, refreshKey: number) {
  const [data, setData] = useState<{ mesi: RiepilogoMese[]; totali: AnnoTotali } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    requireSupabase()
      .functions.invoke<{ mesi: RiepilogoMese[]; totali: AnnoTotali; error?: string; message?: string }>(
        "compute-anno",
        { body: { anno } },
      )
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else if (data?.error) setError(data.message ?? data.error);
        else setData(data as { mesi: RiepilogoMese[]; totali: AnnoTotali });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [anno, refreshKey]);
  return { data, error, loading };
}
