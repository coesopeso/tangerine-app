import { LayoutDashboard, CalendarDays, Plus, LineChart, Settings } from "lucide-react";

export type TabKey = "dashboard" | "mesi" | "investimenti" | "impostazioni";

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
  onAdd: () => void;
}

export function TabBar({ active, onChange, onAdd }: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-card-border safe-bottom">
      <div className="grid grid-cols-5 items-end h-16">
        <TabBtn
          icon={<LayoutDashboard />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => onChange("dashboard")}
        />
        <TabBtn
          icon={<CalendarDays />}
          label="Mesi"
          active={active === "mesi"}
          onClick={() => onChange("mesi")}
        />
        <button
          onClick={onAdd}
          className="flex items-center justify-center -mt-6"
          aria-label="Aggiungi"
        >
          <span className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </span>
        </button>
        <TabBtn
          icon={<LineChart />}
          label="Investimenti"
          active={active === "investimenti"}
          onClick={() => onChange("investimenti")}
        />
        <TabBtn
          icon={<Settings />}
          label="Impostazioni"
          active={active === "impostazioni"}
          onClick={() => onChange("impostazioni")}
        />
      </div>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 h-full justify-center text-xs ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}
