import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { deleteSpesa, listCategorie, upsertSpesa } from "@/lib/storage";
import type { Spesa, TipoSpesa } from "@/lib/types";
import { eur } from "@/lib/format";

interface Props {
  spesa: Spesa | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSpesaSheet({ spesa, onClose, onSaved }: Props) {
  const [data, setData] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [importoStr, setImportoStr] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [tipo, setTipo] = useState<TipoSpesa>("EFFETTIVA");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categorie = useMemo(() => listCategorie().filter((c) => c.attiva), [spesa]);

  useEffect(() => {
    if (spesa) {
      setData(spesa.data);
      setDescrizione(spesa.descrizione);
      setImportoStr(
        spesa.importo
          .toFixed(2)
          .replace(".", ","),
      );
      setCategoriaId(spesa.categoria_id);
      setTipo(spesa.tipo);
      setConfirmDelete(false);
    }
  }, [spesa]);

  if (!spesa) return null;

  const importoNumber = parseImportoIt(importoStr);

  const isValid =
    importoNumber > 0 &&
    descrizione.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    categoriaId.length > 0;

  const save = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await upsertSpesa({
        id: spesa.id,
        data,
        categoria_id: categoriaId,
        importo: importoNumber,
        tipo,
        descrizione: descrizione.trim(),
        note: spesa.note ?? null,
        sottocategoria_id: spesa.sottocategoria_id ?? null,
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteSpesa(spesa.id);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border-t border-card-border rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold">Modifica spesa</div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!isValid || saving}
              className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Descrizione">
            <input
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm"
              placeholder="Es. Spesa al supermercato"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Importo">
              <input
                inputMode="decimal"
                value={importoStr}
                onChange={(e) =>
                  setImportoStr(e.target.value.replace(/[^0-9,\.]/g, ""))
                }
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm tabular"
                placeholder="0,00"
              />
              <div className="text-[10px] text-muted-foreground mt-1 tabular">
                = {eur(importoNumber)}
              </div>
            </Field>
            <Field label="Data">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Tipo">
            <div className="flex gap-1 p-1 bg-secondary rounded-full text-xs w-fit">
              {(["EFFETTIVA", "PROGRAMMATA"] as TipoSpesa[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-1.5 rounded-full ${
                    tipo === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {t === "EFFETTIVA" ? "Effettiva" : "Programmata"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Categoria">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categorie.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoriaId(c.id)}
                  className={`px-3 py-2 rounded-full text-xs whitespace-nowrap border ${
                    categoriaId === c.id
                      ? "border-primary text-primary"
                      : "border-card-border text-muted-foreground"
                  }`}
                  style={{
                    backgroundColor:
                      categoriaId === c.id ? `${c.colore_hex}22` : undefined,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: c.colore_hex }}
                  />
                  {c.nome}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 pt-4 border-t border-card-border">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="w-full h-11 rounded-xl border border-destructive/40 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Elimina spesa
            </button>
          ) : (
            <div className="rounded-xl bg-destructive/10 border border-destructive/40 p-3">
              <div className="text-sm text-foreground mb-3">
                Eliminare questa spesa? L'azione non si può annullare.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 h-10 rounded-lg bg-secondary text-sm"
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  onClick={remove}
                  disabled={saving}
                  className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Elimina
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Parser tollerante per importi in formato it-IT: tratta l'ULTIMO separatore
 * (',' o '.') come decimale e tutti i precedenti come migliaia.
 * Esempi: "1234,56" -> 1234.56 · "1.234,56" -> 1234.56 · "1234.56" -> 1234.56
 *         "1,234.56" -> 1234.56 · "1.234" -> 1234 (intero, no decimali).
 */
function parseImportoIt(raw: string): number {
  const s = raw.trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decPos = Math.max(lastComma, lastDot);
  let intPart: string;
  let decPart = "";
  if (decPos === -1) {
    intPart = s;
  } else {
    intPart = s.slice(0, decPos);
    decPart = s.slice(decPos + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart)) return 0;
  const normalized = decPart ? `${intPart || "0"}.${decPart}` : intPart || "0";
  const n = Number(normalized);
  return isFinite(n) ? n : 0;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
