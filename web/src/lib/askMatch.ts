// Deterministic question matching for Ask PRISM (no LLM, no network).
// Order: project code -> project name -> intent keywords -> clarifying / fallback.

export interface AskIntentLite {
  id: string;
  keywords: string[];
}

export type Match =
  | { kind: "project"; code: string }
  | { kind: "intent"; id: string }
  | { kind: "not_in_sample"; code: string }
  | { kind: "which_project" }
  | { kind: "fallback" };

const GENERIC = new Set(["budget", "how", "what is", "add", "adds", "explain", "score", "model", "works", "about", "cost", "money", "reason", "reasons", "sector"]);
const NAME_STOP = new Set([
  "project", "projects", "section", "road", "from", "with", "including", "construction", "improvement", "widening",
  "lane", "lanes", "four", "state", "package", "phase", "with", "mode", "under", "existing", "shoulders", "paved",
  "design", "chainage", "length", "total", "the", "and", "national", "highway", "development", "connectivity",
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameTokens(name: string): string[] {
  return [...new Set(normalize(name).split(/[\s-]+/).filter((t) => t.length >= 4 && !NAME_STOP.has(t) && !/^\d+$/.test(t)))];
}

export function matchQuestion(question: string, intents: AskIntentLite[], lookup: Record<string, string>): Match {
  const q = normalize(question);
  if (!q) return { kind: "fallback" };

  // 1. Explicit project code (PAIMANA codes are 5–7 digits).
  const code = q.match(/\b(\d{5,7})\b/)?.[1];
  if (code) return code in lookup ? { kind: "project", code } : { kind: "not_in_sample", code };

  // 2. Project named in the question (needs two distinctive words of its name).
  let best: { code: string; score: number } | null = null;
  for (const [c, name] of Object.entries(lookup)) {
    const tokens = nameTokens(name);
    const hits = tokens.filter((t) => new RegExp(`\\b${escapeRe(t)}`).test(q)).length;
    if (hits >= 2 && (!best || hits > best.score)) best = { code: c, score: hits };
  }
  if (best) return { kind: "project", code: best.code };

  // 3. Intent keywords (word-start match, so "reallocat" matches "reallocation").
  let top: { id: string; score: number } | null = null;
  for (const intent of intents) {
    let score = 0;
    for (const k of intent.keywords) {
      if (new RegExp(`\\b${escapeRe(k)}`).test(q)) score += GENERIC.has(k) ? 0.5 : k.includes(" ") ? 1.5 : 1;
    }
    if (score > 0 && (!top || score > top.score)) top = { id: intent.id, score };
  }

  // A "why is this project risky" question without a project -> ask which one.
  const aboutOneProject = /\bwhy\b/.test(q) && /\b(this|that|the|a|my)\s+project\b|\bit\b/.test(q);
  if (aboutOneProject && (!top || top.score < 2)) return { kind: "which_project" };

  return top && top.score >= 1 ? { kind: "intent", id: top.id } : { kind: "fallback" };
}
