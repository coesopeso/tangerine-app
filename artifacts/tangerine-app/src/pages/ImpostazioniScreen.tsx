/**
 * ImpostazioniScreen — profilo fiscale, parametri INPS, esporta dati, PIN.
 *
 * Stato attuale (S1): vista in sola lettura dei parametri di profilo +
 * azioni base (logout). L'editor completo arriva nel task Impostazioni.
 */
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { getProfile } from "@/lib/storage";
import { signOut } from "@/lib/auth";
import { eur } from "@/lib/format";

export function ImpostazioniScreen() {
  const p = getProfile();

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Impostazioni</h2>
      </div>

      <section className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Profilo fiscale
        </h3>
        {p ? (
          <dl className="text-sm grid grid-cols-2 gap-y-2">
            <dt className="text-muted-foreground">Anno fiscale</dt>
            <dd className="font-medium tabular-nums">{p.anno_fiscale}</dd>
            <dt className="text-muted-foreground">Coefficiente</dt>
            <dd className="font-medium tabular-nums">{(p.coefficiente_redditivita * 100).toFixed(0)}%</dd>
            <dt className="text-muted-foreground">Aliquota imposta</dt>
            <dd className="font-medium tabular-nums">{(p.aliquota_imposta * 100).toFixed(0)}%</dd>
            <dt className="text-muted-foreground">INPS</dt>
            <dd className="font-medium">{p.tipo_inps}</dd>
            <dt className="text-muted-foreground">INPS fisso/mese</dt>
            <dd className="font-medium tabular-nums">{eur(p.inps_fisso_mensile)}</dd>
            <dt className="text-muted-foreground">Soglia minimale</dt>
            <dd className="font-medium tabular-nums">{eur(p.inps_minimale_annuo)}</dd>
            <dt className="text-muted-foreground">Eccedenza</dt>
            <dd className="font-medium tabular-nums">{(p.inps_aliquota_eccedenza * 100).toFixed(2)}%</dd>
            <dt className="text-muted-foreground">Quota socio sim.</dt>
            <dd className="font-medium tabular-nums">{(p.inps_aliquota_socio_simulata * 100).toFixed(2)}%</dd>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Profilo non caricato.</p>
        )}
        <p className="text-xs text-muted-foreground italic pt-2 border-t border-card-border/50">
          Editor parametri in arrivo (task Impostazioni). Per ora i valori sono in sola lettura.
        </p>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sessione
        </h3>
        <button
          onClick={async () => {
            await signOut();
            window.location.reload();
          }}
          className="flex items-center gap-2 text-sm text-destructive font-medium"
        >
          <LogOut className="w-4 h-4" />
          Esci e blocca con PIN
        </button>
      </section>
    </div>
  );
}
