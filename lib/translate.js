// Free Google Translate endpoint (the one the browser extension uses), same
// approach as news-radar. It is unofficial and may throttle, so callers always
// get a result back: on failure the original text is kept and `ok` is false.

const ENDPOINT = process.env.TRANSLATE_ENDPOINT || 'https://translate.googleapis.com/translate_a/single';
const CHUNK_CHARS = 1500; // keep GET URLs well under limits
const CONCURRENCY = 4;
const MAX_CACHE = 5000;

const cache = new Map();
const key = (sl, tl, t) => `${sl}>${tl}:${t}`;
const norm = t => String(t || '').replace(/\s+/g, ' ').trim();

export const hasHebrew = s => /[֐-׿]/.test(s || '');

async function translateRaw(text, sl, tl) {
  const url = `${ENDPOINT}?client=gtx&dt=t&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const data = await res.json();
  return data[0].map(seg => seg[0]).join('');
}

// Several one-line texts per request, joined by newlines.
async function translateChunk(texts, sl, tl) {
  if (texts.length === 1) return [(await translateRaw(texts[0], sl, tl)).trim()];
  const lines = (await translateRaw(texts.join('\n'), sl, tl)).split('\n');
  if (lines.length === texts.length) return lines.map(l => l.trim());
  // Line structure got lost; fall back to one request per text.
  return Promise.all(texts.map(async t => (await translateRaw(t, sl, tl)).trim()));
}

export async function translateMany(texts, sl = 'en', tl = 'iw') {
  const todo = [...new Set(texts.map(norm).filter(t => t && !cache.has(key(sl, tl, t))))];
  const chunks = [];
  let cur = [], len = 0;
  for (const t of todo) {
    if (cur.length && len + t.length > CHUNK_CHARS) { chunks.push(cur); cur = []; len = 0; }
    cur.push(t); len += t.length + 1;
  }
  if (cur.length) chunks.push(cur);

  let ok = true;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(c => translateChunk(c, sl, tl)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') batch[j].forEach((t, k) => r.value[k] && cache.set(key(sl, tl, t), r.value[k]));
      else ok = false;
    });
  }
  if (cache.size > MAX_CACHE) cache.clear();
  return { texts: texts.map(t => cache.get(key(sl, tl, norm(t))) || t), ok };
}
