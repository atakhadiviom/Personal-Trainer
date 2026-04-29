import React from 'react';
import { getSafeYoutubeUrl } from '../../utils/url';

const ExerciseRow = ({
  ex,
  exIdx,
  dayIdx,
  dayId,
  isDone,
  isSwapping,
  toggleExercise,
  handleSwap
}) => {
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
           {isSwapping ? '⏳ Swapping...' : '🔄 Swap'}
        </button>
      </td>
      <td className="ex-sets">{ex.sets} × {ex.reps}</td>
      <td className="ex-rest">{ex.rest}</td>
      <td className="ex-weight">{ex.weight}</td>
      <td>
        <a href={getSafeYoutubeUrl(ex.name)} target="_blank" rel="noreferrer" className="btn-yt">▶ Watch</a>
      </td>
    </tr>
  );
};

export default ExerciseRow;
