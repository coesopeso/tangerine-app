/**
 * Dashboard v1.2 — cruscotto guidato dal periodo globale + sezioni
 * arricchite per analisi su PC.
 *
 * Sezioni (mobile single-col, desktop md:grid 2-col):
 *   1. Hero brand-gradient: TI RESTANO DAVVERO  + Δ vs periodo precedente
 *   2. Hero glass:           NETTO LORDO         + barra salute INPS + sparkline
 *   3. 3 indicatori chiave:  Saving rate · Zavorra % · Quota socio
 *   4. Scomposizione:        Fatturato P.IVA · Privato · Tasse · Netto Lordo
 *   5. Andamento mensile:    grafico Netto Lordo · Spese · Secchielli
 *   6. Top 5 clienti:        chi ha pagato di più nel periodo
 *   7. Top 5 spese:          le voci di spesa più pesanti del periodo
 *   8. Andamento secchielli: quanto allocato per secchiello (TAX vs DISCR.)
 *   9. Spese per categoria:  tabella completa
 *  10. Scadenze (always-on, INDIP. dal periodo): fatture da incassare +
 *      spese programmate nei prossimi 60 giorni.
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Landmark,
  PiggyBank, AlertTriangle, Users, Receipt, Bell, Calendar,
} from "lucide-react";
import {
  getProfile, getTaxBucketIds,
  listAllocazioni, listCategorie, listFatture, listSecchielli, listSpese,
} from "@/lib/storage";
import { aggregaPeriodo, calcolaRiepilogoAnno, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";
import { labelPeriodo, periodoPrecedente, usePeriod } from "@/lib/period";
import type { Fattura, Spesa } from "@/lib/types";

export function Dashboard() {
  const profile = getProfile();
  const { period } = usePeriod();

  const fatture = listFatture();
  const spese = listSpese();
  const allocazioni = listAllocazioni();
  const categorie = listCategorie();
  const secchielli = listSecchielli();
  const taxBucketIds = getTaxBucketIds();

  const aggCorr = useMemo(() => {
    if (!profile) return null;
    return aggregaPeriodo(period, fatture, spese, allocazioni, profile, taxBucketIds);
  }, [profile, period, fatture, spese, allocazioni, taxBucketIds]);

  const aggPrev = useMemo(() => {
    if (!profile) return null;
    const prev = periodoPrecedente(period);
    if (!prev) return null;
    return aggregaPeriodo(prev, fatture, spese, allocazioni, profile, taxBucketIds);
  }, [profile, period, fatture, spese, allocazioni, taxBucketIds]);

  // Sparkline ultimi 6 mesi del Netto Lordo (sempre relativi all'oggi,
  // non al periodo selezionato — serve come "trend di fondo").
  const sparkData = useMemo(() => {
    if (!profile) return [] as { label: string; netto: number }[];
    const today = new Date();
    const out: { label: string; netto: number }[] = [];
    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    const cache = new Map<number, ReturnType<typeof calcolaRiepilogoAnno>>();
    for (let i = 5; i >= 0; i--) {
      const ty = i === 0 ? y : y;
      const tm = m - i;
      let yy = ty;
      let mm = tm;
      while (mm <= 0) {
        mm += 12;
        yy--;
      }
      if (!cache.has(yy)) {
        const ps = profile.anno_fiscale === yy ? profile : { ...profile, anno_fiscale: yy };
        cache.set(yy, calcolaRiepilogoAnno(fatture, spese, allocazioni, ps, taxBucketIds));
      }
      const r = cache.get(yy)![mm - 1];
      out.push({
        label: `${nomeMese(mm).slice(0, 3)}`,
        netto: Math.max(0, Math.round(r.netto_lordo_mese)),
      });
    }
    return out;
  }, [profile, fatture, spese, allocazioni, taxBucketIds]);

  if (!profile) return <Empty msg="Profilo non caricato" />;
  if (!aggCorr) return <Empty msg="Calcolo in corso…" />;

  const deltaTaxSafe = aggPrev ? aggCorr.tax_safe - aggPrev.tax_safe : null;
  const deltaNettoLordo = aggPrev ? aggCorr.netto_lordo - aggPrev.netto_lordo : null;

  const sogliaInps = profile.inps_minimale_annuo;
  const pctSoglia = Math.min(100, (aggCorr.imponibile_ytd_fine / sogliaInps) * 100);
  const eccedenzaPrevista = Math.max(0, aggCorr.imponibile_ytd_fine - sogliaInps);
  const eccedenzaImporto = eccedenzaPrevista * profile.inps_aliquota_eccedenza;

  const zavorraPct =
    aggCorr.fatturato_piva > 0
      ? (aggCorr.zavorra_fiscale / aggCorr.fatturato_piva) * 100
      : 0;

  const giudizio = aggCorr.tax_safe < 0
    ? { txt: "Stai esagerando: in rosso", tone: "bad" as const }
    : aggCorr.netto_lordo > 0 && aggCorr.tax_safe < aggCorr.netto_lordo * 0.1
    ? { txt: "Attenzione: margine basso", tone: "warn" as const }
    : aggCorr.netto_lordo === 0
    ? { txt: "Nessuna entrata nel periodo", tone: "warn" as const }
    : { txt: "Stai bene", tone: "good" as const };

  const refsSet = new Set(aggCorr.refs.map((r) => `${r.anno}-${r.mese}`));

  return (
    <div className="px-4 py-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* HERO 1 — Tax-safe */}
          <section className="md:col-span-2 relative overflow-hidden rounded-3xl brand-gradient p-6 shadow-2xl">
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative">
              <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-widest">
                <Wallet className="w-4 h-4" /> Ti restano davvero · {labelPeriodo(period)}
              </div>
              <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <span className="text-5xl font-bold text-white tabular drop-shadow">
                  {eur(aggCorr.tax_safe)}
                </span>
                <DeltaBadge value={deltaTaxSafe} />
              </div>
              <div className="mt-2 text-white/85 text-sm">{giudizio.txt}</div>
            </div>
          </section>

          {/* HERO 2 — Netto Lordo + barra INPS + sparkline */}
          <section className="md:col-span-2 glass-card-strong rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <TrendingUp className="w-4 h-4" /> Netto Lordo · stipendio del periodo
                </div>
                <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl font-bold tabular text-foreground">
                    {eur(aggCorr.netto_lordo)}
                  </span>
                  <DeltaBadge value={deltaNettoLordo} />
                </div>
              </div>
              {sparkData.length > 0 && (
                <div className="w-32 h-12 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id="sparkPrimary" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="netto"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        fill="url(#sparkPrimary)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="text-[9px] text-muted-foreground text-right -mt-1">
                    ultimi 6 mesi
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Salute fiscale INPS — imponibile YTD</span>
                <span className="tabular">
                  {eur(aggCorr.imponibile_ytd_fine)} / {eur(sogliaInps)}
                </span>
              </div>
              <ProgressBar pct={pctSoglia} />
              {eccedenzaPrevista > 0 && (
                <div className="mt-2 text-xs text-[hsl(var(--warning))] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Eccedenza INPS 24%: ~{eur(eccedenzaImporto)}
                </div>
              )}
            </div>
          </section>

          {/* 3 INDICATORI */}
          <section className="md:col-span-2 grid grid-cols-3 gap-3">
            <MetricCard
              label="Saving rate"
              value={`${(aggCorr.saving_rate * 100).toFixed(1)}%`}
              sub={aggCorr.saving_rate >= 0.2 ? "ottimo" : aggCorr.saving_rate >= 0.15 ? "buono" : "da migliorare"}
              tone={aggCorr.saving_rate >= 0.15 ? "good" : "warn"}
              icon={<PiggyBank className="w-4 h-4" />}
            />
            <MetricCard
              label="Zavorra fiscale"
              value={`${zavorraPct.toFixed(1)}%`}
              sub={zavorraPct <= 15 ? "leggera" : zavorraPct <= 20 ? "normale" : "pesante"}
              tone={zavorraPct <= 20 ? "good" : "warn"}
              icon={<Landmark className="w-4 h-4" />}
            />
            <MetricCard
              label="Quota socio"
              value={eur(aggCorr.quota_socio)}
              sub="accantonata"
              tone="default"
              icon={<TrendingDown className="w-4 h-4" />}
            />
          </section>

          {/* SCOMPOSIZIONE */}
          <section className="md:col-span-2 glass-card rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
              Scomposizione del Netto Lordo
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniKpi label="Fatturato P.IVA" value={aggCorr.fatturato_piva} tone="good" />
              <MiniKpi label="Entrate private" value={aggCorr.entrate_private} tone="default" />
              <MiniKpi label="Tasse + INPS" value={-aggCorr.zavorra_fiscale} tone="bad" />
              <MiniKpi label="Netto Lordo" value={aggCorr.netto_lordo} tone="primary" />
            </div>
          </section>

          {/* GRAFICO ANDAMENTO */}
          <section className="md:col-span-2 glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Andamento mensile
              </div>
              <div className="text-[10px] text-muted-foreground">€ per mese</div>
            </div>
            {aggCorr.per_mese.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={aggCorr.per_mese.map((r) => ({
                    label: `${nomeMese(r.mese).slice(0, 3)} ${String(r.anno).slice(-2)}`,
                    "Netto Lordo": Math.round(r.netto_lordo_mese),
                    "Spese": Math.round(r.spese_effettive_mese),
                    "Secchielli": Math.round(r.allocazioni_discrezionali_mese),
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: "#A7A7A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#A7A7A7", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.85)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#F9F9F9" }}
                    formatter={(v: number) => eur(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#A7A7A7" }} iconType="circle" />
                  <Line type="monotone" dataKey="Netto Lordo" stroke="#2DAA5A" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Spese" stroke="#DC4040" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Secchielli" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                Il periodo selezionato copre un solo mese. Cambia periodo per vedere
                un andamento.
              </div>
            )}
          </section>

          {/* TOP CLIENTI + TOP SPESE — affiancati su desktop */}
          <TopClienti fatture={fatture} refsSet={refsSet} />
          <TopSpese spese={spese} categorie={categorie} refsSet={refsSet} />

          {/* ANDAMENTO SECCHIELLI */}
          <section className="md:col-span-2">
            <SecchielliPanel
              secchielli={secchielli}
              allocazioni={allocazioni}
              refsSet={refsSet}
            />
          </section>

          {/* CATEGORIE TABLE */}
          <section className="md:col-span-2">
            <CategorieTable refsSet={refsSet} categorie={categorie} spese={spese} />
          </section>

          {/* SCADENZE — sezione always-on, INDIPENDENTE dal periodo */}
          <section className="md:col-span-2">
            <Scadenze fatture={fatture} spese={spese} />
          </section>

          <div className="md:col-span-2 text-[10px] text-center text-muted-foreground/60 pt-2">
            {aggPrev
              ? `Confronto vs periodo precedente equivalente`
              : "Nessun periodo precedente disponibile per il confronto"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sotto-componenti ──────────────────────────────────────────

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null || Math.abs(value) < 0.5) return null;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
        up
          ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
          : "bg-destructive/20 text-destructive"
      }`}
    >
      {up ? "↑" : "↓"} {eur(Math.abs(value))}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const tone =
    pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]";
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full ${tone} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function MetricCard({
  label, value, sub, tone, icon,
}: {
  label: string; value: string; sub: string;
  tone: "good" | "warn" | "bad" | "default";
  icon: React.ReactNode;
}) {
  const valCls =
    tone === "good" ? "text-[hsl(var(--success))]"
    : tone === "warn" ? "text-[hsl(var(--warning))]"
    : tone === "bad" ? "text-destructive"
    : "text-foreground";
  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`text-xl font-bold tabular mt-1.5 ${valCls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function MiniKpi({
  label, value, tone,
}: {
  label: string; value: number; tone: "good" | "bad" | "primary" | "default";
}) {
  const cls =
    tone === "good" ? "text-[hsl(var(--success))]"
    : tone === "bad" ? "text-destructive"
    : tone === "primary" ? "text-primary"
    : "text-foreground";
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular mt-1 ${cls}`}>{eur(value)}</div>
    </div>
  );
}

// ─── Top clienti ──────────────────────────────────────────────

function TopClienti({
  fatture, refsSet,
}: {
  fatture: Fattura[];
  refsSet: Set<string>;
}) {
  const incassate = fatture.filter((f) => {
    if (f.tipo !== "FATTURA_PIVA" || f.stato !== "INCASSATO" || !f.data_incasso) return false;
    const [y, m] = f.data_incasso.split("-").map(Number);
    return refsSet.has(`${y}-${m}`);
  });
  const map = new Map<string, { nome: string; importo: number; n: number }>();
  for (const f of incassate) {
    // Usiamo `descrizione` come proxy del cliente: nel modello attuale non c'è
    // tabella clienti (vive solo come testo nella fattura).
    const key = (f.descrizione || "—").trim() || "—";
    const cur = map.get(key) ?? { nome: key, importo: 0, n: 0 };
    cur.importo += Number(f.lordo);
    cur.n += 1;
    map.set(key, cur);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.importo - a.importo).slice(0, 5);
  const totale = rows.reduce((s, r) => s + r.importo, 0);
  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Top clienti del periodo
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Nessuna fattura incassata nel periodo
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.nome} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm truncate">{r.nome}</span>
              <span className="text-[10px] text-muted-foreground tabular">×{r.n}</span>
              <span className="text-sm font-semibold tabular w-24 text-right">{eur(r.importo)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-white/5 flex justify-between text-[10px] text-muted-foreground">
            <span>totale top {rows.length}</span>
            <span className="tabular">{eur(totale)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Top spese ────────────────────────────────────────────────

function TopSpese({
  spese, categorie, refsSet,
}: {
  spese: Spesa[];
  categorie: { id: string; nome: string; colore_hex: string }[];
  refsSet: Set<string>;
}) {
  const cats = new Map(categorie.map((c) => [c.id, c]));
  const items = spese
    .filter((s) => {
      if (s.tipo !== "EFFETTIVA") return false;
      const [y, m] = s.data.split("-").map(Number);
      return refsSet.has(`${y}-${m}`);
    })
    .sort((a, b) => b.importo - a.importo)
    .slice(0, 5);
  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-destructive" />
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Top spese del periodo
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Nessuna spesa nel periodo
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s, i) => {
            const cat = cats.get(s.categoria_id);
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: cat?.colore_hex ?? "#999" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{s.descrizione || cat?.nome || "Spesa"}</div>
                  <div className="text-[10px] text-muted-foreground tabular">
                    {formatItDate(s.data)} · {cat?.nome ?? "—"}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular text-destructive w-24 text-right">
                  {eur(s.importo)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Andamento secchielli ─────────────────────────────────────

function SecchielliPanel({
  secchielli, allocazioni, refsSet,
}: {
  secchielli: { id: string; nome: string; colore_hex: string; tipo: "TAX" | "DISCRETIONARY"; archiviato: boolean }[];
  allocazioni: { secchiello_id: string; mese: string; importo: number }[];
  refsSet: Set<string>;
}) {
  const totals = new Map<string, number>();
  for (const a of allocazioni) {
    const [y, m] = (a.mese ?? "").split("-").map(Number);
    if (!y || !m) continue;
    if (!refsSet.has(`${y}-${m}`)) continue;
    totals.set(a.secchiello_id, (totals.get(a.secchiello_id) ?? 0) + Number(a.importo));
  }
  const rows = secchielli
    .filter((s) => !s.archiviato)
    .map((s) => ({ ...s, importo: totals.get(s.id) ?? 0 }))
    .sort((a, b) => b.importo - a.importo);
  const totale = rows.reduce((s, r) => s + r.importo, 0);
  const max = Math.max(1, ...rows.map((r) => r.importo));

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-[hsl(var(--success))]" />
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Allocato per secchiello
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular">totale {eur(totale)}</div>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Nessun secchiello</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((s) => (
            <div key={s.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.colore_hex }} />
                <span className="flex-1 text-sm truncate">{s.nome}</span>
                <span
                  className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    s.tipo === "TAX"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {s.tipo === "TAX" ? "tasse" : "scelta"}
                </span>
                <span className="text-sm font-semibold tabular w-24 text-right">{eur(s.importo)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(s.importo / max) * 100}%`,
                    background: s.colore_hex,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categorie ─────────────────────────────────────────────────

function CategorieTable({
  refsSet, categorie, spese,
}: {
  refsSet: Set<string>;
  categorie: { id: string; nome: string; colore_hex: string; attiva: boolean }[];
  spese: Spesa[];
}) {
  const sp = spese.filter((s) => {
    if (s.tipo !== "EFFETTIVA") return false;
    const [y, m] = s.data.split("-").map(Number);
    return refsSet.has(`${y}-${m}`);
  });
  const totale = sp.reduce((s, x) => s + x.importo, 0);
  const rows = categorie
    .filter((c) => c.attiva)
    .map((c) => {
      const items = sp.filter((s) => s.categoria_id === c.id);
      const importo = items.reduce((s, x) => s + x.importo, 0);
      return {
        id: c.id,
        nome: c.nome,
        colore: c.colore_hex,
        importo,
        n: items.length,
        pct: totale > 0 ? (importo / totale) * 100 : 0,
      };
    })
    .filter((r) => r.importo > 0)
    .sort((a, b) => b.importo - a.importo);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Spese per categoria
        </div>
        <div className="text-[10px] text-muted-foreground tabular">totale {eur(totale)}</div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.colore }} />
            <span className="flex-1 text-sm truncate">{r.nome}</span>
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular">{r.pct.toFixed(0)}%</span>
            <span className="text-sm font-medium tabular w-24 text-right">{eur(r.importo)}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">
            Nessuna spesa nel periodo selezionato
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scadenze (always-on, indipendente dal periodo) ────────────

function Scadenze({
  fatture, spese,
}: {
  fatture: Fattura[];
  spese: Spesa[];
}) {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const limit = new Date(today.getTime() + 60 * 86400000);
  const limitIso = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;

  const fattureScadute = fatture.filter(
    (f) =>
      f.stato !== "INCASSATO" &&
      f.data_scadenza_pagamento &&
      f.data_scadenza_pagamento <= limitIso,
  );
  const spesePr = spese.filter(
    (s) =>
      s.tipo === "PROGRAMMATA" &&
      s.data >= todayIso &&
      s.data <= limitIso,
  );

  type Item = {
    id: string;
    when: string;
    label: string;
    importo: number;
    kind: "fattura" | "spesa";
    overdue: boolean;
  };
  const items: Item[] = [
    ...fattureScadute.map((f) => ({
      id: `f-${f.id}`,
      when: f.data_scadenza_pagamento!,
      label: f.descrizione || f.numero_fattura || "Fattura",
      importo: Number(f.lordo),
      kind: "fattura" as const,
      overdue: f.data_scadenza_pagamento! < todayIso,
    })),
    ...spesePr.map((s) => ({
      id: `s-${s.id}`,
      when: s.data,
      label: s.descrizione || "Spesa programmata",
      importo: Number(s.importo),
      kind: "spesa" as const,
      overdue: false,
    })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Scadenze prossimi 60 giorni
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center py-4">
          Nessuna scadenza imminente.
        </div>
      </div>
    );
  }

  const totaleIn = items.filter((i) => i.kind === "fattura").reduce((s, i) => s + i.importo, 0);
  const totaleOut = items.filter((i) => i.kind === "spesa").reduce((s, i) => s + i.importo, 0);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[hsl(var(--warning))]" />
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Scadenze prossimi 60 giorni
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular">
          {items.length} voci · in {eur(totaleIn)} · out {eur(totaleOut)}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 10).map((i) => (
          <div key={i.id} className="flex items-center gap-3">
            <Calendar
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                i.overdue
                  ? "text-destructive"
                  : i.kind === "fattura"
                  ? "text-[hsl(var(--success))]"
                  : "text-[hsl(var(--warning))]"
              }`}
            />
            <span className="text-[11px] text-muted-foreground tabular w-16 flex-shrink-0">
              {formatItDate(i.when)}
            </span>
            <span className="flex-1 text-sm truncate">{i.label}</span>
            {i.overdue && (
              <span className="text-[9px] uppercase tracking-wide text-destructive font-semibold">
                in ritardo
              </span>
            )}
            <span
              className={`text-sm font-semibold tabular w-24 text-right ${
                i.kind === "fattura" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"
              }`}
            >
              {i.kind === "fattura" ? "+" : "−"}
              {eur(i.importo)}
            </span>
          </div>
        ))}
        {items.length > 10 && (
          <div className="text-[10px] text-center text-muted-foreground pt-1">
            +{items.length - 10} altre
          </div>
        )}
      </div>
    </div>
  );
}

// ─── utils ─────────────────────────────────────────────────────

function formatItDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(-2)}`;
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{msg}</div>;
}
