/**
 * MesiScreen — vista guidata dal periodo globale.
 *
 * - Se period.kind === "MESE": vista classica con KPI del singolo mese.
 * - Altrimenti: lista compatta di tutti i mesi coperti dal periodo, ognuno
 *   con i 3 numeri-chiave (Netto Lordo · Spese · Tax-safe).
 *
 * NB: Le funzionalità di edit/delete movimenti e secchielli sono il task #8
 * (in pausa per scelta dell'utente).
 */
import { CalendarDays, TrendingUp, Wallet, Receipt } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import {
  getProfile,
  getTaxBucketIds,
  listAllocazioni,
  listFatture,
  listSpese,
} from "@/lib/storage";
import { aggregaPeriodo, calcolaMese, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";
import { labelPeriodo, usePeriod } from "@/lib/period";

export function MesiScreen() {
  const profile = getProfile();
  const { period } = usePeriod();

  if (!profile) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted-foreground">
          Profilo non caricato.
        </div>
      </div>
    );
  }

  if (period.kind === "MESE") {
    return <MeseSingoloView anno={period.anno} mese={period.mese} />;
  }

  return <ListaMesiView />;
}

// ─── Mese singolo (era il vecchio MesiScreen) ───────────────────

function MeseSingoloView({ anno, mese }: { anno: number; mese: number }) {
  const profile = getProfile()!;
  const profileScoped =
    profile.anno_fiscale === anno ? profile : { ...profile, anno_fiscale: anno };

  const r = calcolaMese(
    listFatture(),
    listSpese(),
    listAllocazioni(),
    profileScoped,
    mese,
    getTaxBucketIds(),
  );

  const incassato_totale = r.incassato_piva + r.incassato_privato;
  const totale_uscite = r.spese_effettive_mese + r.allocazioni_secchielli_mese;

  return (
    <div className="px-4 py-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl brand-gradient p-5 shadow-2xl">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-widest">
              <CalendarDays className="w-4 h-4" />
              Riepilogo mese
            </div>
            <h2 className="text-3xl font-bold text-white mt-1">
              {nomeMese(mese)} {anno}
            </h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white tabular drop-shadow">
                {eur(r.tax_safe_mese)}
              </span>
              <span className="text-white/70 text-sm">ti restano davvero</span>
            </div>
          </div>
        </header>

        {/* KPI 4-up */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Incassato P.IVA"
            value={r.incassato_piva}
            tone="primary"
            sub={r.imponibile_mese > 0 ? `Imponibile ${eur(r.imponibile_mese)}` : undefined}
          />
          <KpiCard
            label="Entrate private"
            value={r.incassato_privato}
            tone="default"
            sub="Non fiscali"
          />
          <KpiCard
            label="Spese del mese"
            value={r.spese_effettive_mese}
            tone="destructive"
          />
          <KpiCard
            label="Accantonato"
            value={r.allocazioni_secchielli_mese}
            tone="success"
            sub="Tasse + INPS + secchielli"
          />
        </section>

        <section className="glass-card rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
          <Mini
            icon={<TrendingUp className="w-4 h-4" />}
            label="Entrate"
            value={incassato_totale}
            tone="success"
          />
          <Mini
            icon={<Receipt className="w-4 h-4" />}
            label="Uscite"
            value={totale_uscite + r.zavorra_fiscale_mese}
            tone="destructive"
          />
          <Mini
            icon={<Wallet className="w-4 h-4" />}
            label="Ti restano"
            value={r.tax_safe_mese}
            tone={r.tax_safe_mese >= 0 ? "primary" : "destructive"}
          />
        </section>

        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Lista movimenti del mese in arrivo (task #8 in pausa): tutte le fatture,
            spese e allocazioni del mese raggruppate per giorno, con swipe per
            eliminare e tap per modificare.
          </p>
        </section>
      </div>
    </div>
  );
}

// ─── Lista mesi del periodo ─────────────────────────────────────

function ListaMesiView() {
  const profile = getProfile()!;
  const { period } = usePeriod();
  const agg = aggregaPeriodo(
    period,
    listFatture(),
    listSpese(),
    listAllocazioni(),
    profile,
    getTaxBucketIds(),
  );

  return (
    <div className="px-4 py-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold">Mesi del periodo</h2>
            <div className="text-xs text-muted-foreground">{labelPeriodo(period)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Tax-safe totale
            </div>
            <div
              className={`text-lg font-bold tabular ${
                agg.tax_safe >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"
              }`}
            >
              {eur(agg.tax_safe)}
            </div>
          </div>
        </header>

        {agg.per_mese.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nessun mese coperto dal periodo selezionato.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agg.per_mese.map((r) => (
              <article
                key={`${r.anno}-${r.mese}`}
                className="glass-card rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-base font-semibold">
                    {nomeMese(r.mese)} {r.anno}
                  </div>
                  <div
                    className={`text-base font-bold tabular ${
                      r.tax_safe_mese >= 0
                        ? "text-[hsl(var(--success))]"
                        : "text-destructive"
                    }`}
                  >
                    {eur(r.tax_safe_mese)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <KvSmall label="Netto Lordo" value={r.netto_lordo_mese} tone="primary" />
                  <KvSmall label="Spese" value={r.spese_effettive_mese} tone="destructive" />
                  <KvSmall
                    label="Secchielli"
                    value={r.allocazioni_secchielli_mese}
                    tone="default"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pezzi UI ───────────────────────────────────────────────────

function Mini({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "primary" | "success" | "destructive";
}) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-[hsl(var(--success))]"
      : tone === "destructive"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-base font-semibold tabular ${cls}`}>{eur(value)}</div>
    </div>
  );
}

function KvSmall({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "destructive" | "default";
}) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "destructive"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </div>
      <div className={`text-xs font-semibold tabular ${cls}`}>{eur(value)}</div>
    </div>
  );
}
