/**
 * MesiScreen — vista del singolo mese.
 *
 * INDIPENDENTE dal PeriodPicker globale: ha il suo MonthNavigator gestito
 * da App.tsx. Default = mese corrente ad ogni ingresso nel tab.
 *
 * NB: Edit/delete movimenti + secchielli = task #8 (in pausa).
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
import { calcolaMese, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";

interface Props {
  anno: number;
  mese: number;
  onChange: () => void;
}

export function MesiScreen({ anno, mese }: Props) {
  const profile = getProfile();
  if (!profile) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted-foreground">
          Profilo non caricato.
        </div>
      </div>
    );
  }

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

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Incassato P.IVA"
            value={r.incassato_piva}
            tone="primary"
            sub={r.imponibile_mese > 0 ? `Imponibile ${eur(r.imponibile_mese)}` : undefined}
          />
          <KpiCard label="Entrate private" value={r.incassato_privato} tone="default" sub="Non fiscali" />
          <KpiCard label="Spese del mese" value={r.spese_effettive_mese} tone="destructive" />
          <KpiCard
            label="Accantonato"
            value={r.allocazioni_secchielli_mese}
            tone="success"
            sub="Tasse + INPS + secchielli"
          />
        </section>

        <section className="glass-card rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
          <Mini icon={<TrendingUp className="w-4 h-4" />} label="Entrate" value={incassato_totale} tone="success" />
          <Mini icon={<Receipt className="w-4 h-4" />} label="Uscite" value={totale_uscite + r.zavorra_fiscale_mese} tone="destructive" />
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

function Mini({
  icon,
  label,
  value,
  tone,
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
