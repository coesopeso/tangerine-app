/**
 * MesiScreen — vista del singolo mese.
 *
 * INDIPENDENTE dal PeriodPicker globale: ha il suo MonthNavigator gestito
 * da App.tsx. Default = mese corrente ad ogni ingresso nel tab.
 *
 * Edit/delete spese: task #18 (questo file). Tap su una riga di spesa apre
 * EditSpesaSheet. Edit/delete fatture e allocazioni arriveranno in #17b/c.
 */
import { useMemo, useState } from "react";
import { CalendarDays, TrendingUp, Wallet, Receipt, ChevronRight } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { EditSpesaSheet } from "@/components/EditSpesaSheet";
import {
  getProfile,
  getTaxBucketIds,
  listAllocazioni,
  listCategorie,
  listFatture,
  listSpese,
} from "@/lib/storage";
import { calcolaMese, nomeMese } from "@/lib/fiscal";
import { eur } from "@/lib/format";
import type { Spesa } from "@/lib/types";

interface Props {
  anno: number;
  mese: number;
  onChange: () => void;
}

export function MesiScreen({ anno, mese, onChange }: Props) {
  const [editing, setEditing] = useState<Spesa | null>(null);
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

  const speseDelMese = useMemo(() => {
    return listSpese()
      .filter((s) => {
        const [y, m] = s.data.split("-").map(Number);
        return y === anno && m === mese;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [anno, mese, editing]);

  const categorieById = useMemo(() => {
    const map = new Map<string, { nome: string; colore_hex: string }>();
    for (const c of listCategorie()) map.set(c.id, c);
    return map;
  }, [editing]);

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

        <section className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Spese del mese
            </div>
            <div className="text-xs tabular text-muted-foreground">
              {speseDelMese.length} {speseDelMese.length === 1 ? "voce" : "voci"} · {eur(r.spese_effettive_mese)}
            </div>
          </div>
          {speseDelMese.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessuna spesa registrata in {nomeMese(mese)}.
            </div>
          ) : (
            <ul className="divide-y divide-card-border">
              {speseDelMese.map((s) => {
                const cat = categorieById.get(s.categoria_id);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setEditing(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat?.colore_hex ?? "#888" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {s.descrizione}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{formatDay(s.data)}</span>
                          {cat && <span>· {cat.nome}</span>}
                          {s.tipo === "PROGRAMMATA" && (
                            <span className="text-[hsl(var(--warning))]">· programmata</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold tabular ${
                          s.tipo === "PROGRAMMATA"
                            ? "text-muted-foreground"
                            : "text-destructive"
                        }`}
                      >
                        −{eur(s.importo)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Modifica/elimina di fatture e allocazioni ai secchielli arriverà nei prossimi step.
          </p>
        </section>
      </div>

      <EditSpesaSheet
        spesa={editing}
        onClose={() => setEditing(null)}
        onSaved={onChange}
      />
    </div>
  );
}

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("it-IT", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
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
