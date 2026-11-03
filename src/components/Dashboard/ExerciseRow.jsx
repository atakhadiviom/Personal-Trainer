import React, { memo, useState } from 'react';
import Icon from '../Layout/Icon';
import { getSafeYoutubeUrl } from '../../utils/url';
import { formatKg } from '../../utils/progressiveOverload';

const MAX_REPS = 100;
const MAX_WEIGHT = 500;

const ExerciseRow = memo(({
  ex,
  exIdx,
  dayIdx,
  dayId,
  isDone,
  isSwapping,
  toggleExercise,
  handleSwap,
  onStartTimer,
  lastSet,
  personalRecord,
  onLogSet
}) => {
  const [logging, setLogging] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const startLogging = () => {
    if (!logging && lastSet) {
      setWeight(String(lastSet.weightKg));
      setReps(String(lastSet.reps));
    }
    setLogging(v => !v);
  };

  const submitSet = (event) => {
    event.preventDefault();
    if (!onLogSet) return;
    const weightKg = Number(weight);
    const repCount = Number(reps);
    if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > MAX_WEIGHT) return;
    if (!Number.isFinite(repCount) || repCount < 1 || repCount > MAX_REPS) return;
    onLogSet(ex.name, weightKg, Math.floor(repCount));
    setLogging(false);
    setWeight('');
    setReps('');
  };

  return (
    <tr className={isDone ? 'exercise-done' : ''} style={{ opacity: isDone ? 0.5 : 1 }}>
      <td>
        <input
          id={`exercise-${dayIdx}-${exIdx}`}
          type="checkbox"
          className="exercise-checkbox"
          checked={!!isDone}
          onChange={() => toggleExercise(dayId, exIdx)}
          aria-label={`Mark ${ex.name} as complete`}
        />
      </td>
      <td className="ex-name">
        <label htmlFor={`exercise-${dayIdx}-${exIdx}`} style={{ cursor: 'pointer', display: 'block' }}>
          {ex.name}
        </label>
        {ex.guide && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>{ex.guide}</div>}
        <button
          onClick={() => handleSwap(dayIdx, exIdx, ex.name)}
          disabled={isSwapping}
          style={{ background: 'none', border: 'none', color: isSwapping ? 'var(--accent-cyan)' : 'var(--text-dim)', fontSize: '0.7rem', cursor: isSwapping ? 'wait' : 'pointer', display: 'block', marginTop: '4px', textDecoration: 'underline' }}>
           {isSwapping ? <><Icon name="loader" className="spin" /> Swapping...</> : <><Icon name="swap" /> Swap</>}
        </button>
      </td>
      <td className="ex-sets">{ex.sets} × {ex.reps}</td>
      <td className="ex-rest">
        {onStartTimer ? (
          <button
            type="button"
            className="btn-rest-chip"
            onClick={() => onStartTimer(ex.rest, ex.name)}
            title={`Start ${ex.rest} rest timer`}
            aria-label={`Start ${ex.rest} rest timer for ${ex.name}`}
          >
            <Icon name="timer" className="timer-icon" />
            <span>{ex.rest}</span>
          </button>
        ) : (
          ex.rest
        )}
      </td>
      <td className="ex-weight">
        <div className="ex-weight-value">
          {ex.weight}
          {personalRecord?.e1rm ? (
            <span className="pr-badge" title={`Best estimated 1RM: ${formatKg(personalRecord.e1rm)}`}>
              PR {formatKg(personalRecord.e1rm)}
            </span>
          ) : null}
        </div>
        {onLogSet && (
          <>
            <button
              type="button"
              className="log-set-toggle"
              aria-expanded={logging}
              aria-controls={`log-set-${dayIdx}-${exIdx}`}
              onClick={startLogging}
            >
              {logging ? 'Close' : 'Log set'}
            </button>
            {logging && (
              <form id={`log-set-${dayIdx}-${exIdx}`} className="log-set-form" onSubmit={submitSet}>
                <label className="log-set-field">
                  <span>kg</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={MAX_WEIGHT}
                    step="0.5"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    aria-label={`Weight in kg for ${ex.name}`}
                    placeholder="0"
                  />
                </label>
                <label className="log-set-field">
                  <span>reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={MAX_REPS}
                    step="1"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    aria-label={`Reps for ${ex.name}`}
                    placeholder="0"
                  />
                </label>
                <button type="submit" className="log-set-save">Save</button>
                {lastSet && (
                  <div className="log-set-last">
                    Last: {formatKg(lastSet.weightKg)} × {lastSet.reps}
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </td>
      <td>
        <a href={getSafeYoutubeUrl(ex.name)} target="_blank" rel="noreferrer" className="btn-yt"><Icon name="play" /> Watch</a>
      </td>
    </tr>
  );
});

export default ExerciseRow;
// Named export for testing
export { ExerciseRow };
