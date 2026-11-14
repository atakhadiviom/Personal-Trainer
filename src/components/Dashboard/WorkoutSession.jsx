import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Layout/Icon';
import { parseRestSeconds, formatTimer } from '../../utils/timer';
import { isNewPersonalRecord, formatKg } from '../../utils/progressiveOverload';
import {
  createSession,
  currentExerciseIndex,
  formatSessionDuration,
  getAutoRegulatedSet,
  getSetDefaults,
  isSessionComplete,
  logSessionSet,
  saveActiveSession,
  clearActiveSession,
  sessionDurationMs,
  sessionProgress,
  sessionTotals,
  skipExercise,
  undoLastSet,
  MAX_REPS,
  MAX_WEIGHT_KG
} from '../../utils/workoutSession';
import { RPE_MIN, RPE_MAX } from '../../utils/autoregulation';
import { describeLoadStep, getLoadStep, onLoadStepChange } from '../../utils/loadSteps';

const playCue = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* autoplay blocked — visual cue still shows */ }
  try {
    navigator.vibrate?.([160, 80, 160]);
  } catch { /* vibrate unsupported */ }
};

const WorkoutSession = ({ day, initialSession = null, setLog = {}, onLogSet, onClose, onComplete }) => {
  const [session, setSession] = useState(() => initialSession || createSession(day));
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [loadStep, setLoadStep] = useState(() => getLoadStep());
  const [restLeft, setRestLeft] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finishedEarly, setFinishedEarly] = useState(false);
  const firstFieldRef = useRef(null);
  const completedRef = useRef(false);
  const finishedRef = useRef(false);
  const wasRestingRef = useRef(false);

  const currentIndex = currentExerciseIndex(session);
  const exercise = currentIndex === -1 ? null : session.exercises[currentIndex];
  const progress = useMemo(() => sessionProgress(session), [session]);
  const totals = useMemo(() => sessionTotals(session), [session]);
  const defaults = useMemo(
    () => getSetDefaults(session, setLog, { step: loadStep }),
    [session, setLog, loadStep]
  );
  const autoPlan = useMemo(() => getAutoRegulatedSet(session, { step: loadStep }), [session, loadStep]);
  const resting = restLeft > 0;

  // Prefill the next set from the coach's target. Synced during render (the same
  // pattern MyPlan uses for its plan prop) so no cascading effect render is needed.
  const defaultsKey = `${currentIndex}|${exercise?.logged?.length ?? 0}|${defaults.weight}|${defaults.reps}`;
  const [appliedDefaultsKey, setAppliedDefaultsKey] = useState(null);
  if (appliedDefaultsKey !== defaultsKey) {
    setAppliedDefaultsKey(defaultsKey);
    setWeight(defaults.weight);
    setReps(defaults.reps);
    setRpe('');
  }

  // Persist after every change so a locked phone never loses a session.
  useEffect(() => {
    if (showSummary || finishedRef.current) return;
    saveActiveSession(session);
  }, [session, showSummary]);

  // A change in Profile (different gym, different plates) applies to the open session.
  useEffect(() => onLoadStepChange(setLoadStep), []);

  // Body scroll lock while the player is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Rest countdown tick.
  useEffect(() => {
    if (restLeft <= 0) return undefined;
    const id = setTimeout(() => setRestLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(id);
  }, [restLeft]);

  // Audio/haptic cue when the countdown reaches zero (external system only).
  useEffect(() => {
    if (restLeft > 0) {
      wasRestingRef.current = true;
      return;
    }
    if (wasRestingRef.current) {
      wasRestingRef.current = false;
      playCue();
    }
  }, [restLeft]);

  useEffect(() => {
    if (!showSummary) return undefined;
    firstFieldRef.current?.focus();
    return undefined;
  }, [showSummary]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !showSummary) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, showSummary]);

  const buildSummary = (early) => {
    const now = Date.now();
    return {
      dayId: session.dayId,
      label: session.label,
      startedAt: session.startedAt,
      durationMs: sessionDurationMs(session, { now }),
      ...sessionTotals(session),
      prs: prCount,
      complete: !early && isSessionComplete(session),
      progress: sessionProgress(session)
    };
  };

  const finish = (early = false) => {
    finishedRef.current = true;
    setFinishedEarly(early);
    clearActiveSession();
    setShowSummary(true);
    setRestLeft(0);
  };

  // The day is only marked complete once the athlete confirms the summary,
  // so undoing a set from the summary never leaves a half-finished day checked off.
  const handleDone = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.(buildSummary(finishedEarly));
    }
    onClose?.();
  };

  const handleClose = () => {
    if (showSummary) {
      handleDone();
      return;
    }
    onClose?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!exercise) return;
    const kg = Number(weight);
    const repCount = Number(reps);
    if (!Number.isFinite(kg) || kg < 0 || kg > MAX_WEIGHT_KG) return;
    if (!Number.isFinite(repCount) || repCount < 1 || repCount > MAX_REPS) return;

    const set = { weightKg: kg, reps: Math.floor(repCount), rpe: rpe === '' ? null : Number(rpe) };
    const next = logSessionSet(session, set);
    if (next === session) return;

    if (isNewPersonalRecord(setLog, { exercise: exercise.name, ...set })) {
      setPrCount(count => count + 1);
    }
    onLogSet?.(exercise.name, set.weightKg, set.reps);
    setSession(next);

    if (isSessionComplete(next)) {
      finish(false);
      return;
    }

    setRestLeft(parseRestSeconds(exercise.rest));
  };

  const handleSkip = () => {
    const next = skipExercise(session);
    setSession(next);
    setRestLeft(0);
    if (isSessionComplete(next)) finish(false);
  };

  const handleUndo = () => {
    const next = undoLastSet(session);
    if (next === session) return;
    setSession(next);
    setShowSummary(false);
    finishedRef.current = false;
    completedRef.current = false;
  };

  const restPct = resting && exercise
    ? Math.min(100, Math.max(0, ((parseRestSeconds(exercise.rest) - restLeft) / parseRestSeconds(exercise.rest)) * 100))
    : 0;

  return createPortal(
    <div className="ws-overlay" role="dialog" aria-modal="true" aria-label={`Guided workout: ${session.label}`}>
      <div className="ws-panel">
        <header className="ws-head">
          <div>
            <span className="ws-kicker">
              <Icon name="dumbbell" /> Guided session
            </span>
            <h2 className="ws-title">{session.label}</h2>
          </div>
          <button type="button" className="ws-close" onClick={handleClose} aria-label="Close guided session">
            ×
          </button>
        </header>

        <div
          className="ws-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label={`Session progress: ${progress.doneSets} of ${progress.totalSets} sets`}
          data-testid="ws-progress"
        >
          <div className="ws-progress-track">
            <div className="ws-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="ws-progress-meta">
            <span data-testid="ws-progress-label">
              {progress.doneSets} / {progress.totalSets} sets
            </span>
            <span>{formatSessionDuration(sessionDurationMs(session))} elapsed</span>
          </div>
        </div>

        {showSummary ? (
          <div className="ws-summary" data-testid="ws-summary">
            <div className="ws-summary-icon" aria-hidden="true">
              <Icon name={finishedEarly ? 'pause' : 'checkCircle'} />
            </div>
            <h3>{finishedEarly ? 'Partial session saved' : 'Session complete'}</h3>
            <p className="ws-summary-sub">
              {finishedEarly
                ? 'Your logged sets are saved. Pick the session back up whenever you are ready.'
                : 'Every planned set is in the books. Recover well and come back stronger.'}
            </p>

            <div className="ws-stats">
              <div className="ws-stat">
                <span className="ws-stat-value">{formatSessionDuration(sessionDurationMs(session))}</span>
                <span className="ws-stat-label">duration</span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat-value">{totals.sets}</span>
                <span className="ws-stat-label">sets</span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat-value">
                  {totals.volumeKg >= 1000 ? `${(totals.volumeKg / 1000).toFixed(1)}t` : `${totals.volumeKg} kg`}
                </span>
                <span className="ws-stat-label">tonnage</span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat-value">{progress.doneExercises}/{progress.totalExercises}</span>
                <span className="ws-stat-label">exercises</span>
              </div>
            </div>

            {prCount > 0 && (
              <div className="ws-pr-banner" data-testid="ws-pr-banner">
                <Icon name="flame" /> {prCount} new personal record{prCount === 1 ? '' : 's'} this session
              </div>
            )}

            <ul className="ws-summary-list">
              {session.exercises.map(ex => {
                const sets = ex.logged || [];
                const best = sets.reduce((acc, set) => {
                  if (!acc) return set;
                  return set.weightKg * set.reps > acc.weightKg * acc.reps ? set : acc;
                }, null);
                return (
                  <li key={ex.name}>
                    <span className="ws-summary-name">{ex.name}</span>
                    <span className="ws-summary-value">
                      {ex.skipped
                        ? 'skipped'
                        : sets.length
                          ? `${sets.length} × ${best ? `${formatKg(best.weightKg)} × ${best.reps}` : ''}`
                          : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="ws-actions">
              <button type="button" className="btn-primary ws-primary" onClick={handleDone} ref={firstFieldRef}>
                Done
              </button>
              {!finishedEarly && (
                <button
                  type="button"
                  className="ws-ghost"
                  onClick={() => {
                    completedRef.current = false;
                    handleUndo();
                  }}
                >
                  <Icon name="rotate" /> Undo last set
                </button>
              )}
            </div>
          </div>
        ) : !exercise ? (
          <div className="ws-summary">
            <h3>Nothing left to log</h3>
            <p className="ws-summary-sub">This day has no exercises. Close the session and pick another day.</p>
            <button type="button" className="btn-primary ws-primary" onClick={() => onClose?.()}>Close</button>
          </div>
        ) : (
          <div className="ws-body">
            <div className="ws-ex-head">
              <span className="ws-ex-index">
                Exercise {currentIndex + 1} of {session.exercises.length}
              </span>
              <h3 className="ws-ex-name" data-testid="ws-exercise-name">{exercise.name}</h3>
              <div className="ws-ex-meta">
                <span className="ws-chip"><Icon name="dumbbell" /> {exercise.targetSets} × {exercise.reps || '—'}</span>
                <span className="ws-chip"><Icon name="timer" /> rest {exercise.rest}</span>
                {exercise.weight && <span className="ws-chip">plan {exercise.weight}</span>}
                <span className="ws-chip ws-jump" data-testid="ws-jump" title="Smallest jump in your gym">
                  {describeLoadStep(loadStep)}
                </span>
              </div>
              {exercise.guide && <p className="ws-guide">{exercise.guide}</p>}
            </div>

            <div className="ws-set-dots" aria-hidden="true">
              {Array.from({ length: exercise.targetSets }).map((_, i) => {
                const done = i < (exercise.logged?.length || 0);
                const current = i === (exercise.logged?.length || 0);
                return (
                  <span
                    key={i}
                    className={`ws-set-dot ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
                    data-testid={done ? 'ws-set-dot-done' : 'ws-set-dot'}
                  />
                );
              })}
              <span className="ws-set-count">
                set {(exercise.logged?.length || 0) + 1} of {exercise.targetSets}
              </span>
            </div>

            {autoPlan && (
              <div className={`ws-auto is-${autoPlan.action}`} data-testid="ws-auto" role="status">
                <div className="ws-auto-head">
                  <Icon name="trending" />
                  <strong>Auto-regulated next set</strong>
                  <span className="ws-auto-target">
                    {autoPlan.weightKg > 0
                      ? `${formatKg(autoPlan.weightKg)} × ${autoPlan.reps}`
                      : `bodyweight × ${autoPlan.reps}`}
                  </span>
                </div>
                <p>{autoPlan.message}</p>
              </div>
            )}

            <form className="ws-form" onSubmit={handleSubmit}>
              <label className="ws-field">
                <span>kg</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={MAX_WEIGHT_KG}
                  step="0.5"
                  value={weight}
                  onChange={event => setWeight(event.target.value)}
                  aria-label={`Weight in kg for ${exercise.name}`}
                  placeholder="0"
                />
              </label>
              <label className="ws-field">
                <span>reps</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={MAX_REPS}
                  step="1"
                  value={reps}
                  onChange={event => setReps(event.target.value)}
                  aria-label={`Reps for ${exercise.name}`}
                  placeholder="0"
                />
              </label>
              <button type="submit" className="btn-primary ws-log-btn">
                <Icon name="check" /> Log set
              </button>
            </form>

            <div className="ws-rpe" role="group" aria-label="Effort for this set (RPE, optional)">
              <span className="ws-rpe-label">
                Effort <em>optional</em>
              </span>
              <div className="ws-rpe-chips">
                {Array.from({ length: RPE_MAX - RPE_MIN + 1 }).map((_, i) => {
                  const value = RPE_MIN + i;
                  const active = Number(rpe) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`ws-rpe-chip ${active ? 'is-active' : ''}`}
                      aria-pressed={active}
                      aria-label={`RPE ${value}`}
                      onClick={() => setRpe(active ? '' : String(value))}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <span className="ws-rpe-hint">{rpe ? 'RPE tunes the next set' : '10 = nothing left'}</span>
            </div>

            {resting && (
              <div className="ws-rest" data-testid="ws-rest">
                <div className="ws-rest-top">
                  <span className="ws-rest-label"><Icon name="timer" /> Rest</span>
                  <span className="ws-rest-time" role="timer" aria-live="polite" data-testid="ws-rest-time">
                    {formatTimer(restLeft)}
                  </span>
                  <div className="ws-rest-controls">
                    <button type="button" className="ws-ghost ws-mini" onClick={() => setRestLeft(prev => prev + 30)}>
                      +30s
                    </button>
                    <button type="button" className="ws-ghost ws-mini" onClick={() => setRestLeft(0)}>
                      Skip rest
                    </button>
                  </div>
                </div>
                <div className="ws-rest-track"><div className="ws-rest-fill" style={{ width: `${restPct}%` }} /></div>
              </div>
            )}

            <div className="ws-actions">
              <button type="button" className="ws-ghost" onClick={handleSkip}>
                Skip exercise
              </button>
              {(exercise.logged?.length || 0) > 0 && (
                <button type="button" className="ws-ghost" onClick={handleUndo}>
                  <Icon name="rotate" /> Undo set
                </button>
              )}
              <button type="button" className="ws-ghost ws-finish" onClick={() => finish(true)}>
                Finish early
              </button>
            </div>

            <p className="ws-foot">
              <Icon name="sparkles" /> Logged sets feed your PRs, streak, history and training-load advisor.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default WorkoutSession;
export { WorkoutSession };
