import { useEffect, useState } from "react";
import { ensureAnonymousSession, isPinSet, isUnlocked } from "@/lib/auth";
import { hydrate, isOnboarded, subscribe } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PeriodProvider } from "@/lib/period";
import { PinScreen } from "@/pages/PinScreen";
import { OnboardingWizard } from "@/pages/OnboardingWizard";
import { Dashboard } from "@/pages/Dashboard";
import { MesiScreen } from "@/pages/MesiScreen";
import { PatrimonioScreen } from "@/pages/PatrimonioScreen";
import { ImpostazioniScreen } from "@/pages/ImpostazioniScreen";
import { SetupScreen } from "@/pages/SetupScreen";
import { PeriodPicker } from "@/components/PeriodPicker";
import { MonthNavigator } from "@/components/MonthNavigator";
import { TabBar, type TabKey } from "@/components/TabBar";
import { QuickAddSheet } from "@/components/QuickAddSheet";

type Phase = "BOOT" | "SETUP" | "PIN" | "ONBOARD" | "APP";

export default function App() {
  const [phase, setPhase] = useState<Phase>("BOOT");
  const [bootError, setBootError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Stato locale del tab "Mesi" — INDIPENDENTE dal PeriodPicker globale.
  // Si resetta al mese corrente ogni volta che si entra nel tab.
  const today = new Date();
  const [mesiAnno, setMesiAnno] = useState(today.getFullYear());
  const [mesiMese, setMesiMese] = useState(today.getMonth() + 1);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (tab === "mesi") {
      const t = new Date();
      setMesiAnno(t.getFullYear());
      setMesiMese(t.getMonth() + 1);
    }
  }, [tab]);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) {
        setPhase("SETUP");
        return;
      }
      try {
        await ensureAnonymousSession();
        await hydrate();
        const pinExists = await isPinSet();
        if (!pinExists || !isUnlocked()) {
          setPhase("PIN");
        } else if (!isOnboarded()) {
          setPhase("ONBOARD");
        } else {
          setPhase("APP");
        }
      } catch (e: any) {
        console.error("Boot fallito:", e);
        setBootError(e?.message ?? String(e));
        setPhase("SETUP");
      }
    })();
  }, []);

  if (phase === "BOOT") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Caricamento…
      </div>
    );
  }
  if (phase === "SETUP") return <SetupScreen error={bootError} />;
  if (phase === "PIN") {
    return (
      <PinScreen
        onUnlock={async () => {
          await hydrate();
          setPhase(isOnboarded() ? "APP" : "ONBOARD");
        }}
      />
    );
  }
  if (phase === "ONBOARD") {
    return (
      <OnboardingWizard
        onDone={async () => {
          await hydrate();
          setPhase("APP");
        }}
      />
    );
  }

  return (
    <PeriodProvider>
      <div className="min-h-screen pb-16">
        {tab === "dashboard" && <PeriodPicker />}
        {tab === "mesi" && (
          <MonthNavigator
            anno={mesiAnno}
            mese={mesiMese}
            onChange={(a, m) => {
              setMesiAnno(a);
              setMesiMese(m);
            }}
          />
        )}
        <main key={`${tab}-${tick}`}>
          {tab === "dashboard" && <Dashboard />}
          {tab === "mesi" && (
            <MesiScreen anno={mesiAnno} mese={mesiMese} onChange={() => setTick((t) => t + 1)} />
          )}
          {tab === "investimenti" && (
            <PatrimonioScreen onChange={() => setTick((t) => t + 1)} />
          )}
          {tab === "impostazioni" && <ImpostazioniScreen />}
        </main>
        <TabBar active={tab} onChange={setTab} onAdd={() => setAddOpen(true)} />
        <QuickAddSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={() => setTick((t) => t + 1)}
        />
      </div>
    </PeriodProvider>
  );
}
