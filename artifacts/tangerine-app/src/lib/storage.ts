/**
 * Cache sincrona in memoria sopra Supabase (PostgREST).
 *
 * - All'avvio, `hydrate()` carica tutte le tabelle dell'utente in cache.
 * - I componenti UI leggono in modo sincrono (`listFatture()` ecc.),
 *   identico al pattern locale precedente.
 * - Le mutation aggiornano cache + scrivono su Supabase (optimistic).
 * - Su ogni mutation chiamiamo `notify()` così App fa rerender.
 *
 * RLS lato Supabase garantisce che l'utente veda solo i propri dati.
 */
import { isSupabaseConfigured, requireSupabase } from "./supabase";
import { getCurrentUserId } from "./auth";
import type {
  AllocazioneSecchiello, Categoria, Fattura, Profile, Secchiello, Spesa,
} from "./types";
import { CATEGORIE_SEED, PROFILE_AUGUSTO_DEFAULT, SECCHIELLI_SEED } from "./seed";

interface State {
  profile: Profile | null;
  categorie: Categoria[];
  secchielli: Secchiello[];
  fatture: Fattura[];
  spese: Spesa[];
  allocazioni: AllocazioneSecchiello[];
}

const empty: State = {
  profile: null, categorie: [], secchielli: [], fatture: [], spese: [], allocazioni: [],
};

let state: State = empty;
let userId: string | null = null;
const subs = new Set<() => void>();

function notify(): void { for (const fn of subs) fn(); }

export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export async function hydrate(): Promise<void> {
  if (!isSupabaseConfigured) return;
  userId = await getCurrentUserId();
  if (!userId) return;
  const sb = requireSupabase();
  const [pR, cR, sR, fR, spR, aR] = await Promise.all([
    sb.from("profile").select("*").maybeSingle(),
    sb.from("categoria").select("*").order("ordine"),
    sb.from("secchiello").select("*").order("created_at"),
    sb.from("fattura").select("*").order("data_incasso", { ascending: false }),
    sb.from("spesa").select("*").order("data", { ascending: false }),
    sb.from("allocazione_secchiello").select("*"),
  ]);
  state = {
    profile: pR.data as Profile | null,
    categorie: (cR.data ?? []) as Categoria[],
    secchielli: (sR.data ?? []) as Secchiello[],
    fatture: (fR.data ?? []) as Fattura[],
    spese: (spR.data ?? []) as Spesa[],
    allocazioni: (aR.data ?? []) as AllocazioneSecchiello[],
  };
  notify();
}

// ─── Read (sync) ────────────────────────────────────────
export const getProfile = (): Profile | null => state.profile;
export const listCategorie = (): Categoria[] => state.categorie;
export const listSecchielli = (): Secchiello[] => state.secchielli;
export const listFatture = (): Fattura[] => state.fatture;
export const listSpese = (): Spesa[] => state.spese;
export const listAllocazioni = (): AllocazioneSecchiello[] => state.allocazioni;
/** Set di id dei secchielli con tipo='TAX'. Da passare al motore fiscale
 *  per il calcolo corretto di Netto Lordo / Tax-safe. Vedi types.ts. */
export const getTaxBucketIds = (): ReadonlySet<string> =>
  new Set(state.secchielli.filter((s) => s.tipo === "TAX").map((s) => s.id));
export const isOnboarded = (): boolean => !!state.profile?.anno_fiscale && (state.profile as any).onboarded === true;

// ─── Profile ────────────────────────────────────────────
export async function saveProfile(p: Profile & { onboarded?: boolean }): Promise<void> {
  const sb = requireSupabase();
  const uid = userId ?? (userId = await getCurrentUserId());
  if (!uid) throw new Error("Sessione mancante");
  const row = { user_id: uid, ...p };
  const { error } = await sb.from("profile").upsert(row);
  if (error) throw error;
  state = { ...state, profile: row as Profile };
  notify();
}

// ─── Generic helpers ────────────────────────────────────
async function withUser<T>(fn: (uid: string) => Promise<T>): Promise<T> {
  const uid = userId ?? (userId = await getCurrentUserId());
  if (!uid) throw new Error("Sessione mancante");
  return fn(uid);
}

// ─── Categorie ──────────────────────────────────────────
export async function saveCategorie(cs: Categoria[]): Promise<void> {
  await withUser(async (uid) => {
    const sb = requireSupabase();
    const rows = cs.map((c) => ({ ...c, user_id: uid }));
    const { error } = await sb.from("categoria").upsert(rows);
    if (error) throw error;
    state = { ...state, categorie: cs };
    notify();
  });
}

// ─── Secchielli ─────────────────────────────────────────
export async function saveSecchielli(ss: Secchiello[]): Promise<void> {
  await withUser(async (uid) => {
    const sb = requireSupabase();
    const rows = ss.map((s) => ({ ...s, user_id: uid }));
    const { error } = await sb.from("secchiello").upsert(rows);
    if (error) throw error;
    state = { ...state, secchielli: ss };
    notify();
  });
}

// ─── Fatture ────────────────────────────────────────────
export async function upsertFattura(
  f: Omit<Fattura, "id" | "created_at"> & { id?: string },
): Promise<Fattura> {
  return withUser(async (uid) => {
    const sb = requireSupabase();
    const payload = { ...f, user_id: uid } as any;
    const { data, error } = await sb.from("fattura").upsert(payload).select().single();
    if (error) throw error;
    const created = data as Fattura;
    state = {
      ...state,
      fatture: f.id
        ? state.fatture.map((x) => (x.id === created.id ? created : x))
        : [created, ...state.fatture],
    };
    await syncQuotaSocio();
    notify();
    return created;
  });
}

