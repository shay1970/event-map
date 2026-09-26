// The analysis prompt and the user's research rules. Shared by the server
// (API mode, JSON answer) and the page ("open in Claude" mode, chat answer).
const MODE_EN = { real: 'real — happened now', pre: 'pre-registered scenario that has not happened yet (you MUST split into scenarios A and B)', imaginary: 'imaginary — demo only' };

const RULES = `
RESEARCH RULES (from the user's own event study, 40 geopolitical events 2021-2026, basket SPY/XLE/USO/GLD/ITA; trade = fade the headline gap at Open[D], exit Close[D+4]):
- Label BEFORE prices. "process" = news STARTS something open-ended (full war, tariff/sanctions/export-ban regime, pandemic wave, systemic contagion, open-ended military campaign). "one-off" = discrete completed action (single strike, assassination, capture, fully specified cut, truce/ceasefire, resolved crisis). If unclear, split into scenario A and B with a label each.
- One-off: fade won 74% (n=23, mean +0.71%) but NOT significant vs ordinary big gaps (boot p 0.32).
- Process with |z|>=2: fade lost (mean -3.72%, hit 33%) → do not fade; big process gaps tended to continue (dominated by the Mar-2026 Iran war).
- SPY gap-downs >=2σ on geopolitical news were bought back within 5 sessions (+1.35% vs -0.50% benchmark).
- USO gaps >=2σ on process events tended to continue (fade -4.30% vs +1.78% benchmark).
- Multiple-comparison risk: these are hypotheses, not proven edges.
Known analog events in the sample (use for "analog"): Russia invades Ukraine (2022-02-24, process); OPEC+ surprise cut (2023-04-03, one-off); Wagner mutiny (2023-06-26, one-off); Hamas attack on Israel (2023-10-09, process); US/UK strikes on Houthis (2024-01-12, one-off); Iran missiles on Israel (2024-04-15, one-off); Israel limited strike on Iran (2024-10-28, one-off); Assad falls (2024-12-09, one-off); tariffs on Canada/Mexico/China (2025-02-03, process); Liberation Day tariffs (2025-04-03, process); US-China Geneva truce (2025-05-12, one-off); Israel strikes Iran (2025-06-13, process); US strikes Iran nuclear sites (2025-06-23, one-off); US captures Maduro (2026-01-05, one-off: oil producers faded, refiners MPC/PSX and SLB kept rising); US/Israel war on Iran (2026-03-02, process); US-Iran ceasefire (2026-04-08, one-off).
`;

function jsonPrompt({ text, mode, hasImg, verify, sourceUrl }) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are a geopolitical-to-equities analyst for a Hebrew-speaking trader. Map this news event to affected US-listed stocks and ETFs.
Today: ${today}. Mode: ${mode} (real = happened now; pre = pre-registered scenario that has not happened, you MUST give A/B scenarios; imaginary = demo).
${hasImg ? 'An image (screenshot of a tweet or article) is attached — transcribe its core claim into the summary and treat it as UNVERIFIED until checked.' : ''}
${sourceUrl ? `The text was pulled from: ${sourceUrl}` : ''}
${verify
    ? 'VERIFY FIRST: use web_search (a few targeted queries, wire services first) to check whether the core claim is reported by Reuters/AP/Bloomberg or other major outlets, and when. Report what you found honestly in "verification"; do not upgrade an unconfirmed claim.'
    : 'You are not browsing for this request: set verification.status to "not_checked" and say what must be confirmed from Reuters/AP/Bloomberg.'}
