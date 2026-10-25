import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// If VITE_DEEPSEEK_API_KEY is set at build time, call DeepSeek directly from the
// browser (the key is then visible in the shipped JS). Otherwise use the
// `deepseekChat` Cloud Function, which keeps the key server-side.
const DIRECT_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

const callDirect = async (prompt) => {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DIRECT_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    }),
  });
  if (!res.ok) {
    const hint = res.status === 401 ? ' (invalid API key)' : res.status === 402 ? ' (insufficient balance)' : res.status === 429 ? ' (rate limited)' : '';
    throw new Error(`DeepSeek error ${res.status}${hint}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty AI response');
  return text;
};

const callFunction = async (prompt) => {
  const call = httpsCallable(functions, 'deepseekChat', { timeout: 120000 });
  try {
    const { data } = await call({ prompt });
    return data.text;
  } catch (err) {
    throw new Error(`AI function unavailable (${err.code || 'unknown'}). It may not be deployed.`);
  }
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
    const run = () => (DIRECT_KEY ? callDirect(prompt) : callFunction(prompt));
    let text = await run();
    // All prompts ask for JSON; retry once if the model returned something unparseable.
    if (!isParseable(text)) text = await run();
    return { response: { text: () => text } };
  },
});