export async function deleteFattura(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("fattura").delete().eq("id", id);
  if (error) throw error;
  state = { ...state, fatture: state.fatture.filter((f) => f.id !== id) };
  await syncQuotaSocio();
  notify();
}

// ─── Spese ──────────────────────────────────────────────
export async function upsertSpesa(
  s: Omit<Spesa, "id" | "created_at"> & { id?: string },
): Promise<Spesa> {
  return withUser(async (uid) => {
    const sb = requireSupabase();
    const { data, error } = await sb.from("spesa").upsert({ ...s, user_id: uid }).select().single();
    if (error) throw error;
    const created = data as Spesa;
    state = {
      ...state,
      spese: s.id
        ? state.spese.map((x) => (x.id === created.id ? created : x))
        : [created, ...state.spese],
    };
    notify();
    return created;
  });
}

export async function deleteSpesa(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("spesa").delete().eq("id", id);
  if (error) throw error;
  state = { ...state, spese: state.spese.filter((s) => s.id !== id) };
  notify();
}

// ─── Allocazioni ────────────────────────────────────────
export async function upsertAllocazione(
  a: Omit<AllocazioneSecchiello, "id" | "created_at"> & { id?: string },
): Promise<AllocazioneSecchiello> {
  return withUser(async (uid) => {
    const sb = requireSupabase();
    const payload = { fonte: "MANUALE", ...a, user_id: uid } as any;
    const { data, error } = await sb.from("allocazione_secchiello").upsert(payload).select().single();
    if (error) throw error;
    const created = data as AllocazioneSecchiello;
    state = {
      ...state,
      allocazioni: a.id
        ? state.allocazioni.map((x) => (x.id === created.id ? created : x))
        : [...state.allocazioni, created],
    };
    notify();
    return created;
  });
}

// ─── Quota socio: ricomputo lato client (gli stessi numeri li
//    produrrebbe l'Edge Function compute-mese; qui aggiorniamo
//    il secchiello per visualizzazione immediata). ────────
async function syncQuotaSocio(): Promise<void> {
  const sb = requireSupabase();
  const profile = state.profile;
  if (!profile) return;
  const sock = state.secchielli.find((s) => s.slug === "QUOTA_SOCIO");
  if (!sock) return;

  // Ricostruisce per mese le quote attese da fatture P.IVA con socio incassate.
  const perMese = new Map<string, number>();
  for (const f of state.fatture) {
    if (
      f.tipo === "FATTURA_PIVA" && f.stato === "INCASSATO" && f.con_socio && f.data_incasso
    ) {
      const [y, m] = f.data_incasso.split("-");
      if (Number(y) !== profile.anno_fiscale) continue;
      const key = `${y}-${m}-01`;
      const quota =
        Number(f.lordo) * profile.coefficiente_redditivita * profile.inps_aliquota_socio_simulata;
      perMese.set(key, (perMese.get(key) ?? 0) + quota);
    }
  }

  // Cancella le AUTO_SOCIO esistenti per l'anno e re-inserisce.
  const start = `${profile.anno_fiscale}-01-01`;
  const end = `${profile.anno_fiscale + 1}-01-01`;
  await sb
    .from("allocazione_secchiello")
    .delete()
    .eq("secchiello_id", sock.id)
    .eq("fonte", "AUTO_SOCIO")
    .gte("mese", start)
    .lt("mese", end);

  const rows = await withUser(async (uid) => {
    const payload = Array.from(perMese.entries()).map(([mese, importo]) => ({
      user_id: uid,
      secchiello_id: sock.id,
      mese,
      importo,
      fonte: "AUTO_SOCIO",
      nota: "Quota socio simulata (auto)",
    }));
    if (payload.length === 0) return [] as AllocazioneSecchiello[];
    const { data, error } = await sb.from("allocazione_secchiello").insert(payload).select();
    if (error) throw error;
    return (data ?? []) as AllocazioneSecchiello[];
  });

  state = {
    ...state,
    allocazioni: [
      ...state.allocazioni.filter(
        (a) => !(a.secchiello_id === sock.id && a.fonte === "AUTO_SOCIO" && (a.mese ?? "").startsWith(String(profile.anno_fiscale))),
      ),
      ...rows,
    ],
  };
}

// ─── Bootstrap nuovo utente: crea profile, categorie, secchielli ─
export async function bootstrapNewUser(profile: Profile): Promise<void> {
  await withUser(async (uid) => {
    const sb = requireSupabase();
    // Profile
    const { error: e1 } = await sb.from("profile").upsert({ user_id: uid, ...profile, onboarded: false });
    if (e1) throw e1;
    // Categorie default (se mancano)
    const { data: existingCat } = await sb.from("categoria").select("id").limit(1);
    if (!existingCat?.length) {
      const rows = CATEGORIE_SEED.map((c) => ({ user_id: uid, ...c }));
      const { error } = await sb.from("categoria").insert(rows);
      if (error) throw error;
    }
    // Secchielli default (se mancano)
    const { data: existingSec } = await sb.from("secchiello").select("id").limit(1);
    if (!existingSec?.length) {
      const rows = SECCHIELLI_SEED.map((s) => ({ user_id: uid, ...s }));
      const { error } = await sb.from("secchiello").insert(rows);
      if (error) throw error;
    }
  });
  await hydrate();
}

export async function markOnboarded(): Promise<void> {
  const p = state.profile;
  if (!p) return;
  await saveProfile({ ...p, ...({ onboarded: true } as any) });
}

export const defaultProfile = (): Profile => PROFILE_AUGUSTO_DEFAULT;
