import { send, passwordRequired, hasClaudeKey, analyzeReady } from '../lib/api.js';

export default function handler(req, res) {
  send(res, 200, { ok: true, claude: hasClaudeKey(), analyze: analyzeReady(), passwordRequired: passwordRequired() });
}
