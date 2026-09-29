// Run: node --experimental-strip-types scripts/tests/ask-match.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchQuestion } from "../../src/lib/askMatch.ts";

const ask = JSON.parse(readFileSync(new URL("../../src/data/ask.json", import.meta.url), "utf8"));
const demo = JSON.parse(readFileSync(new URL("../../src/data/demo.json", import.meta.url), "utf8"));
const m = (q) => matchQuestion(q, ask.intents, ask.project_lookup);
const hero = demo.hero_project.code;

const cases = [
  ["Which projects need attention?", { kind: "intent", id: "attention" }],
  ["What are the main risk drivers?", { kind: "intent", id: "drivers" }],
  ["Show projects with schedule slippage.", { kind: "intent", id: "slippage" }],
  ["What projects have potential budget pressure?", { kind: "intent", id: "budget_pressure" }],
  ["Where is budget buffer available?", { kind: "intent", id: "buffers" }],
  ["Can funds be reallocated?", { kind: "intent", id: "advisor" }],
  ["what is reallocation advisor", { kind: "intent", id: "advisor" }],
  ["What is the Reallocation Advisor?", { kind: "intent", id: "advisor" }],
  ["How does the advisor work?", { kind: "intent", id: "advisor" }],
  ["explain reallocation", { kind: "intent", id: "advisor" }],
  ["How reliable is the risk score?", { kind: "intent", id: "reliability" }],
  ["How is the risk score calculated?", { kind: "intent", id: "method" }],
  ["Which ministries have the most high-risk projects?", { kind: "intent", id: "ministries" }],
  ["What data issues did you find?", { kind: "intent", id: "data_quality" }],
  ["What does PRISM add to PAIMANA?", { kind: "intent", id: "about" }],
  [`Why is project ${hero} high risk?`, { kind: "project", code: hero }],
  [`why is ${hero} risky`, { kind: "project", code: hero }],
  ["Why is Bangalore Nidagatta at risk?", { kind: "project", code: hero }],
  ["Why is project 123456 high risk?", { kind: "not_in_sample", code: "123456" }],
  ["Why is this project high risk?", { kind: "which_project" }],
  ["tell me a joke", { kind: "fallback" }],
  ["", { kind: "fallback" }],
];
let failed = 0;
for (const [q, want] of cases) {
  try {
    assert.deepEqual(m(q), want);
  } catch {
    failed++;
    console.error(`FAIL: "${q}" -> ${JSON.stringify(m(q))}, want ${JSON.stringify(want)}`);
  }
}
// Every suggested prompt must resolve to an answer.
for (const s of ask.suggested) {
  const r = m(s);
  if (r.kind === "fallback" || r.kind === "which_project" || r.kind === "not_in_sample") {
    failed++;
    console.error(`FAIL suggested: "${s}" -> ${JSON.stringify(r)}`);
  }
}
console.log(`${cases.length + ask.suggested.length - failed}/${cases.length + ask.suggested.length} ask-match checks passed`);
process.exit(failed ? 1 : 0);
