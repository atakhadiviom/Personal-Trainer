import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { auth, db, aiInstance } from '../../firebase';
import ExerciseRow from './ExerciseRow';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';
import * as googleFit from '../../utils/googleFitService';

const MyPlan = ({ formData, aiPlan }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedExercises, setCompletedExercises] = useState({});
  const [weeklyPlans, setWeeklyPlans] = useState({});
  const [swapping, setSwapping] = useState(null);
  const [localPlan, setLocalPlan] = useState(null);
  const [error, setError] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sleepData, setSleepData] = useState(null);
  const [readinessColor, setReadinessColor] = useState('gray');
  const [readinessLabel, setReadinessLabel] = useState('Checking Readiness...');
  const [fitSteps, setFitSteps] = useState(null);
  const [fitCalsBurned, setFitCalsBurned] = useState(null);
  const [restingHR, setRestingHR] = useState(null);
  const [stepAvg7Day, setStepAvg7Day] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(!!sessionStorage.getItem('gfit_nudge_dismissed'));
  const [heartRateForCheckin, setHeartRateForCheckin] = useState(null);
  const [sleepHistoryForCheckin, setSleepHistoryForCheckin] = useState([]);
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
    const fetchHealthData = async () => {
      if (!googleFit.getToken()) return;
      try {
        // Sleep + readiness
        const hrs = await googleFit.getSleep();
        if (hrs) {
          setSleepData(hrs);
          const numHrs = parseFloat(hrs);
          const baseline = parseInt(localStorage.getItem('gfit_hr_baseline') || '0');
          const rhr = await googleFit.getRestingHeartRate();
          if (rhr) {
            setRestingHR(rhr);
            localStorage.setItem('gfit_hr_baseline', String(rhr));
          }
          const hrElevated = rhr && baseline && rhr > baseline * 1.10;
          if (hrElevated && numHrs < 6) {
            setReadinessColor('#ff6b6b');
            setReadinessLabel('⚠️ High HR + Low Sleep — Rest Day Recommended');
          } else if (numHrs >= 7) {
            setReadinessColor('var(--accent-green)');
            setReadinessLabel('Optimal Readiness');
          } else if (numHrs >= 5.5) {
            setReadinessColor('var(--accent-orange)');
            setReadinessLabel('Moderate Readiness');
          } else {
            setReadinessColor('#ff6b6b');
            setReadinessLabel('Low Readiness — Consider Active Recovery');
          }
        }
        // Steps + calories for progress pills
        const [steps, cals, avg] = await Promise.all([
          googleFit.getSteps(),
          googleFit.getCaloriesBurned(),
          googleFit.get7DayStepAverage()
        ]);
        if (steps != null) setFitSteps(steps);
        if (cals != null) setFitCalsBurned(cals);
        if (avg != null) setStepAvg7Day(avg);
      } catch (e) { console.warn('Health data fetch error:', e); }
    };
    fetchHealthData();
  }, []);

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
      catch { displayError('Could not share plan.'); }
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
      if (!currentSchedule?.length) {
        throw new Error('Current week schedule is unavailable.');
      }

      let hrData = heartRateForCheckin;
      let sleepHist = sleepHistoryForCheckin;
      if (googleFit.getToken()) {
        try {
          const [hr, sh] = await Promise.all([googleFit.getHeartRate(), googleFit.getSleepHistory()]);
          if (hr) { hrData = hr; setHeartRateForCheckin(hr); }
          if (sh?.length) { sleepHist = sh.map(d => d.hours); setSleepHistoryForCheckin(sh.map(d => d.hours)); }
        } catch (e) { console.warn('Pre-checkin health fetch:', e); }
      }

      // Collect ALL exercise names used across every week so far
      const usedEver = new Set([
        ...(localPlan?.workout?.schedule || []).flatMap(d => d.exercises.map(e => e.name)),
        ...Object.values(weeklyPlans).flatMap(wp => (wp.schedule || []).flatMap(d => d.exercises.map(e => e.name)))
      ]);

      // Full exercise pool per category
      const POOL = {
        push: ['Dumbbell Flat Bench Press','Cable Chest Fly','Pec Deck Machine','Dips (Chest-Leaning)','Smith Machine Incline Press','Low Cable Chest Fly','Dumbbell Shoulder Press','Arnold Press','Lateral Raises (Dumbbell)','Front Raises (Dumbbell)','EZ-Bar Skull Crushers','Overhead Tricep Extension (Cable)','Close-Grip Bench Press','Tricep Dip Machine','Cable Lateral Raise','Seated Dumbbell Press'],
        pull: ['Wide-Grip Assisted Pull-up','Single-Arm Dumbbell Row','T-Bar Row','Bent-Over Barbell Row','High Cable Row (Wide Grip)','Reverse Fly (Pec Deck)','Straight-Arm Pulldown','Incline Dumbbell Curl','Preacher Curl (Machine)','Cable Curl (Straight Bar)','Concentration Curl','Reverse Curl (EZ-Bar)','Chest-Supported Row','Rope Hammer Curl'],
        legs: ['Hack Squat Machine','Bulgarian Split Squat','Smith Machine Squat','Sumo Dumbbell Squat','Step-ups (Dumbbell)','Hip Thrust (Barbell)','Seated Leg Extension Machine','Donkey Calf Raise','Tibialis Raise','Adductor Machine','Abductor Machine','Lying Leg Curl','Single-Leg Press','Reverse Lunge (Dumbbell)'],
        fullbody: ['Barbell Deadlift','Dumbbell Clean & Press','Kettlebell Swing','Farmer Carries','Cable Woodchop','Ab Wheel Rollout','Dead Bug','Hollow Body Hold','Mountain Climbers','Pallof Press','Landmine Rotation','Medicine Ball Slam','Suitcase Carry','TRX Row','Battle Rope Waves']
      };

      // For each day, CODE picks the exercises — AI has no choice
      const nextScheduleSkeleton = currentSchedule.map(day => {
        const label = day.label.toLowerCase();
        let pool;
        if (label.includes('push')) pool = POOL.push;
        else if (label.includes('pull')) pool = POOL.pull;
        else if (label.includes('lower') || label.includes('leg')) pool = POOL.legs;
        else pool = POOL.fullbody;

        // Fresh = never used before
        const fresh = pool.filter(ex => !usedEver.has(ex));
        // Keep up to 1 exercise from last week for continuity (the heaviest compound)
        const keep = day.exercises.slice(0, 1);
        // Fill rest with fresh exercises (4 new ones)
        const newExercises = fresh.slice(0, Math.max(day.exercises.length - 1, 4));
        const selected = [...keep.map(e => e.name), ...newExercises].slice(0, day.exercises.length);

        return { id: day.id, label: day.label, exercises: selected, warmup: day.warmup, cooldown: day.cooldown };
      });

      // Weight progression multiplier
      const weightMult = checkinData.weekRating === 'too_easy' ? 1.075 : checkinData.weekRating === 'too_hard' ? 1.0 : 1.03;
      const lastWeekWeights = {};
      currentSchedule.forEach(d => d.exercises.forEach(e => { lastWeekWeights[e.name] = e.weight; }));

      const model = getGenerativeModel(aiInstance, {
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `You are a personal trainer. For each exercise listed below, provide sets, reps, rest, weight, and a brief form guide. Do NOT change the exercise names.

CLIENT: ${formData.fitnessLevel || 'beginner'}, ${formData.age}yo ${formData.gender}, ${formData.weight}kg, goal: ${formData.goal}, gym: full gym
WEEK RATING: ${checkinData.weekRating}, Energy: ${checkinData.energyLevel}/5
${checkinData.newPain ? `AVOID stressing: ${checkinData.newPain}` : ''}

WEIGHT GUIDANCE:
- For carried-over exercises: multiply last week's weight by ${weightMult.toFixed(3)} and round to nearest 0.5kg
- Last week's weights: ${Object.entries(lastWeekWeights).map(([n,w])=>`${n}: ${w}`).join(', ')}
- For NEW exercises: estimate appropriate starting weight for a ${formData.fitnessLevel || 'beginner'}
- ${checkinData.weekRating === 'too_hard' ? 'Week was too hard — keep weights conservative' : checkinData.weekRating === 'too_easy' ? 'Week was too easy — push the weights up' : 'Week felt right — small progressive increase'}
- ${sleepHist.filter(h=>h<6).length >= 3 ? 'Poor sleep this week — reduce volume by 1 set per exercise' : ''}

EXERCISES TO FILL IN (keep these exact names):
${nextScheduleSkeleton.map(d => `\n${d.label} (${d.id}):\n${d.exercises.map((ex,i) => `  ${i+1}. ${ex}`).join('\n')}`).join('')}

Return ONLY this JSON (no markdown):
{
  "schedule": [
    {
      "id": "day1",
      "label": "Upper Body Push",
      "warmup": [{"name": "string", "duration": "string"}],
      "exercises": [{"name": "EXACT name from list above", "sets": 3, "reps": "8-12", "rest": "90s", "weight": "22.5kg", "guide": "form cue"}],
      "cooldown": [{"name": "string", "duration": "string"}]
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      let nextWeekPlan = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      // Enforce the preselected schedule so AI can only fill in training details.
      nextWeekPlan.schedule = nextScheduleSkeleton.map((day, dayIndex) => {
        const generatedDay = nextWeekPlan.schedule?.[dayIndex] || {};
        const generatedExercises = Array.isArray(generatedDay.exercises) ? generatedDay.exercises : [];

        return {
          id: day.id,
          label: day.label,
          warmup: day.warmup,
          cooldown: day.cooldown,
          exercises: day.exercises.map((exerciseName, exerciseIndex) => {
            const generatedExercise = generatedExercises[exerciseIndex] || {};
            const fallbackWeight = lastWeekWeights[exerciseName] || 'Start: 10kg';

            return {
              name: exerciseName,
              sets: generatedExercise.sets ?? 3,
              reps: generatedExercise.reps || '8-12',
              rest: generatedExercise.rest || '90s',
              weight: generatedExercise.weight || fallbackWeight,
              guide: generatedExercise.guide || 'Focus on controlled reps and clean form.'
            };
          })
        };
      });

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

      {/* Daily Readiness Badge */}
      {sleepData !== null && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.05)', border: `1px solid ${readinessColor}` }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: readinessColor, boxShadow: `0 0 8px ${readinessColor}` }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: readinessColor }}>{readinessLabel}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{sleepData} hrs sleep last night</div>
          </div>
        </div>
      )}

      {/* Feature 2: Progress Rings / Activity Pills */}
      {(fitSteps != null || fitCalsBurned != null) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {fitSteps != null && (
            <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(232,168,56,0.12)', border: '1px solid rgba(232,168,56,0.3)', fontSize: '0.82rem', color: '#e8a838', fontWeight: 600 }}>
              👟 {fitSteps.toLocaleString()} steps
            </div>
          )}
          {fitCalsBurned != null && (
            <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(212,101,74,0.12)', border: '1px solid rgba(212,101,74,0.3)', fontSize: '0.82rem', color: '#d4654a', fontWeight: 600 }}>
              🔥 {fitCalsBurned.toLocaleString()} kcal burned
            </div>
          )}
        </div>
      )}

      {/* Feature 7: Inactivity Nudge */}
      {!nudgeDismissed && fitSteps != null && stepAvg7Day != null && new Date().getHours() >= 18 && fitSteps < stepAvg7Day * 0.6 && (
        <div style={{ marginBottom: '12px', padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#e8a838' }}>🚶 You're behind today — a 10-min walk would close the gap!</span>
          <button onClick={() => { setNudgeDismissed(true); sessionStorage.setItem('gfit_nudge_dismissed', '1'); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
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

      {/* Week Complete Check-in Modal — rendered via Portal to escape parent overflow/transform */}
      {showCheckin && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="section-card" style={{ width: '100%', maxWidth: '480px', borderRadius: 'var(--r-lg)', padding: '32px 24px', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
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
      , document.body)}
    </div>
  );
};

export default MyPlan;
