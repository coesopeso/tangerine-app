/**
 * PeriodPicker — sostituisce MonthNavigator come header globale.
 *
 * Mostra il periodo attivo come "chip" centrale. Frecce ◀ ▶ ai lati per
 * scorrere mese/trimestre/anno-intero (per i tipi non navigabili sono
 * nascoste). Tap sul chip apre uno sheet dove si sceglie il tipo di periodo
 * (Mese, Trimestre, Anno YTD, Anno intero, Personalizzato, Tutti) e i suoi
 * parametri (anno, mese, range custom).
 *
 * Lo stato vive in PeriodProvider (lib/period.ts) ed è persistito.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  defaultsForKind,
  labelPeriodo,
  periodoPrecedente,
  periodoSuccessivo,
  periodoValido,
  usePeriod,
  type Period,
  type PeriodKind,
} from "@/lib/period";
import { nomeMese } from "@/lib/format";

export function PeriodPicker() {
  const { period, setPeriod } = usePeriod();
  const [open, setOpen] = useState(false);

  const navigabile =
    period.kind === "MESE" ||
    period.kind === "TRIMESTRE" ||
    period.kind === "ANNO_INTERO" ||
    period.kind === "ANNO_YTD";

  return (
    <>
      <div className="sticky top-0 z-20 glass bg-background/60 border-b border-white/5">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-2 h-14">
          {navigabile ? (
            <button
              onClick={() => {
                const p = periodoPrecedente(period);
                if (p) setPeriod(p);
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary active:bg-primary/20 active:text-primary"
              aria-label="Periodo precedente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-12" />
          )}

          <button
            onClick={() => setOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 mx-2 h-10 px-4 rounded-xl bg-secondary/40 hover:bg-secondary text-base font-semibold tabular truncate"
          >
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{labelPeriodo(period)}</span>
          </button>

          {navigabile ? (
            <button
              onClick={() => {
                const p = periodoSuccessivo(period);
                if (p) setPeriod(p);
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary active:bg-primary/20 active:text-primary"
              aria-label="Periodo successivo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>
      </div>

      {open && <PeriodSheet onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Sheet selettore ────────────────────────────────────────────

const KINDS: { id: PeriodKind; label: string; desc: string }[] = [
  { id: "MESE", label: "Mese", desc: "un singolo mese" },
  { id: "TRIMESTRE", label: "Trimestre", desc: "3 mesi" },
  { id: "ANNO_YTD", label: "Anno YTD", desc: "da gennaio ad oggi" },
  { id: "ANNO_INTERO", label: "Anno intero", desc: "12 mesi" },
  { id: "CUSTOM", label: "Personalizzato", desc: "scegli da/a" },
  { id: "TUTTI", label: "Tutti i dati", desc: "tutto lo storico" },
];

function PeriodSheet({ onClose }: { onClose: () => void }) {
  const { period, setPeriod } = usePeriod();
  const [draft, setDraft] = useState<Period>(period);

  const setKind = (k: PeriodKind) => {
    setDraft({ ...draft, kind: k, ...defaultsForKind(k, draft) });
  };

  const valido = periodoValido(draft);
  const apply = () => {
    if (!valido) return;
    setPeriod(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-card border-t sm:border border-card-border rounded-t-3xl sm:rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold mb-1">Scegli il periodo</div>
        <div className="text-xs text-muted-foreground mb-4">
          Tutti i dati nelle schermate seguiranno questa scelta.
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {KINDS.map((k) => {
            const active = draft.kind === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  active
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-secondary/30 border-card-border text-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="text-sm font-medium">{k.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{k.desc}</div>
              </button>
            );
          })}
        </div>

        {(draft.kind === "MESE" ||
          draft.kind === "TRIMESTRE" ||
          draft.kind === "ANNO_YTD" ||
          draft.kind === "ANNO_INTERO") && (
          <YearStepper
            value={draft.anno}
            onChange={(a) => setDraft({ ...draft, anno: a })}
          />
        )}

        {draft.kind === "MESE" && (
          <MonthGrid
            value={draft.mese}
            onChange={(m) => setDraft({ ...draft, mese: m })}
          />
        )}

        {draft.kind === "TRIMESTRE" && (
          <TrimGrid
            value={Math.ceil(draft.mese / 3)}
            onChange={(t) => setDraft({ ...draft, mese: t * 3 - 2 })}
          />
        )}

        {draft.kind === "CUSTOM" && (
          <CustomRange
            from={draft.from ?? ""}
            to={draft.to ?? ""}
            onChange={(from, to) => setDraft({ ...draft, from, to })}
          />
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-card-border text-sm hover:bg-secondary"
          >
            Annulla
          </button>
          <button
            onClick={apply}
            disabled={!valido}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Applica
          </button>
        </div>
      </div>
    </div>
  );
}

function YearStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between mb-3 px-2 py-2 rounded-xl bg-secondary/30">
      <button
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="text-lg font-semibold tabular">{value}</div>
      <button
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function MonthGrid({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-2">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`h-11 rounded-lg text-sm font-medium ${
            m === value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/40 hover:bg-secondary"
          }`}
        >
          {nomeMese(m).slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

function TrimGrid({ value, onChange }: { value: number; onChange: (t: number) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-2">
      {[1, 2, 3, 4].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`h-11 rounded-lg text-sm font-medium ${
            t === value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/40 hover:bg-secondary"
          }`}
        >
          Q{t}
        </button>
      ))}
    </div>
  );
}

function CustomRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="space-y-3 mb-2">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Da</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="w-full h-11 px-3 rounded-xl bg-secondary/40 border border-card-border text-sm tabular"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">A</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="w-full h-11 px-3 rounded-xl bg-secondary/40 border border-card-border text-sm tabular"
        />
      </div>
      {from && to && from > to && (
        <div className="text-xs text-destructive">La data "Da" è dopo la data "A".</div>
      )}
    </div>
  );
}
