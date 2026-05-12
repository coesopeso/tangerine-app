import { TrendingDown, TrendingUp, Wallet, Calculator, Loader2 } from "lucide-react";
import { eur } from "@/lib/format";
import { listAllocazioni, listSecchielli } from "@/lib/storage";
import { useComputeMese } from "@/lib/useFiscal";
import { KpiCard } from "@/components/KpiCard";

export function DashboardCasa({ anno, mese, refreshKey }: { anno: number; mese: number; refreshKey: number }) {
  const { data: r, error, loading } = useComputeMese(anno, mese, refreshKey);

  if (loading && !r) return <Loading />;
  if (error) return <ErrBox msg={error} />;
  if (!r) return null;

  const incassoTot = r.incassato_piva + r.incassato_privato;
  const sock = listSecchielli().find((s) => s.slug === "QUOTA_SOCIO");
  const allocSock = sock
    ? listAllocazioni().filter((a) => a.secchiello_id === sock.id).reduce((s, a) => s + Number(a.importo), 0)
    : 0;

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Incassato mese" value={incassoTot} sub={`P.IVA ${eur(r.incassato_piva)}`} tone="success" />
        <KpiCard label="Da accantonare" value={r.zavorra_fiscale_mese} sub="Tasse + INPS" tone="destructive" />
        <KpiCard label="Tax Safe" value={r.tax_safe_mese} sub={r.tax_safe_mese < 0 ? "Mese in rosso" : "Disponibile"} tone={r.tax_safe_mese < 0 ? "warning" : "primary"} />
        <KpiCard label="Saving rate" value={r.allocazioni_secchielli_mese} sub={`${(r.saving_rate * 100).toFixed(1)}% incasso`} />
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">Dettaglio fiscale del mese</div>
        <DetailRow icon={<Calculator className="w-4 h-4" />} label="Imponibile mese" value={eur(r.imponibile_mese)} />
        <DetailRow icon={<Calculator className="w-4 h-4" />} label="Imponibile YTD" value={eur(r.imponibile_ytd)} />
        <div className="h-px bg-card-border my-2" />
        <DetailRow icon={<TrendingDown className="w-4 h-4 text-destructive" />} label="Tasse mese" value={eur(r.tasse_mese)} />
        <DetailRow icon={<TrendingDown className="w-4 h-4 text-destructive" />} label="INPS fisso" value={eur(r.inps_fisso_mese)} />
        <DetailRow icon={<TrendingDown className="w-4 h-4 text-destructive" />} label="INPS eccedenza" value={eur(r.inps_eccedenza_mese)} />
        <div className="h-px bg-card-border my-2" />
        <DetailRow icon={<Wallet className="w-4 h-4 text-primary" />} label="Quota socio (in secchiello)" value={eur(r.quota_socio_mese)} highlight />
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">Flusso del mese</div>
        <DetailRow icon={<TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />} label="Entrate totali" value={eur(incassoTot)} />
        <DetailRow icon={<TrendingDown className="w-4 h-4 text-destructive" />} label="Spese effettive" value={eur(r.spese_effettive_mese)} />
        <DetailRow icon={<Wallet className="w-4 h-4" />} label="Allocato a secchielli" value={eur(r.allocazioni_secchielli_mese)} />
        <div className="h-px bg-card-border my-2" />
        <DetailRow icon={<></>} label="Quota socio accumulata YTD" value={eur(allocSock)} />
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm tabular ${highlight ? "font-bold text-primary" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Calcolo del mese in corso…
    </div>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="mx-4 my-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">
      Errore Edge Function: {msg}
    </div>
  );
}
