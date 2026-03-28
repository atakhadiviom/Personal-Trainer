import React, { useState, useEffect, useRef } from 'react';
import { auth, db, aiInstance } from '../../firebase';
import ExerciseRow from './ExerciseRow';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';

const MyPlan = ({ formData, aiPlan }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedExercises, setCompletedExercises] = useState({});
  const [weeklyPlans, setWeeklyPlans] = useState({});
  const [swapping, setSwapping] = useState(null);
  const [localPlan, setLocalPlan] = useState(null);
  const [error, setError] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkinData, setCheckinData] = useState({
    currentWeight: formData?.weight || '',
    weekRating: 'perfect',
    energyLevel: 3,
    newPain: '',
    notes: ''
  });

  const errorTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);

  const displayError = (msg) => {
    setError(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setError(''), 5000);
  };

  useEffect(() => { setLocalPlan(aiPlan); }, [aiPlan]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.completedExercises) setCompletedExercises(data.completedExercises);
          if (data.weeklyPlans) setWeeklyPlans(data.weeklyPlans);
          if (data.formData?.weight) setCheckinData(prev => ({ ...prev, currentWeight: data.formData.weight }));

          // If week 1 already completed before this update (old key format), show check-in automatically
          if (localPlan && !data.weeklyPlans?.['2']) {
            const schedule = localPlan.workout.schedule;
            const completed = data.completedExercises || {};
            const w1Done = schedule?.every((day) =>
              day.exercises.every((_, exIdx) =>
                completed[`w1_${day.id}_${exIdx}`] || completed[`${day.id}_${exIdx}`]
              )
            );
            if (w1Done) setTimeout(() => setShowCheckin(true), 800);
          }
        }
      } catch (e) {
        console.error('Could not load user data:', e);
        displayError('Could not load user data.');
      }
    };
    load();
  }, []);

  const getScheduleForWeek = (week) => {
    if (!localPlan) return null;
    if (week === 1) return localPlan.workout.schedule;
    return weeklyPlans[String(week)]?.schedule || null;
  };

  const isWeekComplete = (week, schedule, completed) => {
    if (!schedule) return false;
    return schedule.every((day) =>
      day.exercises.every((_, exIdx) => {
        const key = `w${week}_${day.id}_${exIdx}`;
        const oldKey = week === 1 ? `${day.id}_${exIdx}` : null;
        return completed[key] === true || (oldKey && completed[oldKey] === true);
      })
    );
  };

  const toggleExercise = (dayId, exIdx) => {
    const key = `w${selectedWeek}_${dayId}_${exIdx}`;
    setCompletedExercises(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      isDirtyRef.current = true;
      const schedule = getScheduleForWeek(selectedWeek);
      if (!prev[key] && isWeekComplete(selectedWeek, schedule, updated)) {
        const nextExists = getScheduleForWeek(selectedWeek + 1);
        if (!nextExists && selectedWeek < 12) {
          setTimeout(() => setShowCheckin(true), 600);
        }
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!isDirtyRef.current) return;
    const t = setTimeout(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { completedExercises });
          isDirtyRef.current = false;
        } catch (e) { console.warn('Could not save exercise state:', e); }
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [completedExercises]);

  const handleShare = async () => {
    const text = `I just finished Week ${selectedWeek} of my AI Gym Transformation with NovaFit 🔥`;
    if (navigator.share) {
      try { await navigator.share({ title: 'NovaFit AI', text, url: window.location.href }); }
      catch (e) { displayError('Could not share plan.'); }
    } else {
      navigator.clipboard.writeText(text);
      alert('Status copied to clipboard!');
    }
  };

  const handleSwap = async (dayIdx, exIdx, exName) => {
    const swapKey = `${dayIdx}_${exIdx}`;
    setSwapping(swapKey);
    try {
      const model = getGenerativeModel(aiInstance, {
        model: 'gemini-2.5-flash-lite',
        generationConfig: { responseMimeType: 'application/json' }
      });
      const prompt = `You are a certified personal trainer. The client wants to swap "${exName}" for an alternative exercise that targets the EXACT same muscle group(s).
Client info: ${formData.fitnessLevel || 'beginner'} level, training in a ${formData.trainingEnv || 'full gym'}.
${formData.injuryAreas?.length > 0 ? `Avoid stressing: ${formData.injuryAreas.join(', ')}` : ''}
Return ONLY this JSON (no markdown):
{"name":"Alternative Exercise Name","sets":3,"reps":"8-12","rest":"90s","weight":"Start: Xkg","guide":"Clear form instructions"}`;
      const result = await model.generateContent(prompt);
      const newEx = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      const user = auth.currentUser;
      if (selectedWeek === 1) {
        const updatedPlan = JSON.parse(JSON.stringify(localPlan));
        updatedPlan.workout.schedule[dayIdx].exercises[exIdx] = newEx;
        setLocalPlan(updatedPlan);
        if (user) await updateDoc(doc(db, 'users', user.uid), { aiPlan: updatedPlan });
      } else {
        const updatedWeekly = JSON.parse(JSON.stringify(weeklyPlans));
        updatedWeekly[String(selectedWeek)].schedule[dayIdx].exercises[exIdx] = newEx;
        setWeeklyPlans(updatedWeekly);
        if (user) await updateDoc(doc(db, 'users', user.uid), { weeklyPlans: updatedWeekly });
      }
    } catch (err) {
      console.error('AI Swap failed:', err);
      displayError('AI Swap failed.');
    } finally {
      setSwapping(null);
    }
  };

  const generateNextWeek = async () => {
    setIsGenerating(true);
    try {
      const currentSchedule = getScheduleForWeek(selectedWeek);
      const model = getGenerativeModel(aiInstance, {
        model: 'gemini-2.5-flash-lite',
        generationConfig: { responseMimeType: 'application/json' }
      });
      const prompt = `You are an elite personal trainer. Generate Week ${selectedWeek + 1} workouts only.

CLIENT PROFILE: ${JSON.stringify(formData)}
WEEK ${selectedWeek} FEEDBACK:
- Weight now: ${checkinData.currentWeight}kg
- How the week felt: ${checkinData.weekRating}
- Energy level: ${checkinData.energyLevel}/5
- New pain/injuries: ${checkinData.newPain || 'none'}
- Notes: ${checkinData.notes || 'none'}

LAST WEEK SCHEDULE (for progression reference):
${JSON.stringify(currentSchedule)}

INSTRUCTIONS:
- If weekRating is "too_easy": increase weight by 5-10%, add 1 set to 2 exercises
- If weekRating is "perfect": increase weight by 2.5-5%, keep volume same
- If weekRating is "too_hard": keep same weights, reduce to 2 sets, add more rest
- If energyLevel <= 2: reduce total volume by 20%
- If newPain is mentioned: remove exercises that stress that area
- Keep same number of days and same day labels
- Vary exercises slightly for novelty (swap 1-2 per day max)

Return ONLY this JSON (no markdown):
{
  "schedule": [
    {
      "id": "day1",
      "label": "Upper Body Push",
      "warmup": [{"name": "string", "duration": "string"}],
      "exercises": [{"name": "string", "sets": 3, "reps": "8-12", "rest": "90s", "weight": "Start: 20kg", "guide": "form cue"}],
      "cooldown": [{"name": "string", "duration": "string"}]
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const nextWeekPlan = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      const updatedWeekly = { ...weeklyPlans, [String(selectedWeek + 1)]: nextWeekPlan };
      const user = auth.currentUser;
      if (user) {
        const updateObj = { weeklyPlans: updatedWeekly };
        if (String(checkinData.currentWeight) !== String(formData.weight)) {
          updateObj['formData.weight'] = checkinData.currentWeight;
        }
        await updateDoc(doc(db, 'users', user.uid), updateObj);
      }
      setWeeklyPlans(updatedWeekly);
      setShowCheckin(false);
      setSelectedWeek(selectedWeek + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      displayError('Failed to generate next week. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const schedule = getScheduleForWeek(selectedWeek);
  const currentWeekDone = isWeekComplete(selectedWeek, schedule, completedExercises);
  const nextWeekExists = !!getScheduleForWeek(selectedWeek + 1);
  const showCheckinBanner = currentWeekDone && !nextWeekExists && selectedWeek < 12;

  if (!localPlan) {
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
      {error && <div className="alert-box alert-warning" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Week Complete Banner */}
      {showCheckinBanner && (
        <button
          onClick={() => setShowCheckin(true)}
          style={{ width: '100%', marginBottom: '16px', padding: '16px', borderRadius: 'var(--r-md)', border: '2px solid var(--accent-cyan)', background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          🎉 Week {selectedWeek} Complete! → Submit Check-In to Unlock Week {selectedWeek + 1}
        </button>
      )}

      {/* Week Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div className="week-selector" style={{ flex: 1, paddingBottom: '0' }}>
          {[...Array(12)].map((_, i) => {
            const w = i + 1;
            const s = getScheduleForWeek(w);
            const done = isWeekComplete(w, s, completedExercises);
            const prevDone = w === 1 || isWeekComplete(w - 1, getScheduleForWeek(w - 1), completedExercises);
            const locked = w > 1 && !s && !prevDone;
            return (
              <button
                key={i}
                className={`week-btn ${selectedWeek === w ? 'active' : ''}`}
                onClick={() => setSelectedWeek(w)}
                disabled={locked}
                title={locked ? `Complete Week ${w - 1} first` : ''}
              >
                {done ? '✓' : locked ? '🔒' : `W${w}`}
              </button>
            );
          })}
        </div>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', marginLeft: '12px' }} onClick={handleShare}>
          📤 Share
        </button>
      </div>

      {/* Locked week */}
      {!schedule ? (
        <div className="section-card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
          <h3>Week {selectedWeek} Locked</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Complete Week {selectedWeek - 1} and submit your check-in to unlock your personalized Week {selectedWeek} workouts.
          </p>
        </div>
      ) : (
        <>
          {/* Phase Label */}
          <div style={{ margin: '20px 0 24px 0' }}>
            {localPlan.progression?.map((p, i) => {
              const isActive = (selectedWeek <= 4 && i === 0) || (selectedWeek >= 5 && selectedWeek <= 8 && i === 1) || (selectedWeek >= 9 && i === 2);
              return isActive ? (
                <div key={i} className="alert-box" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', width: '100%' }}>
                  <strong>{p.phase}:</strong> {p.focus}
                </div>
              ) : null;
            })}
          </div>

          {/* Daily Schedule */}
          {schedule.map((day, dayIdx) => (
            <div key={dayIdx} className="section-card" style={{ borderTop: '4px solid var(--accent-cyan)', marginBottom: '24px' }}>
              <div className="section-header">
                <h3 style={{ color: 'var(--accent-cyan)' }}>{day.label}</h3>
              </div>

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
                      const key = `w${selectedWeek}_${day.id}_${exIdx}`;
                      const oldKey = selectedWeek === 1 ? `${day.id}_${exIdx}` : null;
                      const isDone = !!(completedExercises[key] || (oldKey && completedExercises[oldKey]));
                      return (
                        <ExerciseRow
                          key={exIdx}
                          ex={ex}
                          exIdx={exIdx}
                          dayIdx={dayIdx}
                          dayId={day.id}
                          isDone={isDone}
                          isSwapping={swapping === `${dayIdx}_${exIdx}`}
                          toggleExercise={toggleExercise}
                          handleSwap={handleSwap}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
        </>
      )}

      {/* Week Complete Check-in Modal */}
      {showCheckin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="section-card" style={{ width: '100%', maxWidth: '480px', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '32px 24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowCheckin(false)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>×</button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
              <h2 style={{ margin: 0 }}>Week {selectedWeek} Complete!</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Tell me how it went so I can personalize Week {selectedWeek + 1} for you.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Weight (kg)</label>
              <input type="number" className="input-field" value={checkinData.currentWeight} onChange={e => setCheckinData({ ...checkinData, currentWeight: e.target.value })} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>How did this week feel?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'too_easy', label: 'Too Easy', emoji: '😴' },
                  { id: 'perfect', label: 'Perfect', emoji: '💪' },
                  { id: 'too_hard', label: 'Too Hard', emoji: '🥵' }
                ].map(opt => (
                  <button key={opt.id} onClick={() => setCheckinData({ ...checkinData, weekRating: opt.id })} style={{ padding: '14px 8px', borderRadius: 'var(--r-md)', border: `2px solid ${checkinData.weekRating === opt.id ? 'var(--accent-cyan)' : 'var(--border)'}`, background: checkinData.weekRating === opt.id ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)' }}>
                    <div style={{ fontSize: '1.4rem' }}>{opt.emoji}</div>
                    <div style={{ fontSize: '0.72rem', marginTop: '4px', color: 'var(--text-secondary)' }}>{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Energy level this week</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setCheckinData({ ...checkinData, energyLevel: n })} style={{ flex: 1, height: '44px', borderRadius: 'var(--r-md)', border: 'none', background: checkinData.energyLevel >= n ? 'var(--accent-cyan)' : 'var(--bg-card)', color: checkinData.energyLevel >= n ? '#000' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>New pain or injuries? <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
              <textarea className="input-field" rows="2" placeholder="e.g. Left shoulder twinge on bench press..." value={checkinData.newPain} onChange={e => setCheckinData({ ...checkinData, newPain: e.target.value })} style={{ resize: 'none' }} />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Anything else? <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
              <textarea className="input-field" rows="2" placeholder="Sleep quality, diet, motivation..." value={checkinData.notes} onChange={e => setCheckinData({ ...checkinData, notes: e.target.value })} style={{ resize: 'none' }} />
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }} onClick={generateNextWeek} disabled={isGenerating}>
              {isGenerating ? `⏳ Generating Week ${selectedWeek + 1}...` : `Generate Week ${selectedWeek + 1} 🚀`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPlan;
