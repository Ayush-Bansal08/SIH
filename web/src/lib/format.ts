// Indian-style number formatting for crore / lakh-crore figures.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-IN");

/** ₹1,23,456.78 Cr */
export function formatCr(value: number | null | undefined, digits: 0 | 2 = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `₹${(digits === 0 ? inr0 : inr).format(value)} Cr`;
}

/** ₹33.60 lakh crore (from a value in crore) */
export function formatLakhCr(valueCr: number | null | undefined): string {
  if (valueCr === null || valueCr === undefined) return "—";
  return `₹${(valueCr / 1e5).toFixed(2)} lakh crore`;
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return int.format(value);
}

export function formatPct(value: number | null | undefined, digits = 0, isFraction = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const v = isFraction ? value * 100 : value;
  return `${v.toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-01" or "2026-08" -> "Sep 2026" (fixed labels; locale-independent) */
export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatMonths(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = Math.round(n);
  return `${v} month${Math.abs(v) === 1 ? "" : "s"}`;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}
