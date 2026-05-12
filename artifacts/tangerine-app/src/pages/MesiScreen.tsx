/**
 * MesiScreen — vista mese-per-mese con KPI, lista movimenti, secchielli.
 *
 * Stato attuale: S2 — i 4 KPI mese (Incassato P.IVA, Entrate private,
 * Spese, Accantonamenti) calcolati lato client da `calcolaMese`.
 * Lista movimenti, swipe-to-delete, edit sheet e secchielli arrivano in
 * S3-S6.
 */
import { CalendarDays, TrendingUp, Wallet, Receipt, PiggyBank } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import {
  getProfile,
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

  // Il calcolo `calcolaMese` lavora sull'anno di profile.
  // Se l'utente naviga ad altri anni, ricostruiamo un profile "virtuale"
  // con anno_fiscale = anno selezionato così i totali sono corretti.
  const profileScoped = profile.anno_fiscale === anno
    ? profile
    : { ...profile, anno_fiscale: anno };

  const r = calcolaMese(
    listFatture(),
    listSpese(),
    listAllocazioni(),
    profileScoped,
    mese,
  );

  const incassato_totale = r.incassato_piva + r.incassato_privato;
  const totale_uscite = r.spese_effettive_mese + r.allocazioni_secchielli_mese;

  return (
    <div className="px-4 py-5 space-y-5">
      <header className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">
          {nomeMese(mese)} {anno}
        </h2>
      </header>

      {/* 4 KPI MESE — 2x2 mobile, 1x4 desktop */}
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

      {/* Riga di sintesi sotto i KPI: totali entrate/uscite + tax-safe */}
      <section className="rounded-2xl border border-card-border bg-card p-4 grid grid-cols-3 gap-2 text-center">
        <Mini icon={<TrendingUp className="w-4 h-4" />} label="Entrate" value={incassato_totale} tone="success" />
        <Mini icon={<Receipt className="w-4 h-4" />} label="Uscite" value={totale_uscite + r.zavorra_fiscale_mese} tone="destructive" />
        <Mini
          icon={<Wallet className="w-4 h-4" />}
          label="Ti restano"
          value={r.tax_safe_mese}
          tone={r.tax_safe_mese >= 0 ? "primary" : "destructive"}
        />
      </section>

      {/* Placeholder per S3 - lista movimenti */}
      <section className="rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center">
        <PiggyBank className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Lista movimenti in arrivo (S3): tutte le fatture, spese e allocazioni del mese
          raggruppate per giorno, con swipe per eliminare e tap per modificare.
        </p>
      </section>
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
