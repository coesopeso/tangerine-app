import { eur } from "@/lib/format";

interface Props {
  label: string;
  value: number;
  sub?: string;
  tone?: "default" | "primary" | "success" | "destructive" | "warning";
}

export function KpiCard({ label, value, sub, tone = "default" }: Props) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-[hsl(var(--success))]"
      : tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
      ? "text-[hsl(var(--warning))]"
      : "text-foreground";
  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular ${toneCls}`}>{eur(value)}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 tabular">{sub}</div>}
    </div>
  );
}
