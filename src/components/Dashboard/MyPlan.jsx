import React, { useState, useEffect } from 'react';
import { auth, db, aiInstance } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';

const MyPlan = ({ formData, aiPlan }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedExercises, setCompletedExercises] = useState({});
  const [swapping, setSwapping] = useState(null); // tracks which exercise is being swapped
  const [localPlan, setLocalPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalPlan(aiPlan);
  }, [aiPlan]);

  // Load completed exercises from Firestore
  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().completedExercises) {
          setCompletedExercises(snap.data().completedExercises);
        }
      } catch (e) {
        console.error("Could not load completed exercises:", e);
        setError("Failed to load completed exercises. Please try again.");
      }
    };
    load();
  }, []);

  const toggleExercise = async (dayId, exIndex) => {
    const key = `${dayId}_${exIndex}`;
    const updated = { ...completedExercises, [key]: !completedExercises[key] };
    setCompletedExercises(updated);
    
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { completedExercises: updated });
      } catch (e) {
        console.error("Could not save exercise state:", e);
        setError("Failed to save exercise state. Please try again.");
      }
    }
  };

  const handleShare = async () => {
    const text = `I'm on Week ${selectedWeek} of my 12-week AI Gym Transformation with NovaFit 🔥`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NovaFit AI', text, url: window.location.href });
      } catch (e) {
         console.error("Share failed", e);
         setError("Failed to share your transformation status.");
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Transformation status copied to clipboard!');
    }
  };

  const handleSwap = async (dayIdx, exIdx, exName) => {
    const swapKey = `${dayIdx}_${exIdx}`;
    setSwapping(swapKey);

    try {
      const model = getGenerativeModel(aiInstance, {
        model: "gemini-2.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are a certified personal trainer. The client wants to swap "${exName}" for an alternative exercise that targets the EXACT same muscle group(s).

Client info: ${formData.fitnessLevel || 'beginner'} level, training in a ${formData.trainingEnv || 'full gym'}.
${formData.injuryAreas && formData.injuryAreas.length > 0 ? `Avoid stressing: ${formData.injuryAreas.join(', ')}` : ''}

Return ONLY this JSON (no markdown):
{
  "name": "Alternative Exercise Name",
  "sets": 3,
  "reps": "8-12",
  "rest": "90s",
  "weight": "Start: Xkg",
  "guide": "Clear form instructions"
}`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const newExercise = JSON.parse(text);

      // Replace exercise in local plan
      const updatedPlan = JSON.parse(JSON.stringify(localPlan));
      updatedPlan.workout.schedule[dayIdx].exercises[exIdx] = newExercise;
      setLocalPlan(updatedPlan);

      // Persist to Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { aiPlan: updatedPlan });
        } catch (e) {
          console.error("Could not persist swapped exercise:", e);
          setError("Failed to save the swapped exercise.");
        }
      }
    } catch (err) {
      console.error("AI Swap failed, using local fallback:", err);
      setError("AI Swap failed. Using a local fallback exercise instead.");
      // Local fallback swap
      const alternatives = {
        push: ["Dumbbell Floor Press", "Push-Up Variations", "Cable Chest Press", "Smith Machine Press"],
        pull: ["Cable Pullover", "Machine Row", "Resistance Band Pull-Apart", "Inverted Row"],
        legs: ["Step-Ups", "Wall Sit", "Split Squats", "Glute Bridge"],
        default: ["Resistance Band Alternative", "Machine Equivalent", "Dumbbell Variation"]
      };
      const nameL = exName.toLowerCase();
      const pool = nameL.includes('press') || nameL.includes('push') || nameL.includes('fly') ? alternatives.push
        : nameL.includes('row') || nameL.includes('pull') || nameL.includes('curl') ? alternatives.pull
        : nameL.includes('squat') || nameL.includes('lunge') || nameL.includes('leg') || nameL.includes('dead') ? alternatives.legs
        : alternatives.default;
      
      const altName = pool[Math.floor(Math.random() * pool.length)];
      const updatedPlan = JSON.parse(JSON.stringify(localPlan));
      const oldEx = updatedPlan.workout.schedule[dayIdx].exercises[exIdx];
      updatedPlan.workout.schedule[dayIdx].exercises[exIdx] = {
        ...oldEx,
        name: altName,
        guide: `Alternative for ${exName}. Same muscle group, adjusted for your setup.`
      };
      setLocalPlan(updatedPlan);
    } finally {
      setSwapping(null);
    }
  };

  const plan = localPlan;

  if (!plan) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏋️</div>
        <h3>No plan generated yet</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Complete the wizard to generate your personalized 12-week plan.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="alert-box" style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', color: '#ff6b6b', margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>&times;</button>
        </div>
      )}

      {/* Week Selector & Social Share */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div className="week-selector" style={{ flex: 1, paddingBottom: '0' }}>
          {[...Array(12)].map((_, i) => (
            <button key={i} className={`week-btn ${selectedWeek === i + 1 ? 'active' : ''}`} onClick={() => setSelectedWeek(i + 1)}>
              W{i + 1}
            </button>
          ))}
        </div>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', marginLeft: '12px' }} onClick={handleShare}>
          📤 Share
        </button>
      </div>

      {/* Phase Label */}
      <div style={{ margin: '20px 0 24px 0' }}>
        {plan.progression && plan.progression.map((p, i) => {
          const isActive = (selectedWeek <= 4 && i === 0) || (selectedWeek >= 5 && selectedWeek <= 8 && i === 1) || (selectedWeek >= 9 && i === 2);
          return isActive ? (
            <div key={i} className="alert-box" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', width: '100%' }}>
              <strong>{p.phase}:</strong> {p.focus}
            </div>
          ) : null;
        })}
      </div>

      {/* Daily Schedule */}
      {plan.workout && plan.workout.schedule.map((day, dayIdx) => (
        <div key={dayIdx} className="section-card" style={{ borderTop: '4px solid var(--accent-cyan)', marginBottom: '24px' }}>
          <div className="section-header">
            <h3 style={{ color: 'var(--accent-cyan)' }}>{day.label}</h3>
          </div>

          {/* Warmup */}
          <div className="phase warmup-phase">
            <h5>Warm-Up</h5>
            <ul>
              {day.warmup.map((w, i) => (
                <li key={i}>
                  <strong>{w.name}</strong> • {w.duration}
                  <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(w.name)}`} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none' }}>▶ Watch</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Exercises with checkboxes */}
          <div className="table-responsive">
            <table className="data-table exercise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>✓</th>
                  <th>Exercise</th>
                  <th>Sets × Reps</th>
                  <th>Rest</th>
                  <th>Weight</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, exIdx) => {
                  const key = `${day.id}_${exIdx}`;
                  const isDone = completedExercises[key];
                  const isSwapping = swapping === `${dayIdx}_${exIdx}`;
                  return (
                    <tr key={exIdx} style={{ opacity: isDone ? 0.5 : 1, textDecoration: isDone ? 'line-through' : 'none' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          className="exercise-checkbox"
                          checked={!!isDone}
                          onChange={() => toggleExercise(day.id, exIdx)}
                        />
                      </td>
                      <td className="ex-name">
                        {ex.name}
                        {ex.guide && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>{ex.guide}</div>}
                        <button 
                          onClick={() => handleSwap(dayIdx, exIdx, ex.name)} 
                          disabled={isSwapping}
                          style={{ background: 'none', border: 'none', color: isSwapping ? 'var(--accent-cyan)' : 'var(--text-dim)', fontSize: '0.7rem', cursor: isSwapping ? 'wait' : 'pointer', display: 'block', marginTop: '4px', textDecoration: 'underline' }}>
                           {isSwapping ? '⏳ Swapping...' : '🔄 Swap'}
                        </button>
                      </td>
                      <td className="ex-sets">{ex.sets} × {ex.reps}</td>
                      <td className="ex-rest">{ex.rest}</td>
                      <td className="ex-weight">{ex.weight}</td>
                      <td>
                        <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(ex.name)}`} target="_blank" rel="noreferrer" className="btn-yt">▶ Watch</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cooldown */}
          <div className="phase cooldown-phase">
            <h5>Cool-Down</h5>
            <ul>
              {day.cooldown.map((c, i) => (
                <li key={i}>
                  <strong>{c.name}</strong> • {c.duration}
                  <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(c.name)}`} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none' }}>▶ Watch</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyPlan;
