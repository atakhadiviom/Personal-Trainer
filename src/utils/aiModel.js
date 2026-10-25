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
  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty AI response');
  return text;
};

const callFunction = async (prompt) => {
  const call = httpsCallable(functions, 'deepseekChat', { timeout: 120000 });
  const { data } = await call({ prompt });
  return data.text;
};

// Same generateContent(...).response.text() shape the call sites already use.
export const getAIModel = () => ({
  generateContent: async (prompt) => {
    const text = await (DIRECT_KEY ? callDirect(prompt) : callFunction(prompt));
    return { response: { text: () => text } };
  },
});
