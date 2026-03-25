import React, { useState, useEffect, useRef } from 'react';
import { auth, db, aiInstance } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';

const CalorieTrackerPage = ({ formData }) => {
  const weight = parseInt(formData.weight) || 75;
  const isFatLoss = formData.goal === 'fatloss';
  const targetCals = isFatLoss ? weight * 22 : weight * 30;
  const targetPro = Math.round(weight * 2);
  const targetCarbs = Math.round((targetCals * 0.4) / 4);
  const targetFat = Math.round((targetCals * 0.25) / 9);

  const today = new Date().toISOString().split('T')[0];
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hey! 👋 Tell me what you ate and I'll calculate the calories and macros for you. Just type naturally — like \"2 eggs and toast with butter\" or \"large chicken shawarma wrap\"." }
  ]);
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'calorieLog', today));
        if (snap.exists()) {
          const data = snap.data();
          if (data.entries) setEntries(data.entries);
          if (data.chatHistory) setMessages(prev => [...prev, ...data.chatHistory]);
        }
      } catch (e) {
        console.warn("Could not load calorie log:", e);
      }
    };
    load();
  }, [today]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  let totalCals = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    totalCals += (e.cals || 0);
    totalPro += (e.pro || 0);
    totalCarbs += (e.carbs || 0);
    totalFat += (e.fat || 0);
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const model = getGenerativeModel(aiInstance, {
        model: "gemini-2.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are a precise nutrition calculator. The user just told you what they ate. Analyze it and return the estimated nutritional breakdown.

User said: "${userMsg}"

Return ONLY this JSON (no markdown, no backticks):
{
  "items": [
    { "food": "food name", "portion": "estimated portion", "cals": 350, "pro": 30, "carbs": 40, "fat": 12 }
  ],
  "totalCals": 350,
  "totalPro": 30,
  "totalCarbs": 40,
  "totalFat": 12,
  "summary": "One sentence summarizing the meal and a quick health tip."
}

Be accurate. Use standard serving sizes if the user doesn't specify amounts. All values should be integers.`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      // Build AI response message
      let responseText = '';
      if (parsed.items && parsed.items.length > 0) {
        parsed.items.forEach(item => {
          responseText += `🍽 **${item.food}** (${item.portion})\n`;
          responseText += `   ${item.cals} kcal • ${item.pro}g protein • ${item.carbs}g carbs • ${item.fat}g fat\n\n`;
        });
        responseText += `📊 **Total: ${parsed.totalCals} kcal** | P: ${parsed.totalPro}g | C: ${parsed.totalCarbs}g | F: ${parsed.totalFat}g\n\n`;
        if (parsed.summary) responseText += `💡 ${parsed.summary}`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);

      // Add to daily entries
      const newEntries = parsed.items.map(item => ({
        meal: item.food,
        cals: item.cals,
        pro: item.pro,
        carbs: item.carbs,
        fat: item.fat
      }));
      const updatedEntries = [...entries, ...newEntries];
      setEntries(updatedEntries);

      // Persist
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'calorieLog', today), {
            entries: updatedEntries,
            chatHistory: [{ role: 'user', text: userMsg }, { role: 'ai', text: responseText }]
          }, { merge: true });
        } catch (err) {
          console.warn("Could not save calorie entry:", err);
        }
      }
    } catch (err) {
      console.error("AI calorie analysis failed:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Couldn't analyze that right now. Try again in a moment — the AI might be rate-limited." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Macro Rings */}
      <div className="section-card" style={{ borderTop: '4px solid var(--accent-green)', flexShrink: 0 }}>
        <div className="section-header"><h3 style={{ color: 'var(--accent-green)' }}>🔥 Today — {today}</h3></div>
        <div className="macro-rings">
          <MacroRing label="Calories" current={totalCals} target={targetCals} color="var(--accent-orange)" unit="kcal" />
          <MacroRing label="Protein" current={totalPro} target={targetPro} color="var(--accent-green)" unit="g" />
          <MacroRing label="Carbs" current={totalCarbs} target={targetCarbs} color="var(--accent-cyan)" unit="g" />
          <MacroRing label="Fat" current={totalFat} target={targetFat} color="var(--accent-purple)" unit="g" />
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: msg.role === 'user' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
            color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            border: msg.role === 'ai' ? '1px solid var(--border)' : 'none'
          }}>
            {msg.role === 'ai' && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>NovaFit AI</span>}
            {msg.text.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            fontSize: '0.9rem'
          }}>
            <span style={{ animation: 'pulse-glow 1.5s infinite' }}>🧠 Analyzing your food...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} style={{
        display: 'flex', gap: '8px', padding: '12px 0', borderTop: '1px solid var(--border)', flexShrink: 0
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="I just had 2 eggs and toast with butter..."
          disabled={loading}
          style={{ flex: 1, fontSize: '0.95rem' }}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()} style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
          {loading ? '...' : '📤 Send'}
        </button>
      </form>
    </div>
  );
};

const MacroRing = ({ label, current, target, color, unit }) => {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="macro-ring-card">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="16" fontFamily="Outfit" fontWeight="700">{current}</text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">/ {target}{unit}</text>
      </svg>
      <span className="macro-ring-label">{label}</span>
    </div>
  );
};

export default CalorieTrackerPage;
