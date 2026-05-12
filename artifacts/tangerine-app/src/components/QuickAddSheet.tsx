import { useEffect, useMemo, useState } from "react";
import { X, Delete, Loader2 } from "lucide-react";
import { listCategorie, upsertFattura, upsertSpesa } from "@/lib/storage";
import { eur } from "@/lib/format";

type Mode = "SPESA" | "FATTURA_PIVA" | "ENTRATA_PRIVATA";

export function QuickAddSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<Mode>("SPESA");
  const [importo, setImporto] = useState("0,00");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [descrizione, setDescrizione] = useState("");
  const [conSocio, setConSocio] = useState(false);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const categorie = useMemo(() => listCategorie().filter((c) => c.attiva), [open]);

  useEffect(() => {
    if (open) {
      setImporto("0,00");
      setDescrizione("");
      setConSocio(false);
      setData(new Date().toISOString().slice(0, 10));
      if (!categoriaId && categorie[0]) setCategoriaId(categorie[0].id);
    }
  }, [open, categoriaId, categorie]);

  if (!open) return null;

  const tap = (ch: string) => {
    setImporto((prev) => {
      const cents = (prev.replace(/[^0-9]/g, "") || "0") + ch;
      const trimmed = cents.replace(/^0+/, "") || "0";
      const padded = trimmed.padStart(3, "0");
      const intPart = padded.slice(0, -2);
      const dec = padded.slice(-2);
      return `${Number(intPart).toLocaleString("it-IT")},${dec}`;
    });
  };
  const back = () => {
    setImporto((prev) => {
      const cents = (prev.replace(/[^0-9]/g, "") || "0").slice(0, -1) || "0";
      const padded = cents.padStart(3, "0");
      const intPart = padded.slice(0, -2);
      const dec = padded.slice(-2);
      return `${Number(intPart).toLocaleString("it-IT")},${dec}`;
    });
  };

  const importoNumber = () => {
    const cents = importo.replace(/[^0-9]/g, "") || "0";
    return Number(cents) / 100;
  };

  const save = async () => {
    const v = importoNumber();
    if (v <= 0 || saving) return;
    setSaving(true);
    try {
      if (mode === "SPESA") {
        if (!categoriaId) return;
        await upsertSpesa({
          data,
          categoria_id: categoriaId,
          importo: v,
          tipo: "EFFETTIVA",
          descrizione: descrizione || "Spesa",
        });
      } else {
        await upsertFattura({
          descrizione: descrizione || (mode === "FATTURA_PIVA" ? "Fattura" : "Entrata"),
          data_incasso: data,
          lordo: v,
          tipo: mode,
          stato: "INCASSATO",
          con_socio: mode === "FATTURA_PIVA" ? conSocio : false,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-card border-t border-card-border rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 bg-secondary rounded-full text-xs">
            {(["SPESA", "FATTURA_PIVA", "ENTRATA_PRIVATA"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-full ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "SPESA" ? "Spesa" : m === "FATTURA_PIVA" ? "Fattura P.IVA" : "Entrata privata"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="text-center my-6">
          <div className="text-4xl font-bold tabular">€ {importo}</div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button key={n} onClick={() => tap(n)} className="h-12 bg-secondary rounded-lg text-xl font-medium hover:bg-secondary/70">
              {n}
            </button>
          ))}
          <button onClick={() => tap("0")} className="h-12 bg-secondary rounded-lg text-xl font-medium hover:bg-secondary/70 col-span-2">0</button>
          <button onClick={back} className="h-12 bg-secondary rounded-lg flex items-center justify-center"><Delete className="w-5 h-5" /></button>
        </div>

        {mode === "SPESA" && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Categoria</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categorie.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoriaId(c.id)}
                  className={`px-3 py-2 rounded-full text-xs whitespace-nowrap border ${
                    categoriaId === c.id ? "border-primary text-primary" : "border-card-border text-muted-foreground"
                  }`}
                  style={{ backgroundColor: categoriaId === c.id ? `${c.colore_hex}22` : undefined }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "FATTURA_PIVA" && (
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input type="checkbox" checked={conSocio} onChange={(e) => setConSocio(e.target.checked)} className="accent-[#FFC048]" />
            Da smezzare con il socio
          </label>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm" />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : `Salva — ${eur(importoNumber())}`}
        </button>
      </div>
    </div>
  );
}
