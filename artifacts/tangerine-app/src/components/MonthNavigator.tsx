import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { nomeMese } from "@/lib/format";

interface Props {
  anno: number;
  mese: number;
  onChange: (anno: number, mese: number) => void;
}

export function MonthNavigator({ anno, mese, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const prev = () => {
    if (mese === 1) onChange(anno - 1, 12);
    else onChange(anno, mese - 1);
  };
  const next = () => {
    if (mese === 12) onChange(anno + 1, 1);
    else onChange(anno, mese + 1);
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-card/80 glass border-b border-card-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={prev}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary active:bg-primary/20 active:text-primary"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="text-lg font-semibold tabular px-4 py-2 rounded-lg hover:bg-secondary"
          >
            {nomeMese(mese)} {anno}
          </button>
          <button
            onClick={next}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary active:bg-primary/20 active:text-primary"
            aria-label="Mese successivo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-card border-t sm:border border-card-border rounded-t-2xl sm:rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => onChange(anno - 1, mese)}
                className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Anno precedente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-xl font-semibold tabular">{anno}</div>
              <button
                onClick={() => onChange(anno + 1, mese)}
                className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Anno successivo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onChange(anno, m);
                    setOpen(false);
                  }}
                  className={`h-12 rounded-lg text-sm font-medium ${
                    m === mese
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/70"
                  }`}
                >
                  {nomeMese(m).slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
