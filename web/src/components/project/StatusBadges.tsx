import { Badge } from "@/components/ui/primitives";
import { FUNDING_META, SCHEDULE_META } from "@/lib/labels";
import type { Project } from "@/lib/types";

export function StatusBadges({ p }: { p: Project }) {
  const s = SCHEDULE_META[p.derived.schedule_status];
  const f = FUNDING_META[p.derived.funding_status];
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge tone={s.tone}>
        {s.label}
        {p.derived.schedule_status !== "on_schedule" && p.derived.delay_months ? ` · ${p.derived.delay_months} mo` : ""}
      </Badge>
      {p.derived.funding_status !== "within_sanction" && <Badge tone={f.tone}>{f.label}</Badge>}
      {p.data_quality.verify && <Badge tone="neutral">Verify data</Badge>}
    </span>
  );
}

export function topDriver(p: Project): string {
  const d = p.risk.drivers.find((x) => x.direction === "raises");
  return d ? d.text : "No strong risk-raising factor this month";
}
