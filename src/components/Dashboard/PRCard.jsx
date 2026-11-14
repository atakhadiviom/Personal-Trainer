import React, { useEffect, useState } from 'react';
import Icon from '../Layout/Icon';
import {
  getPersonalRecords,
  getRecentPersonalRecords,
  getNextLoadSuggestion,
  getWeeklyVolume,
  uniqueExercises,
  normalizeExerciseKey,
  formatKg
} from '../../utils/progressiveOverload';
import { getLoadStep, onLoadStepChange } from '../../utils/loadSteps';

const ACTION_LABEL = {
  start: 'Start',
  increase: 'Load up',
  hold: 'Repeat',
  reduce: 'Dial back',
  deload: 'Deload',
  bodyweight: 'Bodyweight'
};

const PRCard = ({ setLog = {}, exercises = [], today }) => {
  const now = today || new Date();
  const [showAll, setShowAll] = useState(false);
  const [loadStep, setLoadStep] = useState(() => getLoadStep());

  useEffect(() => onLoadStepChange(setLoadStep), []);
  const volume = getWeeklyVolume(setLog, { today: now });
  const totalPRs = getPersonalRecords(setLog).length;
  const recentPRs = getRecentPersonalRecords(setLog, { today: now, limit: 3 });

  const targets = uniqueExercises(exercises)
    .map(ex => ({ ex, suggestion: getNextLoadSuggestion(setLog, ex, { step: loadStep }) }))
    .filter(item => item.suggestion.weightKg !== null || item.suggestion.action !== 'start')
    .slice(0, showAll ? 12 : 4);

  const hasData = volume.sets > 0 || totalPRs > 0;

  return (
    <section className="pr-card" aria-label="Strength records and progressive overload" data-testid="pr-card">
      <div className="pr-header">
        <div className="pr-title-wrap">
          <span className="pr-icon" aria-hidden="true"><Icon name="trending" /></span>
          <div>
            <h3 className="pr-title">Strength &amp; Overload</h3>
            <p className="pr-subtitle">Log a set to track PRs and next-session loads.</p>
          </div>
        </div>
        <div className="pr-stats">
          <div className="pr-stat">
            <span className="pr-stat-value" data-testid="weekly-volume">
              {volume.volumeKg > 0 ? `${volume.volumeKg.toLocaleString()} kg` : '—'}
            </span>
            <span className="pr-stat-label">7-day volume</span>
          </div>
          <div className="pr-stat">
            <span className="pr-stat-value" data-testid="weekly-sets">{volume.sets}</span>
            <span className="pr-stat-label">sets logged</span>
          </div>
          <div className="pr-stat">
            <span className="pr-stat-value" data-testid="pr-count">{totalPRs}</span>
            <span className="pr-stat-label">exercises tracked</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="pr-empty" data-testid="pr-empty">
          Tap <strong>Log set</strong> on any exercise to record weight and reps. NovaFit then suggests when to add load, hold, or deload.
        </p>
      ) : (
        <div className="pr-body">
          {recentPRs.length > 0 && (
            <div className="pr-block">
              <h4 className="pr-block-title">Recent PRs</h4>
              <ul className="pr-list" data-testid="pr-list">
                {recentPRs.map(pr => (
                  <li key={pr.key} className="pr-item">
                    <span className="pr-medal" aria-hidden="true"><Icon name="sparkles" /></span>
                    <div className="pr-item-main">
                      <div className="pr-item-name">{pr.exercise}</div>
                      <div className="pr-item-detail">
                        {formatKg(pr.record.weightKg)} × {pr.record.reps}
                        {pr.record.e1rm ? ` · est. 1RM ${formatKg(pr.record.e1rm)}` : ''} · {pr.sessions} {pr.sessions === 1 ? 'session' : 'sessions'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {targets.length > 0 && (
            <div className="pr-block">
              <h4 className="pr-block-title">Next session targets</h4>
              <ul className="pr-list" data-testid="overload-list">
                {targets.map(({ ex, suggestion }) => (
                  <li key={normalizeExerciseKey(ex.name)} className={`pr-target action-${suggestion.action}`}>
                    <div className="pr-item-main">
                      <div className="pr-item-name">{ex.name}</div>
                      <div className="pr-item-detail">{suggestion.message}</div>
                    </div>
                    <span className="pr-action">{ACTION_LABEL[suggestion.action] || suggestion.action}</span>
                  </li>
                ))}
              </ul>
              {uniqueExercises(exercises).length > 4 && (
                <button
                  type="button"
                  className="pr-toggle"
                  aria-expanded={showAll}
                  onClick={() => setShowAll(v => !v)}
                >
                  {showAll ? 'Show fewer targets' : 'Show all targets'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PRCard;
export { PRCard };
