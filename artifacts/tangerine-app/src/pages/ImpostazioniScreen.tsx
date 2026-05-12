/**
 * ImpostazioniScreen — profilo fiscale, parametri INPS, esporta dati, PIN.
 *
 * Stato attuale (S1): vista in sola lettura dei parametri di profilo +
 * azioni base (logout). L'editor completo arriva nel task Impostazioni.
 */
import { Check, LogOut, Palette, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { getProfile, saveProfile } from "@/lib/storage";
import { signOut } from "@/lib/auth";
import { eur } from "@/lib/format";
import {
  TEMA_COLORI,
  TEMA_COLORE_LABEL,
  TEMA_COLORE_SWATCH,
  applyTema,
  getStoredTema,
  type TemaColore,
} from "@/lib/theme";

export function ImpostazioniScreen() {
  const p = getProfile();
  // Se il profilo ancora non ha il campo (vecchi utenti), partiamo dal valore
  // già applicato (localStorage / default).
  const initialTema: TemaColore = p?.tema_colore ?? getStoredTema();
  const [tema, setTema] = useState<TemaColore>(initialTema);
  const [savingTema, setSavingTema] = useState<TemaColore | null>(null);

  async function handlePickTema(t: TemaColore) {
    if (t === tema) return;
    // Optimistic: applica subito (anche su localStorage), poi prova a salvare.
    applyTema(t);
    setTema(t);
    if (!p) return;
    try {
      setSavingTema(t);
      await saveProfile({ ...p, tema_colore: t });
    } catch (e) {
      console.error("Salvataggio tema fallito:", e);
    } finally {
      setSavingTema(null);
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Impostazioni</h2>
      </div>

      <section className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Tema colore
        </h3>
        <p className="text-xs text-muted-foreground">
          Sceglie il colore di accento dell'app. La scelta viene salvata sul tuo profilo.
        </p>
        <div className="grid grid-cols-6 gap-3 pt-1">
          {TEMA_COLORI.map((t) => {
            const selected = t === tema;
            const saving = savingTema === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handlePickTema(t)}
                disabled={saving}
                aria-label={TEMA_COLORE_LABEL[t]}
                aria-pressed={selected}
                title={TEMA_COLORE_LABEL[t]}
                className={[
                  "relative aspect-square rounded-full border transition",
                  selected
                    ? "border-foreground/80 ring-2 ring-foreground/40"
                    : "border-card-border hover:border-foreground/40",
                  saving ? "opacity-60" : "",
                ].join(" ")}
                style={{ backgroundColor: TEMA_COLORE_SWATCH[t] }}
              >
                {selected && (
                  <Check
                    className="w-4 h-4 absolute inset-0 m-auto text-white drop-shadow"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          {TEMA_COLORE_LABEL[tema]}
        </p>
      </section>

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
