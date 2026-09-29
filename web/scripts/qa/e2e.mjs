// End-to-end QA in real headless Chrome via the DevTools protocol (no extra dependencies):
// demo interactions, console errors and an axe-core WCAG 2 A/AA audit on every main route.
//
//   npm run build && npx serve out -l 4173   (or any static server on the out/ folder)
//   node scripts/qa/e2e.mjs [baseUrl]
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.argv[2] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => { try { readFileSync(p); return true; } catch { return false; } });
const data = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../src/data/${f}`, import.meta.url)), "utf8"));
const projects = data("projects.json");
const advisor = data("advisor.json");
const AXE = readFileSync(fileURLToPath(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url)), "utf8");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

// ------------------------------------------------------------------ browser
const profile = mkdtempSync(join(tmpdir(), "prism-qa-"));
const port = 9333;
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1440,900", "about:blank",
], { stdio: "ignore" });

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
      if (r.ok) return r.json();
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

const t = await target();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const consoleErrors = [];
let loadResolve = null;
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  } else if (msg.method === "Page.loadEventFired" && loadResolve) {
    loadResolve();
    loadResolve = null;
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expression, timeout = 6000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { if (await evaluate(expression)) return true; } catch {}
    await sleep(100);
  }
  return false;
};
const go = async (path) => {
  const loaded = new Promise((r) => (loadResolve = r));
  await send("Page.navigate", { url: `${BASE}${path}` });
  await loaded;
  await waitFor("document.readyState === 'complete'");
  await sleep(400); // hydration
};
const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)})?.innerText ?? "")`);
const bodyHas = (s) => waitFor(`document.body.innerText.includes(${JSON.stringify(s)})`);
const setValue = (sel, v) =>
  evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
    setter.call(el, ${JSON.stringify(String(v))});
    el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
