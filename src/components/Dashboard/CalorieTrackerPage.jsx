import React, { useState, useEffect, useRef } from 'react';
import { auth, db, aiInstance } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';
import * as googleFit from '../../utils/googleFitService';

import { MacroRings } from './CalorieTracker/MacroRings';
import { TodayLog } from './CalorieTracker/TodayLog';
import { ChatArea } from './CalorieTracker/ChatArea';

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
      <MacroRings
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
      <TodayLog
        entries={entries}
        handleDeleteEntry={handleDeleteEntry}
      />
      <ChatArea
        error={error}
        messages={messages}
        loading={loading}
        chatEndRef={chatEndRef}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
      />
    </div>
  );
};

export default CalorieTrackerPage;
