import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import {
  bootstrapNewUser,
  getProfile,
  hydrate,
  listCategorie,
  listSecchielli,
  markOnboarded,
  saveCategorie,
  saveSecchielli,
  upsertFattura,
} from "@/lib/storage";
import { fattureSeedDemo, PROFILE_AUGUSTO_DEFAULT } from "@/lib/seed";
import type { Profile, TipoInps } from "@/lib/types";

const COEFFS = [0.40, 0.54, 0.62, 0.67, 0.73, 0.78, 0.86];

export function OnboardingWizard({ onDone }: { onDone: () => Promise<void> | void }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile>(PROFILE_AUGUSTO_DEFAULT);
  const [categorie, setCategorie] = useState(listCategorie());
  const [secchielli, setSecchielli] = useState(listSecchielli());
  const [importDemo, setImportDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Crea profile + categorie + secchielli di default appena entriamo in onboarding,
  // poi tieni i form locali in sync.
  useEffect(() => {
    (async () => {
      const existing = getProfile();
      if (!existing) {
        try {
          await bootstrapNewUser(profile);
          await hydrate();
        } catch (e: any) {
          setErr(e?.message ?? String(e));
          return;
        }
      } else {
        setProfile(existing);
      }
      setCategorie(listCategorie());
      setSecchielli(listSecchielli());
      setBootstrapped(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTipoInpsChange = (t: TipoInps) => {
    if (t === "ARTIGIANI") setProfile({ ...profile, tipo_inps: t, inps_minimale_annuo: 18415, inps_fisso_mensile: 384.31, inps_aliquota_eccedenza: 0.24 });
    else if (t === "COMMERCIANTI") setProfile({ ...profile, tipo_inps: t, inps_minimale_annuo: 18555, inps_fisso_mensile: 376.78, inps_aliquota_eccedenza: 0.24 });
    else setProfile({ ...profile, tipo_inps: t, inps_fisso_mensile: 0, inps_minimale_annuo: 0 });
  };

  const finish = async () => {
    setBusy(true);
    setErr(null);
    try {
      await bootstrapNewUser(profile);
      await saveCategorie(categorie);
      await saveSecchielli(secchielli);
      if (importDemo) {
        for (const f of fattureSeedDemo(profile.anno_fiscale)) {
          await upsertFattura(f);
        }
      }
      await markOnboarded();
      await onDone();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => (step < 5 ? setStep(step + 1) : finish());
  const prev = () => step > 1 && setStep(step - 1);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Passo {step} di 5</div>
        <h1 className="text-2xl font-bold mt-1">
          {step === 1 && "Parametri fiscali"}
          {step === 2 && "Punto Zero"}
          {step === 3 && "Categorie spese"}
          {step === 4 && "Secchielli risparmio"}
          {step === 5 && "Conferma"}
        </h1>
      </header>

      <main className="flex-1 px-6 pb-32 overflow-y-auto">
        {!bootstrapped && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparo il tuo account…
          </div>
        )}

        {bootstrapped && step === 1 && (
          <div className="space-y-4">
            <Field label="Anno fiscale">
              <input
                type="number"
                value={profile.anno_fiscale}
                onChange={(e) => setProfile({ ...profile, anno_fiscale: Number(e.target.value) })}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
              />
            </Field>
            <Field label="Coefficiente redditività ATECO">
              <select
                value={profile.coefficiente_redditivita}
                onChange={(e) => setProfile({ ...profile, coefficiente_redditivita: Number(e.target.value) })}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
              >
                {COEFFS.map((c) => <option key={c} value={c}>{c.toFixed(2)} ({Math.round(c * 100)}%)</option>)}
              </select>
            </Field>
            <Field label="Aliquota imposta">
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 0.05, l: "5% startup" }, { v: 0.15, l: "15% standard" }].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setProfile({ ...profile, aliquota_imposta: o.v })}
                    className={`h-11 rounded-lg border ${profile.aliquota_imposta === o.v ? "border-primary text-primary bg-primary/10" : "border-card-border"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tipo INPS">
              <div className="grid grid-cols-3 gap-2">
                {(["ARTIGIANI", "COMMERCIANTI", "GESTIONE_SEPARATA"] as TipoInps[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => onTipoInpsChange(t)}
                    className={`h-11 rounded-lg text-xs border ${profile.tipo_inps === t ? "border-primary text-primary bg-primary/10" : "border-card-border"}`}
                  >
                    {t === "GESTIONE_SEPARATA" ? "Gest. Sep." : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Field>
            {(profile.tipo_inps === "ARTIGIANI" || profile.tipo_inps === "COMMERCIANTI") && (
              <>
                <Field label="INPS fisso mensile (€)">
                  <input
                    type="number"
                    step="0.01"
                    value={profile.inps_fisso_mensile}
                    onChange={(e) => setProfile({ ...profile, inps_fisso_mensile: Number(e.target.value) })}
                    className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
                  />
                </Field>
                <Field label="Soglia imponibile annuo (€)">
                  <input
                    type="number"
                    value={profile.inps_minimale_annuo}
                    onChange={(e) => setProfile({ ...profile, inps_minimale_annuo: Number(e.target.value) })}
                    className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
                  />
                </Field>
              </>
            )}
            <Field label="Aliquota socio simulata">
              <input
                type="number"
                step="0.0001"
                value={profile.inps_aliquota_socio_simulata}
                onChange={(e) => setProfile({ ...profile, inps_aliquota_socio_simulata: Number(e.target.value) })}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
              />
            </Field>
          </div>
        )}

        {bootstrapped && step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inserisci la liquidità e gli investimenti al 1° gennaio dell'anno fiscale.
            </p>
            <Field label="Liquidità iniziale (€)">
              <input
                type="number"
                step="0.01"
                value={profile.liquidita_iniziale}
                onChange={(e) => setProfile({ ...profile, liquidita_iniziale: Number(e.target.value) })}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
              />
            </Field>
            <Field label="Investimenti iniziali (€)">
              <input
                type="number"
                step="0.01"
                value={profile.investimenti_iniziali}
                onChange={(e) => setProfile({ ...profile, investimenti_iniziali: Number(e.target.value) })}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 tabular"
              />
            </Field>
          </div>
        )}

        {bootstrapped && step === 3 && (
          <div className="space-y-2">
            {categorie.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-3">
                <div className="w-8 h-8 rounded-full" style={{ background: c.colore_hex + "33", border: `2px solid ${c.colore_hex}` }} />
                <input
                  value={c.nome}
                  onChange={(e) => {
                    const next = [...categorie];
                    next[i] = { ...c, nome: e.target.value };
                    setCategorie(next);
                  }}
                  className="flex-1 bg-transparent text-sm font-medium"
                />
                <input
                  type="number"
                  value={c.budget_mensile}
                  onChange={(e) => {
                    const next = [...categorie];
                    next[i] = { ...c, budget_mensile: Number(e.target.value) };
                    setCategorie(next);
                  }}
                  className="w-20 bg-secondary rounded px-2 py-1 text-sm tabular text-right"
                />
                <span className="text-xs text-muted-foreground">€/mese</span>
              </div>
            ))}
          </div>
        )}

        {bootstrapped && step === 4 && (
          <div className="space-y-2">
            {secchielli.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-3">
                <div className="w-8 h-8 rounded-full" style={{ background: s.colore_hex + "33", border: `2px solid ${s.colore_hex}` }} />
                <div className="flex-1">
                  <input
                    value={s.nome}
                    disabled={s.sistema}
                    onChange={(e) => {
                      const next = [...secchielli];
                      next[i] = { ...s, nome: e.target.value };
                      setSecchielli(next);
                    }}
                    className="w-full bg-transparent text-sm font-medium"
                  />
                  {s.sistema && <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sistema</div>}
                </div>
                <input
                  type="number"
                  value={s.target_importo ?? 0}
                  onChange={(e) => {
                    const next = [...secchielli];
                    next[i] = { ...s, target_importo: Number(e.target.value) || null };
                    setSecchielli(next);
                  }}
                  className="w-24 bg-secondary rounded px-2 py-1 text-sm tabular text-right"
                />
                <span className="text-xs text-muted-foreground">€ obj.</span>
              </div>
            ))}
          </div>
        )}

        {bootstrapped && step === 5 && (
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
              <Row label="Tipo INPS" value={profile.tipo_inps} />
              <Row label="Coefficiente" value={profile.coefficiente_redditivita.toFixed(2)} />
              <Row label="Aliquota" value={`${profile.aliquota_imposta * 100}%`} />
              <Row label="INPS fisso" value={`€ ${profile.inps_fisso_mensile.toFixed(2)} / mese`} />
              <Row label="Soglia" value={`€ ${profile.inps_minimale_annuo}`} />
              <Row label="Categorie" value={`${categorie.length}`} />
              <Row label="Secchielli" value={`${secchielli.length}`} />
            </div>
            <label className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={importDemo}
                onChange={(e) => setImportDemo(e.target.checked)}
                className="accent-[#FFC048] w-4 h-4"
              />
              <div className="text-sm">
                <div className="font-medium">Importa dati demo Marzo 2026</div>
                <div className="text-xs text-muted-foreground">
                  3 fatture P.IVA con socio + 4 entrate private — utile per verificare i numeri.
                </div>
              </div>
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 border-t border-card-border bg-card p-4 flex gap-3 safe-bottom">
        <button
          onClick={prev}
          disabled={step === 1 || busy}
          className="h-12 px-4 rounded-xl border border-card-border flex items-center gap-1 text-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Indietro
        </button>
        <button
          onClick={next}
          disabled={busy || !bootstrapped}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 5 ? <>Inizia <Check className="w-5 h-5" /></> : <>Avanti <ChevronRight className="w-5 h-5" /></>}
        </button>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}