const clickText = (tag, label) =>
  evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.innerText.trim() === ${JSON.stringify(label)} || e.innerText.trim().startsWith(${JSON.stringify(label)}));
    if (!el) return false; el.click(); return true; })()`);

await send("Page.enable");
await send("Runtime.enable");

try {
  // ---------------------------------------------------------------- Overview
  console.log("\nOverview");
  await go("/");
  check("hero headline", (await text("h1")).includes("decision intelligence"));
  check("official project count settles to 1,731", await bodyHas("1,731"));
  check("persona section present", await waitFor(`/meet meera/i.test(document.body.innerText)`));

  // ---------------------------------------------------------------- Command Center
  console.log("\nCommand Center");
  await go("/command-center/");
  const highInSample = projects.filter((p) => p.risk.band === "high").length;
  check("priority list starts with 10 rows + show-all", (await evaluate("document.querySelectorAll('ol.divide-y > li').length")) === 10 && (await bodyHas("Show all 59 projects")));
  await evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(b => b.innerText.trim() === 'High').click()`);
  check(`High filter shows ${highInSample} of 59`, await bodyHas(`Showing ${highInSample} of 59`));
  check("High chip is aria-pressed", await evaluate(`[...document.querySelectorAll('button[aria-pressed="true"]')].some(b => b.innerText.trim() === 'High')`));
  await clickText("button", "Clear filters");
  check("clear filters restores 59", await bodyHas("Showing 59 of 59"));

  // ---------------------------------------------------------------- Projects split view
  console.log("\nProjects split view");
  await go("/projects/");
  check("list and a profile side by side", await waitFor(`!!document.querySelector('nav[aria-label="Projects"] a[data-rail]') && !!document.querySelector('h2')`));
  const q = "karnataka";
  const expectKa = projects.filter((p) => `${p.name} ${p.code} ${p.agency} ${p.state} ${p.ministry_short}`.toLowerCase().includes(q)).length;
  await setValue('nav[aria-label="Projects"] input[type="search"]', "Karnataka");
  check(`rail search "Karnataka" → ${expectKa}`, await waitFor(`document.querySelector('nav[aria-label="Projects"]').innerText.includes("${expectKa} of 59")`));
  await evaluate(`document.querySelectorAll('nav[aria-label="Projects"] a[data-rail]')[1].click()`);
  check("clicking a project opens it on the right", await waitFor(`/^\\/projects\\/\\d+\\//.test(location.pathname)`));
  check("list keeps the search while switching", await waitFor(`document.querySelector('nav[aria-label="Projects"] input[type="search"]').value === "Karnataka"`));
  check("selected project is marked current", await waitFor(`!!document.querySelector('nav[aria-label="Projects"] a[aria-current="page"]')`));
  await setValue('nav[aria-label="Projects"] input[type="search"]', "zzzz-no-match");
  check("empty state for no matches", await bodyHas("No project matches"));
  await setValue('nav[aria-label="Projects"] input[type="search"]', "");
  await evaluate(`document.querySelectorAll('nav[aria-label="Projects"] a[data-rail]')[0].focus()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
  check("arrow keys move through the list", await waitFor(`document.activeElement === document.querySelectorAll('nav[aria-label="Projects"] a[data-rail]')[1]`));

  // ---------------------------------------------------------------- Risk profile
  console.log("\nRisk profile 618706");
  await go("/projects/618706/");
  const hero = projects.find((p) => p.code === "618706");
  check("score shown", await bodyHas(hero.risk.score.toFixed(1)));
  check("plain-language verdict first", await bodyHas("High risk of a delay being announced"));
  check("three reasons listed", (await evaluate(`document.querySelectorAll('section[aria-labelledby="verdict-title"] ul li').length`)) === 3);
  check("suggested next steps shown", await bodyHas("Suggested next steps") && (await bodyHas("Confirm the latest expenditure figure")));
  check("technical detail folded away", (await evaluate(`[...document.querySelectorAll('details')].filter(d => !d.open).length`)) >= 4);
  await evaluate(`[...document.querySelectorAll('details summary')].find(s => s.innerText.includes('All warning signs')).click()`);
  check("details open on demand", await bodyHas("Reporting check"));
  check("budget scenario link", await evaluate(`!!document.querySelector('a[href*="/advisor/?scenario="]')`));

  // ---------------------------------------------------------------- Advisor
  console.log("\nReallocation Advisor");
  await go("/advisor/");
  const s0 = advisor.scenarios[0];
  check("featured scenario amount", await bodyHas(`₹${s0.suggested_amount_cr.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Cr`));
  await setValue('input[type="range"]', 80);
  const pct = Math.round((80 / s0.destination.shortfall_cr) * 100);
  check("slider to ₹80 updates amount", await bodyHas("₹80.00 Cr"));
  check(`slider updates coverage to ${pct}%`, await bodyHas(`covers ${pct}% of the shortfall`));
  check("advisory note uses the new amount", await waitFor(`[...document.querySelectorAll('p')].some(p => p.innerText.includes('suggests evaluating a reallocation of ₹80.00 Cr'))`));
  await clickText("button", "Suggested");
  check("Suggested restores the amount", await waitFor(`document.querySelector('[aria-live="polite"]')?.innerText.includes("${s0.suggested_amount_cr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}")`));
  const s1 = advisor.scenarios[1];
  await evaluate(`[...document.querySelectorAll('button[aria-pressed]')][1].click()`);
  check("switching scenario updates the URL", await waitFor(`location.search.includes("scenario=${s1.id}")`));
  check("switching scenario updates the amount", await waitFor(`document.querySelector('[aria-live="polite"]')?.innerText.includes("${s1.suggested_amount_cr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}")`));
  check("caveat visible", await bodyHas("not an actual fund transfer"));
  await go(`/advisor/?scenario=${advisor.scenarios[2].id}`);
  check("deep link opens the requested scenario", await waitFor(`[...document.querySelectorAll('button[aria-pressed="true"]')].some(b => b.innerText.includes("${advisor.scenarios[2].source.project_code}"))`));

  // ---------------------------------------------------------------- Ask drawer
  console.log("\nAsk PRISM side panel");
  await go("/projects/618706/");
  await evaluate(`document.querySelector('button[aria-controls="ask-drawer"]').click()`);
  check("side panel opens on any page", await waitFor(`!!document.querySelector('#ask-drawer')`));
  check("suggests a question about this project", await waitFor(`document.querySelector('#ask-drawer').innerText.includes("Why is project 618706 high risk?")`));
  await evaluate(`[...document.querySelectorAll('#ask-drawer li button')][0].click()`);
  check("side panel answers with sources", await waitFor(`document.querySelector('#ask-drawer').innerText.includes("9.3/10")`));
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  check("Esc closes the panel", await waitFor(`!document.querySelector('#ask-drawer')`));

  // ---------------------------------------------------------------- Ask PRISM
  console.log("\nAsk PRISM");
  await go("/ask/");
  await setValue("#ask-input", "Why is project 618706 high risk?");
  await evaluate(`document.querySelector('form button[type="submit"]').click()`);
  check("project question answered", await bodyHas(`at ${hero.risk.score.toFixed(1)}/10`));
  check("answer lists sources", await bodyHas("SOURCES") || await bodyHas("Sources"));
  await setValue("#ask-input", "Where is budget buffer available?");
  await evaluate(`document.querySelector('form button[type="submit"]').click()`);
  check("buffer question answered", await bodyHas("possible pairings"));
  await setValue("#ask-input", "tell me a joke");
  await evaluate(`document.querySelector('form button[type="submit"]').click()`);
  check("unknown question gets the fallback", await bodyHas("I can answer questions about the prototype dataset"));
  await go("/ask/?q=Which%20projects%20need%20attention%3F");
  check("?q= link answers automatically", await bodyHas("PRISM would review first"));

  // ---------------------------------------------------------------- Mobile nav
  console.log("\nMobile");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await go("/");
  check("no horizontal overflow at 390px", await evaluate("document.documentElement.scrollWidth <= 391"));
  await evaluate(`document.querySelector('button[aria-controls="mobile-nav"]').click()`);
  check("menu opens with 6 links", await waitFor(`document.querySelectorAll('#mobile-nav a').length === 6`));
  check("menu button reports expanded", await evaluate(`document.querySelector('button[aria-controls="mobile-nav"]').getAttribute('aria-expanded') === 'true'`));
  for (const path of ["/command-center/", "/projects/618706/", "/advisor/", "/evidence/"]) {
    await go(path);
    const offenders = await evaluate(`(() => {
      const W = document.documentElement.clientWidth + 1, out = [];
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right <= W || r.width === 0 || getComputedStyle(el).visibility === "hidden") continue;
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) { if (getComputedStyle(p).overflowX !== "visible") { clipped = true; break; } p = p.parentElement; }
        const pr = el.parentElement?.getBoundingClientRect();
        if (!clipped && pr && pr.right <= W) out.push(el.tagName.toLowerCase() + "." + String(el.className).split(" ").slice(0, 4).join(".") + " → " + Math.round(r.right) + "px");
      }
      return out.slice(0, 4);
    })()`);
    check(`no horizontal overflow at 390px: ${path}`, offenders.length === 0, offenders.join(" | "));
  }
  await send("Emulation.clearDeviceMetricsOverride");

  // ---------------------------------------------------------------- Accessibility
  console.log("\nAccessibility (axe-core, WCAG 2 A/AA)");
  const routes = ["/", "/command-center/", "/projects/", "/projects/618706/", "/advisor/", "/evidence/", "/ask/", "/methodology/", "/design-system/"];
  for (const r of routes) {
    await go(r);
    await sleep(900); // let count-up animations finish
    await evaluate(AXE);
    const v = await evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
      .then(res => res.violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length, target: x.nodes[0]?.target?.join(" "), summary: x.nodes[0]?.failureSummary?.split("\\n")[1] })))`);
    check(`axe ${r}`, v.length === 0, v.map((x) => `${x.id} (${x.impact}, ${x.n}×) e.g. ${x.target} ${x.summary ?? ""}`).join(" | "));
  }

  check("no console errors or uncaught exceptions", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (err) {
  check("e2e run completed", false, String(err));
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

const failed = results.filter((r) => !r.ok);
console.log(`\ne2e: ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
