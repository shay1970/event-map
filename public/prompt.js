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

// The user's own analysis prompt, for a regular Claude chat (no API key needed).
const CHAT_MODE = {
  real: 'Mode: real, happened now.',
  pre: 'Mode: pre-registered scenario, has NOT happened yet. Skip section 0 verification of the event itself (verify only the background facts), and you MUST give Scenario A + Scenario B.',
  imaginary: 'Mode: imaginary, demo only. Skip verification; analyze as a hypothetical.',
};

function articleBlock({ text, sourceUrl }) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const headline = lines[0] || '';
  const body = lines.slice(1).join('\n');
  return [
    sourceUrl ? `Article: ${sourceUrl}` : null,
    `Headline: ${headline}`,
    body ? `Excerpt:\n${body.slice(0, 12000)}` : null,
  ].filter(Boolean).join('\n');
}

function chatPrompt({ text, mode, sourceUrl }) {
  const today = new Date().toISOString().slice(0, 10);
  return `מה ההשפעה של הכתבה הזו על שוק המניות האמריקאי? נתח לפי הכללים הבאים.

${articleBlock({ text, sourceUrl })}
Today: ${today}
${CHAT_MODE[mode] || CHAT_MODE.real}

0. VERIFY FIRST
לפני כל ניתוח:
1. אמת את האירוע באמצעות לפחות 2 מקורות חדשותיים אמינים ועדכניים. העדף Reuters / AP / Bloomberg. אם סוכנויות הידיעות לא סיקרו את האירוע (נפוץ בחדשות מקומיות), השתמש ב-2 מקורות אמינים אחרים וסמן את האימות כ"חלקי".
2. בדוק את תאריך ושעת הפרסום.
3. הפרד בין: מידע חדש שהתרחש עכשיו / מידע שהיה ידוע קודם / פרשנות של הכתבה / תחזית עתידית.
4. אל תניח שהכותרת מתארת אירוע חדש. קבע במפורש האם יש כאן NEW INFORMATION או REPACKAGING של מידע קיים.
5. אם לא ניתן לאמת עובדה מהותית — ציין זאת ואל תמציא.

0.5 RELEVANCE GATE
לפני שממשיכים: האם יש מנגנון השפעה סביר של האירוע על שוק המניות האמריקאי (ישירות, או דרך סחורות, ריביות, מטבע, שרשרת אספקה או סנטימנט)?
אם אין — כתוב זאת בקצרה, הסבר למה, ציין מה היה צריך לקרות כדי שתהיה השפעה, ועצור. אל תמציא מניות.
אם ההשפעה קיימת אבל חלשה — המשך, מותר לבחור פחות מ-10 מניות, והצהר על כך.

1. CLASSIFY THE EVENT
סווג את האירוע לאחת הקטגוריות:
* ONE-OFF — פעולה/אירוע דיסקרטי שהסתיים או מוגדר בזמן.
* PROCESS — תהליך פתוח שיכול להמשיך ולהתפתח.
* POLICY / FISCAL — שינוי או איום בשינוי מדיניות, רגולציה, מיסוי, תקציב או פיסקלי.
* MACRO — נתון או התפתחות מאקרו.
* CORPORATE — אירוע ברמת חברה.
* GEOPOLITICAL — אירוע גיאופוליטי.
אם האירוע מתאים ליותר מקטגוריה אחת, בחר קטגוריה ראשית וציין קטגוריה משנית.
אם הסיווג אינו ודאי: Scenario A + Scenario B, כאשר כל תרחיש מסומן בנפרד.
חשוב: אל תיישם אוטומטית את ה-historical edge שלי. קודם בדוק האם האירוע הנוכחי שייך לאותה EVENT CLASS של המדגם ההיסטורי.

2. MATCH TO HISTORICAL RESEARCH
המחקר שלי:
* 40 geopolitical events, 2021–2026.
* Trade rule: fade the headline gap at Open[D], exit Close[D+4].
* ONE-OFF: fade won 74% (n=23, +0.71%), but was not statistically significant versus ordinary large gaps.
* PROCESS with |z| >= 2: fade lost (-3.72%, hit rate 33%).
* Therefore: process events with |z| >= 2 were historically associated with continuation rather than fading.
* SPY gap-downs >=2σ on geopolitical events were bought back within 5 sessions.
* USO >=2σ gaps on process events continued.
* These are hypotheses, not proven edges.
Historical analogs (P = process, O = one-off):
Ukraine invasion 2022-02-24 P · OPEC+ cut 2023-04-03 O · Wagner 2023-06-26 O · Hamas attack 2023-10-09 P · Houthi strikes 2024-01-12 O · Iran missiles 2024-04-15 O · Israel strike on Iran 2024-10-28 O · Assad falls 2024-12-09 O · Canada/Mexico/China tariffs 2025-02-03 P · Liberation Day 2025-04-03 P · Geneva truce 2025-05-12 O · Israel strikes Iran 2025-06-13 P · US strikes Iran nuclear 2025-06-23 O · Maduro captured 2026-01-05 O · US/Israel-Iran war 2026-03-02 P · US-Iran ceasefire 2026-04-08 O

CRITICAL TRANSFERABILITY TEST
לפני שימוש בסטטיסטיקות:
A. האם האירוע הנוכחי הוא מאותה EVENT CLASS כמו המדגם ההיסטורי?
B. האם מנגנון ההשפעה על השוק דומה?
C. האם אופק הזמן דומה?
D. האם מדובר ב-new information דומה?
סווג את יכולת ההעברה כ: HIGH / MEDIUM / LOW / NOT TRANSFERABLE.
אם היא LOW או NOT TRANSFERABLE, אל תציג את ה-74% או 33% כאילו הם edge תקף לאירוע הנוכחי.

3. MEASURE THE SURPRISE
קבע עד כמה האירוע מפתיע את השוק: LOW / MEDIUM / HIGH, והסבר למה.
אם אפשר, הערך: magnitude of expected market gap; האם האירוע כבר מתומחר; האם מדובר בשינוי משמעותי לעומת consensus / previous information.
אל תמציא z-score. אם אין מספיק נתונים לחישוב, כתוב "z-score unavailable".

4. DEFINE DAY D
קבע מהו יום המסחר D.
אם הכתבה פורסמה כאשר השוק סגור: D = יום המסחר הבא.
אם פורסמה בזמן המסחר: D = אותו יום, אלא אם ההשפעה הרלוונטית היא בבירור ליום הבא.
ציין את ההיגיון.

5. MARKET REACTION
נתח את התגובה הצפויה ב: SPY, QQQ, IWM, relevant sector ETFs.
אם השוק עדיין לא נפתח, אל תציג תחזית כאילו היא עובדה.
הצג: 1. Expected direction 2. Confidence: LOW / MEDIUM / HIGH 3. Main mechanism 4. What could invalidate it.
אם D כבר התרחש, השתמש בנתוני המחיר בפועל.

6. FADE VS CONTINUATION
קבע האם האירוע מתאים יותר ל: FADE / CONTINUATION / NO CLEAR EDGE.
אל תבחר FADE או CONTINUATION רק בגלל שהכותרת חיובית/שלילית.
ההחלטה צריכה להתבסס על: 1. Event classification 2. Transferability 3. Surprise magnitude 4. Pricing 5. Market reaction 6. Similar historical events.
אם אין מספיק evidence: NO CLEAR EDGE.

7. STOCK MAPPING
בחר 10 מניות אמריקאיות נזילות שרלוונטיות לאירוע (או פחות, לפי שלב 0.5).
חובה לכלול גם מניות שעלולות ליהנות וגם מניות שעלולות להיפגע.
טבלה:
| Ticker | Name | ↑/↓ | Order | Exposure 1–3 | Concrete fact | Mechanism | Last close / 1M |
ORDER 1 = השפעה ישירה וברורה מהאירוע.
ORDER 2 = השפעה משנית דרך consumer / credit / commodities / rates / supply chain / sentiment וכו'.
אל תסווג מניה כ-Order 1 רק משום שהעסק שלה "קשור לנושא". לכל מניה חייב להיות מנגנון transmission ברור.
אל תמציא exposure, revenue share או נתון פיננסי.

8. ETF MAPPING
בחר 4–7 ETFs מתוך: SPY QQQ IWM SMH XLE USO UNG GLD SLV TLT UUP ITA XAR EWT FXI KWEB EWJ EWY EPOL VGK EWZ REMX COPX WEAT DBA JETS XOP
טבלה:
| ETF | ↑/↓ | Exposure 1–3 | Mechanism | Last close / 1M | Already priced? |

9. PRICING CHECK
עבור הנכסים המרכזיים: Last Close, 1-month change, אם אפשר YTD, והאם כבר הייתה תנועה משמעותית בכיוון האירוע.
המטרה: לאתר האם הטרייד כבר crowded / priced in. אם המניה כבר זזה משמעותית לפני האירוע, אל תניח שהכתבה תיצור מהלך נוסף.
אם אין לך גישה לנתוני מחיר עדכניים, כתוב זאת ואל תמציא מספרים.

10. CLOSEST ANALOG
מצא את 1–3 האנלוגים ההיסטוריים הקרובים ביותר. לכל אחד: מה דומה, מה שונה, מה הייתה תגובת השוק, והאם האנלוג באמת רלוונטי או רק superficially similar.
אל תבחר אנלוג רק לפי נושא. העדף similarity לפי: 1. event type 2. surprise 3. policy mechanism 4. market regime 5. time horizon.

11. WHAT THE RESEARCH ACTUALLY SAYS
הפרד בין: Evidence (מה שהנתונים באמת מראים) / Hypothesis (מה שאפשר להסיק בזהירות) / Unknown (מה שאין מספיק נתונים לדעת).
אל תציג correlation כהוכחת causation.

12. CRITIQUE
בקר את התזה שלך בעצמך. ענה: 1. מה כבר מתומחר? 2. האם זה באמת NEW INFORMATION? 3. איזה חלק מהתגובה יכול להגיע מאירועים אחרים? 4. האם ה-historical sample מתאים לאירוע הזה? 5. איפה המדגם קטן מדי? 6. איפה קיימת survivorship / selection bias? 7. האם ה-regime הנוכחי שונה מהתקופה שבה נאסף המדגם? 8. מה הסיכון ל-false attribution?

13. WHAT WOULD FLIP THE THESIS?
ציין 3–5 עובדות עתידיות שאם יופיעו ישנו את המסקנה (נתון מאקרו חדש, החלטת ממשלה, שינוי בתשואות Treasury, תגובת SPY חריגה, שינוי במחירי commodities, מידע חדש שסותר את ההנחה המקורית).
לכל אחד: Current thesis → New information → Revised thesis.

14. FINAL TRADING FRAMEWORK
סכם אך ורק: Event (מה קרה) / Classification / Transferability (HIGH / MEDIUM / LOW / NOT TRANSFERABLE) / Surprise (LOW / MEDIUM / HIGH) / Market setup (FADE / CONTINUATION / NO CLEAR EDGE) / Key assets (3–5 הנכסים החשובים ביותר למעקב) / Invalidation (מה יגרום לבטל את התזה).
אל תיתן "Buy/Sell recommendation".

OUTPUT FORMAT
ענה רק בעברית. השתמש בדיוק בסעיפים (בסוגריים: אילו שלבים נכנסים לכל סעיף):
1. האירוע + אימות (שלבים 0, 0.5)
2. סיווג האירוע (שלב 1)
3. התאמה למחקר ההיסטורי (שלב 2 + מבחן ההעברה)
4. תגובת יום D (שלבים 3, 4, 5, 6: הפתעה, יום D, תגובת שוק, FADE / CONTINUATION)
5. 10 מניות (שלבים 7, 9)
6. ETFs (שלבים 8, 9)
7. האנלוג הקרוב ביותר (שלב 10)
8. מה המחקר באמת אומר (שלב 11)
9. ביקורת (שלב 12)
10. מה יהפוך את התזה (שלב 13)
11. סיכום Trading Framework (שלב 14)
אם עצרת בשלב 0.5, ענה רק בסעיף 1 ובשורת הסיכום.
כל טענה עובדתית עדכנית חייבת להיות מגובה במקור. אל תמציא נתונים. אל תציג תחזית כעובדה. אם אין מספיק מידע — כתוב שאין מספיק מידע.
בסוף: מחקר וניתוח בלבד, לא ייעוץ השקעות.`;
}

export function buildPrompt(opts) {
  return opts.format === 'chat' ? chatPrompt(opts) : jsonPrompt(opts);
}

