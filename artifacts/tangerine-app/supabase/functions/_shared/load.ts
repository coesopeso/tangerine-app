// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function clientFromRequest(req: Request): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
}

export async function loadDataset(supabase: SupabaseClient, anno: number) {
  const start = `${anno}-01-01`;
  const end = `${anno + 1}-01-01`;

  const [profileR, fattureR, speseR, allocR] = await Promise.all([
    supabase.from("profile").select("*").maybeSingle(),
    supabase
      .from("fattura")
      .select("data_incasso, lordo, tipo, stato, con_socio")
      .gte("data_incasso", start)
      .lt("data_incasso", end),
    supabase
      .from("spesa")
      .select("data, importo, tipo")
      .gte("data", start)
      .lt("data", end),
    supabase
      .from("allocazione_secchiello")
      .select("mese, importo")
      .gte("mese", start)
      .lt("mese", end),
  ]);

  for (const r of [profileR, fattureR, speseR, allocR]) {
    if ((r as any).error) throw (r as any).error;
  }

  const profile = profileR.data;
  if (!profile) throw new Error("PROFILE_MISSING");

  return {
    profile: { ...profile, anno_fiscale: anno },
    fatture: fattureR.data ?? [],
    spese: speseR.data ?? [],
    allocazioni: allocR.data ?? [],
  };
}
