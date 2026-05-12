import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { deleteFattura, deleteSpesa, listCategorie, listFatture, listSpese } from "@/lib/storage";
import { eur } from "@/lib/format";

interface Row {
  id: string;
  tipo: "spesa" | "entrata";
  data: string;
  descrizione: string;
  meta: string;
  importo: number;
  colore: string;
}

export function SpeseList({ anno, mese, onChange }: { anno: number; mese: number; onChange: () => void }) {
  const rows = useMemo<Row[]>(() => {
    const cat = new Map(listCategorie().map((c) => [c.id, c]));
    const ms = String(mese).padStart(2, "0");
    const ymPrefix = `${anno}-${ms}`;
    const spese: Row[] = listSpese()
      .filter((s) => s.data?.startsWith(ymPrefix))
      .map((s) => ({
        id: "s:" + s.id,
        tipo: "spesa",
        data: s.data,
        descrizione: s.descrizione,
        meta: cat.get(s.categoria_id)?.nome ?? "—",
        importo: -Number(s.importo),
        colore: cat.get(s.categoria_id)?.colore_hex ?? "#9CA3AF",
      }));
    const fatture: Row[] = listFatture()
      .filter((f) => f.data_incasso?.startsWith(ymPrefix))
      .map((f) => ({
        id: "f:" + f.id,
        tipo: "entrata",
        data: f.data_incasso!,
        descrizione: f.descrizione,
        meta: f.tipo === "FATTURA_PIVA" ? (f.con_socio ? "P.IVA · socio" : "P.IVA") : "Privato",
        importo: Number(f.lordo),
        colore: f.tipo === "FATTURA_PIVA" ? "#FFC048" : "#4A9EFF",
      }));
    return [...spese, ...fatture].sort((a, b) => b.data.localeCompare(a.data));
  }, [anno, mese]);

  const remove = async (id: string) => {
    try {
      if (id.startsWith("s:")) await deleteSpesa(id.slice(2));
      else await deleteFattura(id.slice(2));
      onChange();
    } catch (e) {
      console.error("delete error", e);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted-foreground">
        Nessun movimento questo mese. Tocca <span className="text-primary font-semibold">+</span> per aggiungerne uno.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2 pb-24">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-3">
          <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: r.colore + "22", border: `2px solid ${r.colore}` }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{r.descrizione}</div>
            <div className="text-xs text-muted-foreground">{r.meta} · {r.data.split("-").reverse().join("/")}</div>
          </div>
          <div className={`text-sm tabular font-semibold ${r.importo < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
            {r.importo < 0 ? eur(-r.importo) : "+" + eur(r.importo)}
          </div>
          <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground" aria-label="Elimina">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
