/**
 * Dashboard v1.1 — il cruscotto guidato dal periodo globale.
 *
 * Sostituisce il vecchio selettore interno (Mese/Trim/Anno) con
 * `usePeriod()`: tutti i numeri seguono il PeriodPicker in cima.
 * Calcolo lato client tramite `aggregaPeriodo`, multi-anno aware.
 *
 * Sezioni (mobile single-col, desktop griglia 2-col):
 *   1. Hero brand-gradient: TI RESTANO DAVVERO + Δ vs periodo precedente
 *   2. Hero glass:           NETTO LORDO         + barra salute INPS
 *   3. 3 indicatori chiave:  Saving rate · Zavorra % · Quota socio
 *   4. Scomposizione:        Fatturato P.IVA · Privato · Tasse · Netto Lordo
 *   5. Grafico andamento:    Netto Lordo verde · Spese rosso · Secchielli blu
 *   6. Tabella categorie:    tutte le categorie spesa nel periodo
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
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Landmark,
  PiggyBank, AlertTriangle,
} from "lucide-react";
import {
  getProfile, getTaxBucketIds,
  listAllocazioni, listCategorie, listFatture, listSpese,
} from "@/lib/storage";
import { aggregaPeriodo, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";
import { labelPeriodo, periodoPrecedente, usePeriod } from "@/lib/period";

export function Dashboard() {
  const profile = getProfile();
  const { period } = usePeriod();

  const aggCorr = useMemo(() => {
    if (!profile) return null;
    return aggregaPeriodo(
      period,
      listFatture(),
      listSpese(),
      listAllocazioni(),
      profile,
      getTaxBucketIds(),
    );
  }, [profile, period]);

  const aggPrev = useMemo(() => {
    if (!profile) return null;
    const prev = periodoPrecedente(period);
    if (!prev) return null;
    return aggregaPeriodo(
      prev,
      listFatture(),
      listSpese(),
      listAllocazioni(),
      profile,
      getTaxBucketIds(),
    );
  }, [profile, period]);

  if (!profile) return <Empty msg="Profilo non caricato" />;
  if (!aggCorr) return <Empty msg="Calcolo in corso…" />;

  const deltaTaxSafe = aggPrev ? aggCorr.tax_safe - aggPrev.tax_safe : null;
  const deltaNettoLordo = aggPrev ? aggCorr.netto_lordo - aggPrev.netto_lordo : null;

  // Salute INPS: imponibile YTD vs soglia 18.415 (sempre riferito all'ultimo
  // anno coperto dal periodo)
  const sogliaInps = profile.inps_minimale_annuo;
  const pctSoglia = Math.min(100, (aggCorr.imponibile_ytd_fine / sogliaInps) * 100);
  const eccedenzaPrevista = Math.max(0, aggCorr.imponibile_ytd_fine - sogliaInps);
  const eccedenzaImporto = eccedenzaPrevista * profile.inps_aliquota_eccedenza;

  // Zavorra fiscale % = zavorra / fatturato P.IVA
  const zavorraPct =
    aggCorr.fatturato_piva > 0
      ? (aggCorr.zavorra_fiscale / aggCorr.fatturato_piva) * 100
      : 0;

  // Giudizio testuale Tax-safe
  const giudizio = aggCorr.tax_safe < 0
    ? { txt: "Stai esagerando: in rosso", tone: "bad" as const }
    : aggCorr.netto_lordo > 0 && aggCorr.tax_safe < aggCorr.netto_lordo * 0.1
    ? { txt: "Attenzione: margine basso", tone: "warn" as const }
    : aggCorr.netto_lordo === 0
    ? { txt: "Nessuna entrata nel periodo", tone: "warn" as const }
    : { txt: "Stai bene", tone: "good" as const };

  return (
    <div className="px-4 py-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Layout responsive: mobile = colonna unica, desktop ≥ md = griglia 2x */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HERO 1 — TI RESTANO DAVVERO */}
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

          {/* HERO 2 — NETTO LORDO + barra salute INPS */}
          <section className="md:col-span-2 glass-card-strong rounded-3xl p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="w-4 h-4" /> Netto Lordo · stipendio del periodo
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-bold tabular text-foreground">
                {eur(aggCorr.netto_lordo)}
              </span>
              <DeltaBadge value={deltaNettoLordo} />
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

          {/* 3 INDICATORI CHIAVE — full-width su mobile, 3 col su desktop */}
          <section className="md:col-span-2 grid grid-cols-3 gap-3">
            <MetricCard
              label="Saving rate"
              value={`${(aggCorr.saving_rate * 100).toFixed(1)}%`}
              sub={
                aggCorr.saving_rate >= 0.2
                  ? "ottimo"
                  : aggCorr.saving_rate >= 0.15
                  ? "buono"
                  : "da migliorare"
              }
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

          {/* SCOMPOSIZIONE NETTO LORDO */}
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
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#A7A7A7", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#A7A7A7", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
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

          {/* TABELLA CATEGORIE SPESA */}
          <section className="md:col-span-2">
            <CategorieTable refs={aggCorr.refs} />
          </section>

          {/* MICRO INFO */}
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
    pct >= 100
      ? "bg-destructive"
      : pct >= 75
      ? "bg-[hsl(var(--warning))]"
      : "bg-[hsl(var(--success))]";
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full ${tone} transition-all`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function MetricCard({
  label, value, sub, tone, icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "bad" | "default";
  icon: React.ReactNode;
}) {
  const valCls =
    tone === "good"
      ? "text-[hsl(var(--success))]"
      : tone === "warn"
      ? "text-[hsl(var(--warning))]"
      : tone === "bad"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tabular mt-1.5 ${valCls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function MiniKpi({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "good" | "bad" | "primary" | "default";
}) {
  const cls =
    tone === "good"
      ? "text-[hsl(var(--success))]"
      : tone === "bad"
      ? "text-destructive"
      : tone === "primary"
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular mt-1 ${cls}`}>{eur(value)}</div>
    </div>
  );
}

function CategorieTable({ refs }: { refs: { anno: number; mese: number }[] }) {
  const categorie = listCategorie();
  const spese = listSpese();
  const refsSet = new Set(refs.map((r) => `${r.anno}-${r.mese}`));

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
    .sort((a, b) => b.importo - a.importo);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Spese per categoria
        </div>
        <div className="text-[10px] text-muted-foreground tabular">
          totale {eur(totale)}
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: r.colore }}
            />
            <span className="flex-1 text-sm truncate">{r.nome}</span>
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular">
              {r.pct.toFixed(0)}%
            </span>
            <span className="text-sm font-medium tabular w-24 text-right">
              {eur(r.importo)}
            </span>
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

function Empty({ msg }: { msg: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted-foreground">{msg}</div>
  );
}
