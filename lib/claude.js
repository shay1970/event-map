// Stage 1: Claude labels the event, picks candidates/indices and, for real
// events, checks the claim against news sites with the web_search server tool.
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../public/prompt.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
const VERIFY_DOMAINS = (process.env.VERIFY_DOMAINS ||
  'reuters.com,apnews.com,bloomberg.com,cnbc.com,wsj.com,ft.com,bbc.com,bbc.co.uk,aljazeera.com,timesofisrael.com,theguardian.com,nytimes.com,marketwatch.com,ynet.co.il,globes.co.il')
  .split(',').map(s => s.trim()).filter(Boolean);

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export class AnalysisError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

export function extractJson(s) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  const candidates = [fenced?.[1], s];
  for (const c of candidates) {
    if (!c) continue;
    const a = c.indexOf('{'), b = c.lastIndexOf('}');
    if (a < 0 || b <= a) continue;
    try { return JSON.parse(c.slice(a, b + 1)); } catch { /* try next */ }
  }
  return null;
}

function collectSearchResults(content) {
  const out = [];
  for (const b of content) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === 'web_search_result' && r.url) out.push({ title: r.title || r.url, url: r.url });
    }
  }
  return out;
}

export async function analyzeEvent({ text, mode, image, verify, sourceUrl, signal }) {
  const userContent = [];
  if (image) userContent.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  userContent.push({ type: 'text', text: buildPrompt({ text, mode, hasImg: !!image, verify, sourceUrl }) });

  const messages = [{ role: 'user', content: userContent }];
  const tools = verify ? [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5, allowed_domains: VERIFY_DOMAINS }] : undefined;
  const allContent = [];
  let final;

  // Server tools can end a turn with pause_turn; resend to let it continue.
  for (let round = 0; round < 4; round++) {
    let msg;
    try {
      msg = await getClient().beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: 'adaptive' },
        output_config: { effort: process.env.CLAUDE_EFFORT || 'high' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        ...(tools ? { tools } : {}),
        messages,
      }, { signal }).finalMessage();
    } catch (e) {
      if (signal?.aborted) throw new AnalysisError('cancelled');
      if (e instanceof Anthropic.AuthenticationError) throw new AnalysisError('auth', 'מפתח ה-API של Anthropic לא תקין או חסר.');
      if (e instanceof Anthropic.RateLimitError) throw new AnalysisError('rate_limited');
      if (e instanceof Anthropic.BadRequestError) throw new AnalysisError('bad_request', e.message);
      if (e instanceof Anthropic.APIError) throw new AnalysisError('upstream_error', e.message);
      throw new AnalysisError('upstream_error', e?.message);
    }
    allContent.push(...msg.content);
    if (msg.stop_reason === 'refusal') throw new AnalysisError('refused');
    if (msg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: msg.content });
      continue;
    }
    final = msg;
    break;
  }
  if (!final) throw new AnalysisError('upstream_error', 'הניתוח לא הסתיים');

  // The JSON is the text after the last tool result.
  let lastTool = -1;
  final.content.forEach((b, i) => { if (b.type.endsWith('_tool_result') || b.type === 'server_tool_use') lastTool = i; });
  const tail = final.content.slice(lastTool + 1).filter(b => b.type === 'text').map(b => b.text).join('');
  const out = extractJson(tail) || extractJson(final.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  if (!out || !Array.isArray(out.candidates)) throw new AnalysisError('invalid_json');

  out.verification ??= { status: 'not_checked', note: '', sources: [] };
  const searched = collectSearchResults(allContent);
  if (searched.length) {
    const have = new Set((out.verification.sources || []).map(s => s.url));
    out.verification.searched = searched.filter(s => !have.has(s.url)).slice(0, 8);
  }
  out.model = final.model;
  return out;
}
