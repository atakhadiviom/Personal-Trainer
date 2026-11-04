import React, { useMemo, useState } from 'react';
import Icon from '../Layout/Icon';
import {
  getSessions,
  getWeeklyTrend,
  getHeatmap,
  getExerciseBreakdown,
  getAnalyticsSummary,
  toSessionCsv,
  formatShortDate
} from '../../utils/workoutHistory';

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const formatVolume = (kg) => (kg >= 10000
  ? `${(kg / 1000).toFixed(1)}t`
  : `${kg.toLocaleString()} kg`);

const TrendBadge = ({ pct }) => {
  if (pct === null || pct === undefined) return null;
  const flat = Math.abs(pct) < 5;
  const up = pct > 0;
  const cls = flat ? 'flat' : up ? 'up' : 'down';
  const label = flat ? 'Holding steady' : up ? `+${pct}% volume` : `${pct}% volume`;
  return (
    <span className={`wh-trend ${cls}`} data-testid="wh-trend">
      {flat ? '→' : up ? '↑' : '↓'} {label}
    </span>
  );
};

const WorkoutHistoryCard = ({ setLog = {}, today, onExport }) => {
  const now = useMemo(() => today || new Date(), [today]);
  const [tab, setTab] = useState('volume');

  const summary = useMemo(() => getAnalyticsSummary(setLog, { today: now }), [setLog, now]);
  const trend = useMemo(() => getWeeklyTrend(setLog, { today: now }), [setLog, now]);
  const heatmap = useMemo(() => getHeatmap(setLog, { today: now }), [setLog, now]);
  const breakdown = useMemo(() => getExerciseBreakdown(setLog, { today: now }), [setLog, now]);
  const recent = useMemo(() => getSessions(setLog).slice(-3).reverse(), [setLog]);

  const hasData = summary.totalSessions > 0;
  const maxWeekVolume = trend.reduce((max, week) => Math.max(max, week.volumeKg), 0);

  const handleExport = () => {
    const csv = toSessionCsv(setLog);
    if (onExport) {
      onExport(csv);
      return;
    }
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novafit-history-${new Date(now).toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="wh-card" aria-label="Workout history and analytics" data-testid="workout-history-card">
      <div className="wh-header">
        <div className="wh-title-wrap">
          <span className="wh-icon" aria-hidden="true"><Icon name="chart" /></span>
          <div>
            <h3 className="wh-title">Training History</h3>
            <p className="wh-subtitle">Every logged set becomes tonnage, trends and session history.</p>
          </div>
        </div>
        <div className="wh-stats">
          <div className="wh-stat">
            <span className="wh-stat-value" data-testid="wh-total-sessions">{summary.totalSessions}</span>
            <span className="wh-stat-label">sessions</span>
          </div>
          <div className="wh-stat">
            <span className="wh-stat-value" data-testid="wh-total-volume">
              {hasData ? formatVolume(summary.totalVolumeKg) : '—'}
            </span>
            <span className="wh-stat-label">total tonnage</span>
          </div>
          <div className="wh-stat">
            <span className="wh-stat-value" data-testid="wh-avg-session">
              {hasData ? formatVolume(summary.avgSessionVolumeKg) : '—'}
            </span>
            <span className="wh-stat-label">avg session</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="wh-empty" data-testid="wh-empty">
          Log your first set with <strong>Log set</strong> on any exercise. Your 8-week tonnage
          trend, training calendar and per-exercise breakdown appear here.
        </p>
      ) : (
        <>
          <div className="wh-toolbar">
            <div className="wh-tabs" role="tablist" aria-label="History view">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'volume'}
                className={`wh-tab ${tab === 'volume' ? 'active' : ''}`}
                onClick={() => setTab('volume')}
              >
                Volume
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'exercises'}
                className={`wh-tab ${tab === 'exercises' ? 'active' : ''}`}
                onClick={() => setTab('exercises')}
              >
                Exercises
              </button>
            </div>
            <button type="button" className="wh-export" onClick={handleExport} data-testid="wh-export">
              <Icon name="share" /> Export CSV
            </button>
          </div>

          {tab === 'volume' && (
            <div className="wh-panel" role="tabpanel" aria-label="Weekly volume">
              <div className="wh-week-summary">
                <div>
                  <span className="wh-block-title">This week</span>
                  <div className="wh-week-value" data-testid="wh-this-week">
                    {formatVolume(summary.volumeThisWeekKg)}
                    <span className="wh-week-sessions">
                      {summary.sessionsThisWeek} {summary.sessionsThisWeek === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </div>
                <TrendBadge pct={summary.volumeTrendPct} />
              </div>

              <div
                className="wh-chart"
                role="img"
                aria-label="Weekly tonnage over the last 8 weeks"
                data-testid="wh-chart"
              >
                {trend.map(week => {
                  const height = maxWeekVolume > 0 ? Math.max(4, Math.round((week.volumeKg / maxWeekVolume) * 100)) : 4;
                  return (
                    <div
                      key={week.weekStart}
                      className={`wh-bar-col ${week.isCurrent ? 'current' : ''}`}
                      title={`Week of ${week.label}: ${week.volumeKg.toLocaleString()} kg`}
                    >
                      <div className="wh-bar-track">
                        <div className="wh-bar" style={{ height: `${height}%` }} />
                      </div>
                      <span className="wh-bar-label">{week.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="wh-best">
                <Icon name="trending" />
                <span data-testid="wh-best-week">
                  {summary.bestWeekLabel
                    ? `Best week: ${summary.bestWeekLabel} · ${summary.bestWeekVolumeKg.toLocaleString()} kg`
                    : 'Best week arrives after your first full week.'}
                </span>
              </div>

              <div className="wh-heatmap-wrap">
                <h4 className="wh-block-title">Training calendar · last {heatmap.weeks} weeks</h4>
                <div className="wh-heatmap-body">
                  <div className="wh-heatmap-days" aria-hidden="true">
                    {DAY_INITIALS.map((initial, i) => (
                      <span key={`${initial}-${i}`} className="wh-heatmap-day-label">{initial}</span>
                    ))}
                  </div>
                  <div className="wh-heatmap" data-testid="wh-heatmap">
                    {heatmap.columns.map(column => (
                      <div key={column[0].key} className="wh-heatmap-week">
                        {column.map(day => (
                          <span
                            key={day.key}
                            className={`wh-cell level-${day.level} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`.trim()}
                            aria-label={`${formatShortDate(day.key)}: ${day.sets ? `${day.sets} ${day.sets === 1 ? 'set' : 'sets'}, ${day.volumeKg} kg` : 'rest day'}`}
                            title={`${formatShortDate(day.key)} · ${day.sets ? `${day.sets} sets · ${day.volumeKg.toLocaleString()} kg` : 'rest'}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="wh-heatmap-legend" aria-hidden="true">
                  Less
                  {[0, 1, 2, 3, 4].map(level => <span key={level} className={`wh-cell level-${level}`} />)}
                  More
                </p>
              </div>

              <div className="wh-recent">
                <h4 className="wh-block-title">Recent sessions</h4>
                <ul className="wh-list" data-testid="wh-recent">
                  {recent.map(session => (
                    <li key={session.date} className="wh-recent-item">
                      <span className="wh-date">{formatShortDate(session.date)}</span>
                      <div className="wh-recent-main">
                        <div className="wh-recent-top">
                          {session.topSet ? session.topSet.exercise : 'Session'}
                        </div>
                        <div className="wh-recent-detail">
                          {session.totalSets} sets · {session.exerciseCount} exercises
                          {session.topSet ? ` · top ${session.topSet.weightKg} kg × ${session.topSet.reps}` : ''}
                        </div>
                      </div>
                      <span className="wh-recent-volume">{formatVolume(session.volumeKg)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'exercises' && (
            <div className="wh-panel" role="tabpanel" aria-label="Exercise breakdown">
              <ul className="wh-list" data-testid="wh-breakdown">
                {breakdown.map(item => (
                  <li key={item.key} className="wh-exercise-item">
                    <div className="wh-exercise-main">
                      <div className="wh-exercise-name">{item.exercise}</div>
                      <div className="wh-exercise-detail">
                        {item.sets} sets · {item.sessions} {item.sessions === 1 ? 'session' : 'sessions'}
                        {item.bestE1rm ? ` · best est. 1RM ${item.bestE1rm} kg` : ''}
                        {item.daysSince === null
                          ? ''
                          : item.daysSince === 0
                            ? ' · today'
                            : ` · ${item.daysSince}d ago`}
                      </div>
                    </div>
                    <div className="wh-exercise-side">
                      <span className="wh-exercise-volume">{formatVolume(item.volumeKg)}</span>
                      <TrendBadge pct={item.trendPct} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="wh-footnote">
                Trend compares the last 14 days of tonnage with the 14 days before it.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default WorkoutHistoryCard;
export { WorkoutHistoryCard };
