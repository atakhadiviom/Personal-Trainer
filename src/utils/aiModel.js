import { auth } from '../firebase';

// AI requests go through the Cloudflare Worker in /worker, which holds the
// DeepSeek key and only accepts calls with a valid Firebase ID token.
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL;

const callProxy = async (prompt) => {
  if (!PROXY_URL) throw new Error('AI proxy is not configured (VITE_AI_PROXY_URL is missing).');
  const user = auth?.currentUser;
  if (!user) throw new Error('Please sign in to use AI features.');
  const token = await user.getIdToken();

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* non-JSON error body */ }
    throw new Error(`AI request failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const { text } = await res.json();
  if (!text) throw new Error('Empty AI response');
  return text;
};

const isParseable = (text) => {
  try {
    JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return true;
  } catch {
    return false;
  }
};

// Same generateContent(...).response.text() shape the call sites already use.
export const getAIModel = () => ({
  generateContent: async (prompt) => {
    let text = await callProxy(prompt);
    // All prompts ask for JSON; retry once if the model returned something unparseable.
    if (!isParseable(text)) text = await callProxy(prompt);
    return { response: { text: () => text } };
  },
});
