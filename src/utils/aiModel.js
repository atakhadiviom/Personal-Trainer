import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Thin client for the `deepseekChat` Cloud Function. The DeepSeek API key lives
// server-side only. Exposes the same generateContent(...).response.text() shape
// the call sites already use.
export const getAIModel = () => ({
  generateContent: async (prompt) => {
    const call = httpsCallable(functions, 'deepseekChat', { timeout: 120000 });
    const { data } = await call({ prompt });
    return { response: { text: () => data.text } };
  },
});
