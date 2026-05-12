import { Loader2 } from "lucide-react";
import { eur, nomeMese } from "@/lib/format";
import { getProfile } from "@/lib/storage";
import { useComputeAnno } from "@/lib/useFiscal";

export function FiscoScreen({ anno, refreshKey }: { anno: number; refreshKey: number }) {
  const { data, error, loading } = useComputeAnno(anno, refreshKey);
  const profile = getProfile();

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carico l'anno…
      </div>
    );
  }
  if (error || !data || !profile) {
    return (
      <div className="mx-4 my-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">
        {error ?? "Profilo o dati mancanti"}
      </div>
    );
  }

  const { mesi, totali } = data;
  const soglia = profile.inps_minimale_annuo;
  const pct = soglia > 0 ? Math.min(100, (totali.imponibile_ytd / soglia) * 100) : 0;
  const inpsTot = totali.inps_fisso + totali.inps_eccedenza;

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Imponibile YTD vs soglia INPS</div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold tabular">{eur(totali.imponibile_ytd)}</span>
          <span className="text-xs text-muted-foreground tabular">soglia {eur(soglia)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-[hsl(var(--warning))]" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1 tabular">{pct.toFixed(1)}% della soglia</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Tasse YTD" value={eur(totali.tasse)} />
        <Stat label="INPS YTD" value={eur(inpsTot)} />
        <Stat label="Zavorra YTD" value={eur(totali.zavorra)} accent="destructive" />
        <Stat label="Quota socio YTD" value={eur(totali.quota_socio)} accent="primary" />
      </div>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-card-border">
          Riepilogo mensile {anno}
        </div>
        <div className="divide-y divide-card-border">
          {mesi.map((m) => (
            <div key={m.mese} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{nomeMese(m.mese).slice(0, 3)}</span>
              <span className="tabular text-right text-[hsl(var(--success))]">{eur(m.incassato_piva + m.incassato_privato)}</span>
              <span className="tabular text-right text-destructive">{eur(m.zavorra_fiscale_mese)}</span>
              <span className="tabular text-right text-primary">{eur(m.quota_socio_mese)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 text-xs text-muted-foreground border-t border-card-border">
          <span></span>
          <span className="text-right">incasso</span>
          <span className="text-right">zavorra</span>
          <span className="text-right">socio</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "destructive" | "primary" }) {
  const cls = accent === "destructive" ? "text-destructive" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="bg-card border border-card-border rounded-2xl p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold tabular ${cls}`}>{value}</div>
    </div>
  );
}
