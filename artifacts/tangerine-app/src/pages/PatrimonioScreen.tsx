import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { eur } from "@/lib/format";
import { listAllocazioni, listSecchielli, upsertAllocazione } from "@/lib/storage";
import type { Secchiello } from "@/lib/types";

export function PatrimonioScreen({ onChange }: { onChange: () => void }) {
  const [refresh, setRefresh] = useState(0);
  const data = useMemo(() => {
    const secchielli = listSecchielli();
    const allocs = listAllocazioni();
    return secchielli.map((s) => {
      const totale = allocs
        .filter((a) => a.secchiello_id === s.id)
        .reduce((sum, a) => sum + Number(a.importo), 0);
      const pct = s.target_importo ? Math.min(100, (totale / s.target_importo) * 100) : null;
      return { s, totale, pct };
    });
  }, [refresh]);

  const aggiungi = async (s: Secchiello) => {
    const v = window.prompt(`Quanto vuoi mettere in "${s.nome}"? (€)`);
    const n = Number((v || "").replace(",", "."));
    if (!isFinite(n) || n <= 0) return;
    const today = new Date();
    const mese = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    try {
      await upsertAllocazione({
        secchiello_id: s.id,
        mese,
        importo: n,
        fonte: "MANUALE",
        nota: "Allocazione manuale",
      });
      setRefresh((r) => r + 1);
      onChange();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      {data.map(({ s, totale, pct }) => (
        <div key={s.id} className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full" style={{ background: s.colore_hex + "33", border: `2px solid ${s.colore_hex}` }} />
            <div className="flex-1">
              <div className="text-sm font-semibold">{s.nome}</div>
              {s.sistema && <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sistema · auto</div>}
            </div>
            {!s.sistema && (
              <button
                onClick={() => aggiungi(s)}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                aria-label="Aggiungi allocazione"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xl font-bold tabular">{eur(totale)}</span>
            {s.target_importo && (
              <span className="text-xs text-muted-foreground tabular">/ {eur(s.target_importo)}</span>
            )}
          </div>
          {pct !== null && (
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
