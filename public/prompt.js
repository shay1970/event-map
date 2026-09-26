// The analysis prompt and the user's research rules. Shared by the server
// (API mode, JSON answer) and the page ("open in Claude" mode, chat answer).
const MODE_EN = { real: 'real — happened now', pre: 'pre-registered scenario that has not happened yet (you MUST split into scenarios A and B)' };

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
Today: ${today}. Mode: ${mode} (real = happened now; pre = pre-registered scenario that has not happened, you MUST give A/B scenarios).
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

// The user's own analysis prompt, for a regular Claude chat (no API key needed).
// Kept short on purpose so it fits in a claude.ai/new?q= link.
const CHAT_MODE = {
  real: 'Mode: real, happened now.',
  pre: 'Mode: pre-registered scenario, has NOT happened yet. Verify only background facts, and give Scenario A/B.',
};

const CHAT_RULES = `1. אימות
לפני הניתוח אמת את האירוע מול לפחות 2 מקורות אמינים ועדכניים, כולל Reuters / AP / Bloomberg אם זמין.
הפרד בין:
* מידע חדש
* מידע שהיה ידוע קודם
* פרשנות/תחזית
קבע האם מדובר ב־NEW INFORMATION או REPACKAGING.
אל תמציא עובדות או נתונים.
2. סיווג
סווג: ONE-OFF / PROCESS / POLICY-FISCAL / MACRO / CORPORATE / GEOPOLITICAL.
אם לא ברור → Scenario A/B.
3. התאמה למחקר
המחקר שלי מבוסס על 40 אירועים גיאופוליטיים 2021–26:
* Trade: fade headline gap at Open[D], exit Close[D+4].
* ONE-OFF: fade won 74% (n=23, +0.71%), אך לא היה מובהק מול gaps גדולים רגילים.
* PROCESS + |z|≥2: fade lost −3.72%, hit rate 33%.
* SPY gap-down ≥2σ באירועים גיאופוליטיים חזר למעלה בתוך 5 sessions.
* USO ≥2σ באירועי process נטה להמשיך.
* אלו hypotheses, not proven edges.
Analogs: Ukraine invasion 2022-02-24 P; OPEC+ cut 2023-04-03 O; Wagner 2023-06-26 O; Hamas attack 2023-10-09 P; Houthi strikes 2024-01-12 O; Iran missiles 2024-04-15 O; Israel strike Iran 2024-10-28 O; Assad falls 2024-12-09 O; Canada/Mexico/China tariffs 2025-02-03 P; Liberation Day 2025-04-03 P; Geneva truce 2025-05-12 O; Israel strikes Iran 2025-06-13 P; US strikes Iran nuclear 2025-06-23 O; Maduro captured 2026-01-05 O; US/Israel-Iran war 2026-03-02 P; US-Iran ceasefire 2026-04-08 O.
לפני החלת ה־edge בדוק:
1. האם event class זהה למדגם?
2. האם מנגנון ההשפעה דומה?
3. האם אופק הזמן דומה?
4. האם surprise דומה?
קבע: HIGH / MEDIUM / LOW / NOT TRANSFERABLE.
אם LOW/NOT TRANSFERABLE — אל תציג את הסטטיסטיקה כ־edge תקף.
אל תמציא z-score. אם אין נתונים: z-score unavailable.
4. יום D ותגובת השוק
קבע מהו D לפי זמן פרסום והאם השוק פתוח.
נתח:
SPY, QQQ, IWM + ETFs רלוונטיים.
קבע:
* Expected direction
* Surprise: LOW/MEDIUM/HIGH
* FADE / CONTINUATION / NO CLEAR EDGE
* Confidence
* מה יכול לבטל את התזה
אם D עדיין לא התרחש, הפרד בבירור בין forecast לבין fact.
5. מניות
בחר 10 מניות אמריקאיות נזילות, כולל winners ו־losers.
| Ticker | Name | ↑/↓ | Order | Exposure 1–3 | Concrete fact + reason | Mechanism |
Order 1 = השפעה ישירה.
Order 2 = השפעה משנית.
אל תמציא exposure או נתונים.
6. ETFs
בחר 4–7 מתוך:
SPY QQQ IWM SMH XLE USO UNG GLD SLV TLT UUP ITA XAR EWT FXI KWEB EWJ EWY EPOL VGK EWZ REMX COPX WEAT DBA JETS XOP
| ETF | ↑/↓ | Exposure 1–3 | Mechanism | Already priced? |
7. Pricing
עבור הנכסים המרכזיים, אם זמין:
* Last Close
* 1-month change
* האם כבר הייתה תנועה משמעותית בכיוון האירוע
בדוק במיוחד האם מדובר ב־priced-in / crowded trade.
8. Analog + research
מצא 1–3 אנלוגים הקרובים ביותר לפי event type, surprise, mechanism, regime ו־time horizon.
הסבר:
* מה דומה
* מה שונה
* מה הייתה תגובת השוק
הפרד בין Evidence / Hypothesis / Unknown.
אל תציג correlation כ־causation.
9. Critique + Flip
בקר את התזה:
* מה כבר מתומחר?
* מה אינו חדש?
* איזה חלק מהתגובה יכול לנבוע מגורמים אחרים?
* האם המדגם מתאים?
* איפה sample size / selection bias / regime risk עלולים לשבור את הכלל?
לבסוף: מה 3–5 עובדות עתידיות שישנו את התזה?
Output — בשני שלבים. ענה רק בעברית.
שלב א' (עכשיו) — תקציר בלבד, עד 12 שורות:
* מה קרה + האם אומת (עם מקור)
* NEW INFORMATION או REPACKAGING
* סיווג + Transferability
* האם יש השפעה ממשית על שוק המניות האמריקאי (אם לא — אמור זאת ועצור כאן)
* כיוון צפוי ב-SPY/QQQ + FADE / CONTINUATION / NO CLEAR EDGE + Confidence
* 3–5 הטיקרים החשובים ביותר עם ↑/↓
* מה יבטל את התזה (שורה אחת)
בסוף שלב א' שאל: "רוצה את הניתוח המלא (סעיפים 1–9)?" ועצור. אל תכתוב את הניתוח המלא לפני שאענה.
שלב ב' — רק אם אבקש: הניתוח המלא בסעיפים 1–9 לעיל.
כל עובדה עדכנית — מקור ליד הטענה.
אל תמציא נתונים.
אל תציג תחזית כעובדה.
בסוף: מחקר וניתוח בלבד, לא ייעוץ השקעות.`;

// excerptChars: how much of the article body to include (null = all of it).
function chatPrompt({ text, mode, sourceUrl }, excerptChars = null) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const body = lines.slice(1).join('\n');
  const excerpt = excerptChars == null ? body.slice(0, 12000) : body.slice(0, excerptChars);
  return [
    'נתח את ההשפעה של הכתבה הזו על שוק המניות האמריקאי.',
    sourceUrl ? `Article: ${sourceUrl}` : null,
    `Headline: ${lines[0] || ''}`,
    excerpt ? `Excerpt: ${excerpt}` : null,
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    CHAT_MODE[mode] || CHAT_MODE.real,
    CHAT_RULES,
  ].filter(Boolean).join('\n');
}

// The longest version that still fits in a link of maxEncoded characters,
// trimming the excerpt first. null when even the headline alone does not fit.
export function linkPrompt(opts, maxEncoded) {
  for (const n of [2000, 1200, 600, 300, 0]) {
    const p = chatPrompt(opts, n);
    if (encodeURIComponent(p).length <= maxEncoded) return p;
  }
  return null;
}

export function buildPrompt(opts) {
  return opts.format === 'chat' ? chatPrompt(opts) : jsonPrompt(opts);
}

