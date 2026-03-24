import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const MyPlan = ({ formData, aiPlan }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedExercises, setCompletedExercises] = useState({});

  // Load completed exercises from Firestore
  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().completedExercises) {
        setCompletedExercises(snap.data().completedExercises);
      }
    };
    load();
  }, []);

  const toggleExercise = async (dayId, exIndex) => {
    const key = `${dayId}_${exIndex}`;
    const updated = { ...completedExercises, [key]: !completedExercises[key] };
    setCompletedExercises(updated);
    
    // Persist to Firestore
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { completedExercises: updated });
    }
  };

  const handleShare = async () => {
    const text = `I'm on Week ${selectedWeek} of my 12-week AI Gym Transformation with NovaFit 🔥`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NovaFit AI', text, url: window.location.href });
      } catch (e) {
         console.warn("Share failed", e);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Transformation status copied to clipboard!');
    }
  };

  const handleSwap = (exName) => {
    alert(`AI Swap analyzing: Finding alternative for [${exName}] targeting the exact same muscle group... \n(This will trigger the Gemini function upon deployment).`);
  };

  if (!aiPlan) {
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
        {aiPlan.progression && aiPlan.progression.map((p, i) => {
          const isActive = (selectedWeek <= 4 && i === 0) || (selectedWeek >= 5 && selectedWeek <= 8 && i === 1) || (selectedWeek >= 9 && i === 2);
          return isActive ? (
            <div key={i} className="alert-box" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', width: '100%' }}>
              <strong>{p.phase}:</strong> {p.focus}
            </div>
          ) : null;
        })}
      </div>

      {/* Daily Schedule */}
      {aiPlan.workout && aiPlan.workout.schedule.map((day, idx) => (
        <div key={idx} className="section-card" style={{ borderTop: '4px solid var(--accent-cyan)', marginBottom: '24px' }}>
          <div className="section-header">
            <h3 style={{ color: 'var(--accent-cyan)' }}>{day.label}</h3>
          </div>

          {/* Warmup */}
          <div className="phase warmup-phase">
            <h5>Warm-Up</h5>
            <ul>
              {day.warmup.map((w, i) => <li key={i}><strong>{w.name}</strong> • {w.duration}</li>)}
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
                {day.exercises.map((ex, i) => {
                  const key = `${day.id}_${i}`;
                  const isDone = completedExercises[key];
                  return (
                    <tr key={i} style={{ opacity: isDone ? 0.5 : 1, textDecoration: isDone ? 'line-through' : 'none' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          className="exercise-checkbox"
                          checked={!!isDone}
                          onChange={() => toggleExercise(day.id, i)}
                        />
                      </td>
                      <td className="ex-name">
                        {ex.name}
                        <button onClick={() => handleSwap(ex.name)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.7rem', cursor: 'pointer', display: 'block', marginTop: '4px', textDecoration: 'underline' }}>
                           [Swap]
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
              {day.cooldown.map((c, i) => <li key={i}><strong>{c.name}</strong> • {c.duration}</li>)}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyPlan;
