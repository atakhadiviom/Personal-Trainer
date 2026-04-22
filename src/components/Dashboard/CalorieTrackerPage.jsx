import React, { useState, useEffect, useRef } from 'react';
import { auth, db, aiInstance } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';
import * as googleFit from '../../utils/googleFitService';

const CalorieTrackerPage = ({ formData }) => {
  const weight = parseInt(formData.weight) || 75;
  const isFatLoss = formData.goal === 'fatloss';
  const [dynamicTarget, setDynamicTarget] = useState(null);
  const [fitSteps, setFitSteps] = useState(null);
  const [fitCalsBurned, setFitCalsBurned] = useState(null);
  const [plateauAlert, setPlateauAlert] = useState(false);

  const targetCals = isFatLoss ? weight * 22 : weight * 30;
  const finalTargetCals = dynamicTarget || targetCals;
  const targetPro = Math.round(weight * 2);
  const targetCarbs = Math.round((finalTargetCals * 0.4) / 4);
  const targetFat = Math.round((finalTargetCals * 0.25) / 9);

  const today = new Date().toISOString().split('T')[0];
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hey! 👋 Tell me what you ate and I'll calculate the calories and macros for you. Just type naturally — like \"2 eggs and toast with butter\" or \"large chicken shawarma wrap\"." }
  ]);
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        setError("Could not load calorie log.");
      }
    };
    load();
  }, [today]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkPlateau = async () => {
      if (!dynamicTarget) return;
      const user = auth.currentUser;
      if (!user) return;
      try {
        const days = [];
        for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const snap = await getDoc(doc(db, 'users', user.uid, 'calorieLog', dateStr));
          if (snap.exists()) {
            const entries = snap.data().entries || [];
            const total = entries.reduce((s, e) => s + (e.cals || 0), 0);
            if (total > 0) days.push(total);
          }
        }
        if (days.length >= 5) {
          const avg = days.reduce((a, b) => a + b, 0) / days.length;
          if (avg > finalTargetCals * 0.95) setPlateauAlert(true);
        }
      } catch (e) { console.warn('Plateau check error:', e); }
    };
    checkPlateau();
  }, [dynamicTarget, finalTargetCals]);

  useEffect(() => {
    const fetchTDEE = async () => {
      if (googleFit.getToken()) {
        try {
          const tdee = await googleFit.getWeeklyAverageCalories();
          if (tdee) setDynamicTarget(isFatLoss ? tdee - 500 : tdee + 500);
        } catch (e) { console.warn('TDEE fetch error:', e); }
      }
    };
    fetchTDEE();
  }, [isFatLoss]);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!googleFit.getToken()) return;
      try {
        const [steps, cals] = await Promise.all([googleFit.getSteps(), googleFit.getCaloriesBurned()]);
        if (steps != null) setFitSteps(steps);
        if (cals != null) setFitCalsBurned(cals);
      } catch (e) { console.warn('Activity fetch error:', e); }
    };
    fetchActivityData();
  }, []);

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
    setError('');
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

      const newEntries = parsed.items.map(item => ({
        meal: item.food,
        cals: item.cals,
        pro: item.pro,
        carbs: item.carbs,
        fat: item.fat
      }));
      const updatedEntries = [...entries, ...newEntries];
      setEntries(updatedEntries);

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'calorieLog', today), {
            entries: updatedEntries,
            chatHistory: [{ role: 'user', text: userMsg }, { role: 'ai', text: responseText }]
          }, { merge: true });
        } catch (err) {
          console.warn("Could not save calorie entry:", err);
          setError("Could not save calorie entry.");
        }
      }
    } catch (err) {
      console.error("AI calorie analysis failed:", err);
      setError("AI calorie analysis failed.");
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Couldn't analyze that right now. Try again in a moment — the AI might be rate-limited." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (index) => {
    const user = auth.currentUser;
    if (!user) {
      setError("Not authenticated. Please log in to delete entries.");
      return;
    }
    try {
      const updatedEntries = entries.filter((_, i) => i !== index);
      setEntries(updatedEntries);
      await setDoc(doc(db, 'users', user.uid, 'calorieLog', today), { entries: updatedEntries }, { merge: true });
    } catch (err) {
      console.error("Error deleting calorie entry:", err);
      setError("Could not delete entry.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <MacroRingsSection
        today={today}
        totalCals={totalCals}
        finalTargetCals={finalTargetCals}
        totalPro={totalPro}
        targetPro={targetPro}
        totalCarbs={totalCarbs}
        targetCarbs={targetCarbs}
        totalFat={totalFat}
        targetFat={targetFat}
        fitSteps={fitSteps}
        fitCalsBurned={fitCalsBurned}
        plateauAlert={plateauAlert}
      />

      <DailyLog entries={entries} handleDeleteEntry={handleDeleteEntry} />

      <ChatArea
        error={error}
        messages={messages}
        loading={loading}
        chatEndRef={chatEndRef}
      />

      <InputBar
        input={input}
        setInput={setInput}
        loading={loading}
        handleSend={handleSend}
      />
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

const MacroRingsSection = ({
  today,
  totalCals,
  finalTargetCals,
  totalPro,
  targetPro,
  totalCarbs,
  targetCarbs,
  totalFat,
  targetFat,
  fitSteps,
  fitCalsBurned,
  plateauAlert
}) => {
  return (
    <div className="section-card" style={{ borderTop: '4px solid var(--accent-green)', flexShrink: 0 }}>
      <div className="section-header"><h3 style={{ color: 'var(--accent-green)' }}>🔥 Today — {today}</h3></div>
      <div className="macro-rings">
        <MacroRing label="Calories" current={totalCals} target={finalTargetCals} color="var(--accent-orange)" unit="kcal" />
        <MacroRing label="Protein" current={totalPro} target={targetPro} color="var(--accent-green)" unit="g" />
        <MacroRing label="Carbs" current={totalCarbs} target={targetCarbs} color="var(--accent-cyan)" unit="g" />
        <MacroRing label="Fat" current={totalFat} target={targetFat} color="var(--accent-purple)" unit="g" />
      </div>
      {/* Feature 1: Step calorie sync */}
      {fitSteps != null && fitSteps > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>🚶 Steps bonus</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8a838' }}>+{Math.round(fitSteps * 0.04)} kcal from {fitSteps.toLocaleString()} steps</span>
        </div>
      )}
      {/* Feature 4: Smart hydration target */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>💧 Hydration goal</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{(fitCalsBurned || 0) > 500 ? '3.0' : '2.5'}L today{(fitCalsBurned || 0) > 500 ? ' (+0.5L for activity)' : ''}</span>
      </div>
      {/* Feature 11: Plateau alert */}
      {plateauAlert && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(232,168,56,0.3)', background: 'rgba(232,168,56,0.06)', borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
          <span style={{ fontSize: '0.82rem', color: '#e8a838' }}>📊 Plateau Alert — You've been at target calories for 7 days. Consider a 200 kcal reduction or a refeed day.</span>
        </div>
      )}
    </div>
  );
};

const DailyLog = ({ entries, handleDeleteEntry }) => {
  if (entries.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-card)',
      borderRadius: '8px',
      padding: '8px 12px',
      margin: '12px 0',
      flexShrink: 0
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        Today's Log
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map((entry, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.meal}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {entry.cals || 0} kcal • P:{entry.pro || 0}g C:{entry.carbs || 0}g F:{entry.fat || 0}g
              </span>
              <button
                onClick={() => handleDeleteEntry(index)}
                aria-label={`Delete ${entry.meal}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0 2px',
                  lineHeight: '1',
                  flexShrink: 0
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatArea = ({ error, messages, loading, chatEndRef }) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <div className="alert-box alert-warning" style={{ margin: '0 16px' }}>{error}</div>}
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
  );
};

const InputBar = ({ input, setInput, loading, handleSend }) => {
  return (
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
  );
};

export default CalorieTrackerPage;
