import { useEffect, useState } from "react";
import { ensureAnonymousSession, isPinSet, isUnlocked } from "@/lib/auth";
import { hydrate, isOnboarded, subscribe } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PinScreen } from "@/pages/PinScreen";
import { OnboardingWizard } from "@/pages/OnboardingWizard";
import { DashboardCasa } from "@/pages/DashboardCasa";
import { SpeseList } from "@/pages/SpeseList";
import { FiscoScreen } from "@/pages/FiscoScreen";
import { PatrimonioScreen } from "@/pages/PatrimonioScreen";
import { SetupScreen } from "@/pages/SetupScreen";
import { MonthNavigator } from "@/components/MonthNavigator";
import { TabBar, type TabKey } from "@/components/TabBar";
import { QuickAddSheet } from "@/components/QuickAddSheet";

type Phase = "BOOT" | "SETUP" | "PIN" | "ONBOARD" | "APP";

export default function App() {
  const [phase, setPhase] = useState<Phase>("BOOT");
  const [bootError, setBootError] = useState<string | null>(null);
  const today = new Date();
  const [anno, setAnno] = useState(today.getFullYear());
  const [mese, setMese] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<TabKey>("casa");
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Re-render on storage cache notifications.
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  // Boot sequence: ensure Supabase configured → anonymous session → hydrate
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
    <div className="min-h-screen pb-16">
      <MonthNavigator anno={anno} mese={mese} onChange={(a, m) => { setAnno(a); setMese(m); }} />
      <main key={`${tab}-${tick}`}>
        {tab === "casa" && <DashboardCasa anno={anno} mese={mese} refreshKey={tick} />}
        {tab === "spese" && <SpeseList anno={anno} mese={mese} onChange={() => setTick((t) => t + 1)} />}
        {tab === "fisco" && <FiscoScreen anno={anno} refreshKey={tick} />}
        {tab === "patrimonio" && <PatrimonioScreen onChange={() => setTick((t) => t + 1)} />}
      </main>
      <TabBar active={tab} onChange={setTab} onAdd={() => setAddOpen(true)} />
      <QuickAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => setTick((t) => t + 1)}
      />
    </div>
  );
}
