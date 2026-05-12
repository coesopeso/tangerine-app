import { useEffect, useRef, useState } from "react";
import { Lock, Delete } from "lucide-react";
import { ensureAnonymousSession, isPinSet, setupPin, verifyPin } from "@/lib/auth";

export function PinScreen({ onUnlock }: { onUnlock: () => Promise<void> | void }) {
  const [setupMode, setSetupMode] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phase, setPhase] = useState<"PIN" | "CONFIRM">("PIN");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);

  useEffect(() => {
    (async () => {
      await ensureAnonymousSession();
      setSetupMode(!(await isPinSet()));
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const locked = lockedUntil !== null && now < lockedUntil;
  const remaining = locked && lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0;

  const current = phase === "PIN" ? pin : confirm;
  const setCurrent = phase === "PIN" ? setPin : setConfirm;

  const tap = (ch: string) => {
    if (locked || busy.current) return;
    setError(null);
    if (current.length >= 6) return;
    setCurrent(current + ch);
  };
  const back = () => setCurrent(current.slice(0, -1));

  useEffect(() => {
    if (setupMode === null) return;
    (async () => {
      if (busy.current) return;
      if (setupMode) {
        if (phase === "PIN" && pin.length === 6) {
          setInfo("Conferma il PIN");
          setPhase("CONFIRM");
        } else if (phase === "CONFIRM" && confirm.length === 6) {
          if (pin !== confirm) {
            setError("I due PIN non coincidono. Riprova.");
            setPin("");
            setConfirm("");
            setInfo(null);
            setPhase("PIN");
          } else {
            try {
              busy.current = true;
              await setupPin(pin);
              await onUnlock();
            } catch (e: any) {
              setError(e?.message ?? "Setup fallito");
              setPin("");
              setConfirm("");
              setPhase("PIN");
            } finally {
              busy.current = false;
            }
          }
        }
      } else {
        if (pin.length === 6) {
          try {
            busy.current = true;
            const r = await verifyPin(pin);
            if (r.ok) {
              await onUnlock();
            } else {
              const remainTxt =
                typeof r.remaining === "number" ? ` ${r.remaining} tentativi rimasti.` : "";
              setError((r.message ?? "PIN errato.") + remainTxt);
              if (r.locked_until) setLockedUntil(new Date(r.locked_until).getTime());
              setPin("");
            }
          } catch (e: any) {
            setError(e?.message ?? "Errore di rete");
            setPin("");
          } finally {
            busy.current = false;
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, confirm, setupMode]);

  const dots = (n: number) =>
    Array.from({ length: 6 }, (_, i) => (
      <div key={i} className={`w-3 h-3 rounded-full ${i < n ? "bg-primary" : "bg-secondary"}`} />
    ));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-6">
        <Lock className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Tangerine</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
        {setupMode === null
          ? "Connessione…"
          : setupMode
          ? phase === "PIN"
            ? "Scegli un PIN di 6 cifre per proteggere i tuoi dati."
            : "Ripeti il PIN per confermare."
          : "Inserisci il PIN per accedere."}
      </p>

      <div className="flex gap-3 mb-8">{dots(current.length)}</div>

      {error && <p className="text-sm text-destructive mb-4 text-center max-w-xs">{error}</p>}
      {info && !error && <p className="text-sm text-muted-foreground mb-4">{info}</p>}
      {locked && (
        <p className="text-sm text-destructive mb-4">
          Bloccato. Riprova fra {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button
            key={n}
            onClick={() => tap(n)}
            disabled={locked || setupMode === null}
            className="h-14 bg-card border border-card-border rounded-2xl text-2xl font-medium hover:bg-secondary disabled:opacity-40"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => tap("0")}
          disabled={locked || setupMode === null}
          className="h-14 bg-card border border-card-border rounded-2xl text-2xl font-medium hover:bg-secondary disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={back}
          className="h-14 bg-card border border-card-border rounded-2xl flex items-center justify-center hover:bg-secondary"
          aria-label="Cancella"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
