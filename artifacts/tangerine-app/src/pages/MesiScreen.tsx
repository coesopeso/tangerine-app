/**
 * MesiScreen — vista mese-per-mese con KPI, lista movimenti, secchielli del mese.
 *
 * Stato attuale (S1): placeholder strutturale che mostra cosa arriverà
 * negli step successivi. Il contenuto reale (KPI, lista, edit/delete)
 * arriva in S2-S6.
 */
import { CalendarDays } from "lucide-react";

interface Props {
  anno: number;
  mese: number;
  onChange: () => void;
}

export function MesiScreen({ anno, mese }: Props) {
  return (
    <div className="px-4 py-6 space-y-6">
      <div className="rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center">
        <CalendarDays className="w-10 h-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold mb-1">
          Mesi — {String(mese).padStart(2, "0")}/{anno}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Schermata in costruzione. Nei prossimi step arriveranno: 4 KPI mese,
          lista movimenti raggruppata per giorno con swipe-to-delete e undo,
          bottom sheet di modifica per ogni voce, e sezione collassabile dei
          secchielli del mese.
        </p>
      </div>
    </div>
  );
}
