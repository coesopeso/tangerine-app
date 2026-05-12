/**
 * Hooks che consultano le Edge Function `compute-mese` / `compute-anno`.
 * Le Edge Function sono la sorgente canonica: stesso JWT da telefono o PC
 * → stessi numeri (vedi docs/API.md "Edge Functions").
 *
 * Cache locale per (anno, mese) per evitare round-trip a ogni rerender.
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

export function useComputeMese(anno: number, mese: number, refreshKey: number) {
  const [data, setData] = useState<RiepilogoMese | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    requireSupabase()
      .functions.invoke<RiepilogoMese & { error?: string; message?: string }>("compute-mese", {
        body: { anno, mese },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else if (data?.error) setError(data.message ?? data.error);
        else setData(data as RiepilogoMese);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [anno, mese, refreshKey]);
  return { data, error, loading };
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
