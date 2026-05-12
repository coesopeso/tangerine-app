/**
 * Dashboard v1 — il "cruscotto" annuale.
 *
 * Risponde a "come sta andando l'anno e cosa devo aspettarmi".
 * Mostra il periodo selezionato (Mese, Trimestre, Anno) con:
 *   - Hero brand-gradient: TI RESTANO DAVVERO  + Δ vs periodo precedente
 *   - Hero glass:           NETTO LORDO         + barra salute INPS
 *   - 3 indicatori chiave:  Saving rate · Zavorra fiscale · Eccedenza INPS prevista
 *   - Scomposizione:        Fatturato P.IVA · Privato · Tasse · Netto Lordo
 *   - Grafico andamento:    Netto Lordo verde · Spese rosso · Secchielli blu
 *   - Tabella categorie:    tutte le categorie spesa nel periodo
 *
 * Calcolo lato client tramite `calcolaRiepilogoAnno` (vedi lib/fiscal.ts),
 * con il nuovo modello Netto Lordo / Tax-safe e secchielli TAX vs DISCRETIONARY.
 */
import { useMemo, useState } from "react";
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
  Calendar, TrendingUp, TrendingDown, Wallet, Landmark,
  PiggyBank, AlertTriangle,
} from "lucide-react";
import {
  getProfile, getTaxBucketIds,
  listAllocazioni, listCategorie, listFatture, listSpese,
} from "@/lib/storage";
import { calcolaRiepilogoAnno, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";
import type { RiepilogoMese } from "@/lib/types";

type Periodo = "MESE" | "TRIMESTRE" | "ANNO";

interface Props {
  anno: number;
  mese: number;
}

interface Aggregato {
  netto_lordo: number;
  tax_safe: number;
  fatturato_piva: number;
  entrate_private: number;
  imponibile: number;
  tasse: number;          // imposta 5%
  inps_fisso: number;
  inps_eccedenza: number;
  zavorra_fiscale: number;
  spese_effettive: number;
  alloc_tax: number;
  alloc_discrezionali: number;
  alloc_totali: number;
  saving_rate: number;
  quota_socio: number;
  mesi_inclusi: number[];
}

function aggrega(rs: RiepilogoMese[], mesi: number[]): Aggregato {
  const inc = rs.filter((r) => mesi.includes(r.mese));
  const sum = (k: keyof RiepilogoMese): number =>
    inc.reduce((s, r) => s + (r[k] as number), 0);
  const fatturato_piva = sum("incassato_piva");
  const entrate_private = sum("incassato_privato");
  const totale_entrate = fatturato_piva + entrate_private;
  const alloc_totali = sum("allocazioni_secchielli_mese");
  return {
    fatturato_piva,
    entrate_private,
    imponibile: sum("imponibile_mese"),
    tasse: sum("tasse_mese"),
    inps_fisso: sum("inps_fisso_mese"),
    inps_eccedenza: sum("inps_eccedenza_mese"),
    zavorra_fiscale: sum("zavorra_fiscale_mese"),
    netto_lordo: sum("netto_lordo_mese"),
    spese_effettive: sum("spese_effettive_mese"),
    alloc_tax: sum("allocazioni_tax_mese"),
    alloc_discrezionali: sum("allocazioni_discrezionali_mese"),
    alloc_totali,
    tax_safe: sum("tax_safe_mese"),
    saving_rate: totale_entrate > 0 ? alloc_totali / totale_entrate : 0,
    quota_socio: sum("quota_socio_mese"),
    mesi_inclusi: mesi,
  };
}

function mesiPerPeriodo(p: Periodo, meseCorr: number): number[] {
  if (p === "MESE") return [meseCorr];
  if (p === "TRIMESTRE") {
    const trim = Math.ceil(meseCorr / 3);
    return [trim * 3 - 2, trim * 3 - 1, trim * 3];
  }
  // ANNO YTD = da gennaio al mese corrente
  return Array.from({ length: meseCorr }, (_, i) => i + 1);
}

function labelPeriodo(p: Periodo, anno: number, mese: number): string {
  if (p === "MESE") return `${nomeMese(mese)} ${anno}`;
  if (p === "TRIMESTRE") {
    const t = Math.ceil(mese / 3);
    return `Q${t} ${anno}`;
  }
  return `${anno} (gen → ${nomeMese(mese).toLowerCase()})`;
}

export function Dashboard({ anno, mese }: Props) {
  const profile = getProfile();
  const [periodo, setPeriodo] = useState<Periodo>("ANNO");

  const riepilogo = useMemo(() => {
    if (!profile) return null;
    const profileScoped =
      profile.anno_fiscale === anno ? profile : { ...profile, anno_fiscale: anno };
    return calcolaRiepilogoAnno(
      listFatture(),
      listSpese(),
      listAllocazioni(),
      profileScoped,
      getTaxBucketIds(),
    );
  }, [profile, anno]);

  if (!profile) return <Empty msg="Profilo non caricato" />;
  if (!riepilogo) return <Empty msg="Calcolo in corso…" />;

  const mesiCorr = mesiPerPeriodo(periodo, mese);
  const corr = aggrega(riepilogo, mesiCorr);

  // Periodo precedente (stesso numero di mesi a ritroso, dentro l'anno).
  // Se non ci sono abbastanza mesi a sinistra (es. periodo corrente parte
  // da gennaio), il confronto non ha senso: prev = null e niente delta.
  const startPrev = mesiCorr[0] - mesiCorr.length;
  const prevDisponibile = startPrev >= 1;
  const mesiPrev = prevDisponibile
    ? Array.from({ length: mesiCorr.length }, (_, i) => startPrev + i)
    : [];
  const prev = prevDisponibile ? aggrega(riepilogo, mesiPrev) : null;

  const deltaTaxSafe = prev ? corr.tax_safe - prev.tax_safe : null;
  const deltaNettoLordo = prev ? corr.netto_lordo - prev.netto_lordo : null;

  // Salute INPS: imponibile YTD vs soglia 18.415
  const imponibileYTD = riepilogo[mese - 1]?.imponibile_ytd ?? 0;
  const sogliaInps = profile.inps_minimale_annuo;
  const pctSoglia = Math.min(100, (imponibileYTD / sogliaInps) * 100);
  const eccedenzaPrevista = Math.max(0, imponibileYTD - sogliaInps);
  const eccedenzaImporto = eccedenzaPrevista * profile.inps_aliquota_eccedenza;

  // Zavorra fiscale % = tasse / fatturato P.IVA
  const zavorraPct =
    corr.fatturato_piva > 0 ? (corr.zavorra_fiscale / corr.fatturato_piva) * 100 : 0;

  // Giudizio testuale Tax-safe
  const giudizio = corr.tax_safe < 0
    ? { txt: "Stai esagerando: in rosso", tone: "bad" as const }
    : corr.tax_safe < corr.netto_lordo * 0.1
    ? { txt: "Attenzione: margine basso", tone: "warn" as const }
    : { txt: "Stai bene", tone: "good" as const };

  return (
    <div className="px-4 py-5 space-y-5 pb-24">
      <PeriodSelector value={periodo} onChange={setPeriodo} />

      {/* HERO 1 — TI RESTANO DAVVERO */}
      <section className="relative overflow-hidden rounded-3xl brand-gradient p-6 shadow-2xl">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-widest">
            <Wallet className="w-4 h-4" /> Ti restano davvero · {labelPeriodo(periodo, anno, mese)}
          </div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl font-bold text-white tabular drop-shadow">
              {eur(corr.tax_safe)}
            </span>
            <DeltaBadge value={deltaTaxSafe} />
          </div>
          <div className="mt-2 text-white/85 text-sm">{giudizio.txt}</div>
        </div>
      </section>

      {/* HERO 2 — NETTO LORDO + barra salute INPS */}
      <section className="glass-card-strong rounded-3xl p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <TrendingUp className="w-4 h-4" /> Netto Lordo · stipendio del periodo
        </div>
        <div className="mt-2 flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl font-bold tabular text-foreground">{eur(corr.netto_lordo)}</span>
          <DeltaBadge value={deltaNettoLordo} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Salute fiscale INPS — imponibile YTD</span>
            <span className="tabular">{eur(imponibileYTD)} / {eur(sogliaInps)}</span>
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

      {/* 3 INDICATORI CHIAVE */}
      <section className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Saving rate"
          value={`${(corr.saving_rate * 100).toFixed(1)}%`}
          sub={corr.saving_rate >= 0.2 ? "ottimo" : corr.saving_rate >= 0.15 ? "buono" : "da migliorare"}
          tone={corr.saving_rate >= 0.15 ? "good" : "warn"}
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
          value={eur(corr.quota_socio)}
          sub="accantonata"
          tone="default"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </section>

      {/* SCOMPOSIZIONE NETTO LORDO */}
      <section className="glass-card rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
          Scomposizione del Netto Lordo
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniKpi label="Fatturato P.IVA" value={corr.fatturato_piva} tone="good" />
          <MiniKpi label="Entrate private" value={corr.entrate_private} tone="default" />
          <MiniKpi label="Tasse + INPS" value={-corr.zavorra_fiscale} tone="bad" />
          <MiniKpi label="Netto Lordo" value={corr.netto_lordo} tone="primary" />
        </div>
      </section>

      {/* GRAFICO ANDAMENTO MENSILE */}
      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Andamento mensile
          </div>
          <div className="text-[10px] text-muted-foreground">€ per mese</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={riepilogo
              .filter((r) => mesiCorr.includes(r.mese))
              .map((r) => ({
                mese: nomeMese(r.mese).slice(0, 3),
                "Netto Lordo": Math.round(r.netto_lordo_mese),
                "Spese": Math.round(r.spese_effettive_mese),
                "Secchielli": Math.round(r.allocazioni_discrezionali_mese),
              }))}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="mese" tick={{ fill: "#A7A7A7", fontSize: 11 }} axisLine={false} tickLine={false} />
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
      </section>

      {/* TABELLA CATEGORIE SPESA */}
      <CategorieTable mesi={mesiCorr} anno={anno} />

      {/* MICRO INFO */}
      <div className="text-[10px] text-center text-muted-foreground/60 pt-2">
        {prevDisponibile
          ? `Periodo a confronto: ${labelPeriodo(periodo, anno, mesiPrev[mesiPrev.length - 1])}`
          : "Nessun periodo precedente disponibile per il confronto"}
      </div>
    </div>
  );
}

// ─── Sotto-componenti ──────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  const opts: { id: Periodo; label: string }[] = [
    { id: "MESE", label: "Mese" },
    { id: "TRIMESTRE", label: "Trimestre" },
    { id: "ANNO", label: "Anno YTD" },
  ];
  return (
    <div className="glass-card rounded-full p-1 flex">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 h-9 rounded-full text-xs font-medium transition-colors ${
            value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null || Math.abs(value) < 0.5) return null;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
        up ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-destructive/20 text-destructive"
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

function CategorieTable({ mesi, anno }: { mesi: number[]; anno: number }) {
  const profile = getProfile();
  const categorie = listCategorie();
  const spese = listSpese();
  if (!profile) return null;

  const annoUse = profile.anno_fiscale === anno ? anno : anno;
  const sp = spese.filter((s) => {
    if (s.tipo !== "EFFETTIVA") return false;
    const [y, m] = s.data.split("-").map(Number);
    return y === annoUse && mesi.includes(m);
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
    <section className="glass-card rounded-2xl p-4">
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
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.colore }} />
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
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted-foreground">{msg}</div>
  );
}
