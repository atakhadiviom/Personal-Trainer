import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CalorieTrackerPage = ({ formData }) => {
  const weight = parseInt(formData.weight) || 75;
  const isFatLoss = formData.goal === 'fatloss';
  const targetCals = isFatLoss ? weight * 22 : weight * 30;
  const targetPro = Math.round(weight * 2);
  const targetCarbs = Math.round((targetCals * 0.4) / 4);
  const targetFat = Math.round((targetCals * 0.25) / 9);

  const today = new Date().toISOString().split('T')[0];
  const [log, setLog] = useState([]);
  const [meal, setMeal] = useState('');
  const [cals, setCals] = useState('');
  const [pro, setPro] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid, 'calorieLog', today));
      if (snap.exists()) setLog(snap.data().entries || []);
    };
    load();
  }, [today]);

  const totalCals = log.reduce((s, e) => s + (parseInt(e.cals) || 0), 0);
  const totalPro = log.reduce((s, e) => s + (parseInt(e.pro) || 0), 0);
  const totalCarbs = log.reduce((s, e) => s + (parseInt(e.carbs) || 0), 0);
  const totalFat = log.reduce((s, e) => s + (parseInt(e.fat) || 0), 0);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!meal || !cals) return;
    const entry = { meal, cals: parseInt(cals), pro: parseInt(pro) || 0, carbs: parseInt(carbs) || 0, fat: parseInt(fat) || 0 };
    const updated = [...log, entry];
    setLog(updated);

    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'calorieLog', today), { entries: updated }, { merge: true });
    }

    setMeal(''); setCals(''); setPro(''); setCarbs(''); setFat('');
  };

  const pct = (val, target) => Math.min(Math.round((val / target) * 100), 100);

  return (
    <div className="animate-fade-in">
      {/* Macro Rings */}
      <div className="section-card" style={{ borderTop: '4px solid var(--accent-green)' }}>
        <div className="section-header"><h3 style={{ color: 'var(--accent-green)' }}>🔥 Today's Nutrition — {today}</h3></div>
        
        <div className="macro-rings">
          <MacroRing label="Calories" current={totalCals} target={targetCals} color="var(--accent-orange)" unit="kcal" />
          <MacroRing label="Protein" current={totalPro} target={targetPro} color="var(--accent-green)" unit="g" />
          <MacroRing label="Carbs" current={totalCarbs} target={targetCarbs} color="var(--accent-cyan)" unit="g" />
          <MacroRing label="Fat" current={totalFat} target={targetFat} color="var(--accent-purple)" unit="g" />
        </div>
      </div>

      {/* Quick Add */}
      <div className="section-card" style={{ borderTop: '4px solid var(--accent-orange)', marginTop: '24px' }}>
        <div className="section-header"><h3 style={{ color: 'var(--accent-orange)' }}>➕ Log a Meal</h3></div>
        <form onSubmit={addEntry} style={{ padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Meal Name</label>
            <input value={meal} onChange={e => setMeal(e.target.value)} placeholder="e.g., Chicken & Rice" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Cals</label>
            <input type="number" value={cals} onChange={e => setCals(e.target.value)} placeholder="500" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Protein</label>
            <input type="number" value={pro} onChange={e => setPro(e.target.value)} placeholder="40" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Carbs</label>
            <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="60" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fat</label>
            <input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="15" />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '14px 20px', height: 'fit-content' }}>+</button>
        </form>

        {/* Log Table */}
        {log.length > 0 && (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Meal</th><th>Cals</th><th>P</th><th>C</th><th>F</th></tr></thead>
              <tbody>
                {log.map((entry, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{entry.meal}</td>
                    <td>{entry.cals}</td>
                    <td>{entry.pro}g</td>
                    <td>{entry.carbs}g</td>
                    <td>{entry.fat}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