${RULES}
MAPPING RULES:
- 12 to 15 candidate stocks: US-listed, liquid (prefer market cap > $2B; liquid ADRs allowed). Include names likely to FALL, not only rise.
- order 1 = what the headline says; order 2 = who benefits/suffers from the reaction (substitutes, refiners vs producers, own-fab competitor benefits while same-supplier competitor is hurt).
- exposure (1-3) = how directly the company's revenue/assets/supply chain is tied to the event: 3 = major, documented exposure (e.g. >20% revenue or key assets in the affected country/product); 2 = meaningful but secondary; 1 = reasoning only. exposure_basis = the concrete fact behind it (in Hebrew, name the country/product/segment). Do not invent precise percentages you are unsure of.
- 4 to 7 indices/ETFs from: SPY, QQQ, IWM, SMH, XLE, USO, UNG, GLD, SLV, TLT, UUP, ITA, XAR, EWT, FXI, KWEB, EWJ, EWY, EPOL, VGK, EWZ, REMX, COPX, WEAT, DBA, JETS, XOP.
- Tickers exactly as on US exchanges (class shares with a dash, e.g. BRK-B).
Your FINAL message must be ONLY one JSON object (no prose before or after), all prose fields in Hebrew:
{"summary": "one or two sentences: what happened / what is assumed",
 "verification": {"status": "confirmed" | "partly" | "unconfirmed" | "contradicted" | "not_checked", "note": "short Hebrew: who reports it, when, what differs", "sources": [{"title":"...","url":"https://..."}]},
 "reaction_day": "which US session is D and why (weekend/overnight gap or intraday)",
 "label": "one-off" | "process" | "split",
 "label_reason": "short",
 "scenarios": [{"name":"A","desc":"...","label":"one-off|process"},{"name":"B","desc":"...","label":"..."}]  (empty array if not split; REQUIRED for pre mode),
 "candidates": [{"ticker":"XOM","name":"Exxon Mobil","dir":"up"|"down","order":1|2,"exposure":1|2|3,"exposure_basis":"short Hebrew","mechanism":"short Hebrew"}],
 "indices": [{"ticker":"USO","dir":"up"|"down","why":"short Hebrew"}],
 "analog": {"event":"closest analog from the list or 'מחוץ למדגם'","what_happened":"short","difference":"what is different now"},
 "research_says": ["2-4 bullets applying the research rules to THIS label, stated as hypotheses"],
 "critique": ["2-4 bullets: what may already be priced, where the rules may break, practical risk (position size, gap through stop)"],
 "reversers": ["2-4 things that would flip the thesis"]}

EVENT:
${text.slice(0, 20000)}`;
}

// Same analysis for pasting into a regular Claude chat (no API key needed):
// a readable Hebrew answer instead of JSON.
function chatPrompt({ text, mode, sourceUrl }) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are a geopolitical-to-equities analyst for a Hebrew-speaking trader. Map this news event to affected US-listed stocks and ETFs.
Today: ${today}. Mode: ${MODE_EN[mode] || mode}.
${sourceUrl ? `Source article: ${sourceUrl}` : ''}
${mode === 'real'
    ? 'VERIFY FIRST: if you can search the web, check whether the core claim is reported by Reuters/AP/Bloomberg or other major outlets, and when. If you cannot search, say so and list what must be confirmed. Do not upgrade an unconfirmed claim.'
    : 'This is not a live event, so skip verification.'}
${RULES}
MAPPING RULES:
- 12 to 15 candidate stocks, then keep the 10 with the most direct exposure: US-listed, liquid (prefer market cap > $2B; liquid ADRs allowed). Include names likely to FALL, not only rise.
- order 1 = what the headline says; order 2 = who benefits/suffers from the reaction (substitutes, refiners vs producers, own-fab competitor benefits while same-supplier competitor is hurt).
- exposure 1-3: 3 = major, documented exposure (e.g. >20% revenue or key assets in the affected country/product); 2 = meaningful but secondary; 1 = reasoning only. Give the concrete fact behind it. Do not invent precise percentages you are unsure of.
- 4 to 7 indices/ETFs from: SPY, QQQ, IWM, SMH, XLE, USO, UNG, GLD, SLV, TLT, UUP, ITA, XAR, EWT, FXI, KWEB, EWJ, EWY, EPOL, VGK, EWZ, REMX, COPX, WEAT, DBA, JETS, XOP.
- If you can look up prices, add the last close and 1-month change for each ticker (a big 1-month move in the event's direction may mean it is already priced in).
ANSWER ENTIRELY IN HEBREW (tickers and company names stay in English), with these sections:
1. **האירוע** — one or two sentences, and the verification result with sources.
2. **יום התגובה (D)** — which US session and why.
3. **תיוג** — one-off / process / split, with the reason. If split (REQUIRED in pre-registered mode), give scenario A and B, each with its label.
4. **10 מניות** — a table: טיקר | שם | כיוון (↑/↓) | סדר (1/2) | חשיפה (1-3) ונימוק | מנגנון.
5. **מדדים ו-ETF** — a table: טיקר | כיוון | למה.
6. **תקדים** — the closest analog from the list (or "מחוץ למדגם"), what happened then, and what is different now.
7. **מה המחקר אומר** — 2-4 bullets applying the research rules to this label, as hypotheses.
8. **ביקורת** — 2-4 bullets: what may already be priced, where the rules may break, practical risk.
9. **מה יהפוך את התזה** — 2-4 bullets.
End with one line: this is research, not investment advice.

EVENT:
${String(text).slice(0, 20000)}`;
}

export function buildPrompt(opts) {
  return opts.format === 'chat' ? chatPrompt(opts) : jsonPrompt(opts);
}
