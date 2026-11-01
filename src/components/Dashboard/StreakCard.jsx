import React, { useState } from 'react';
import Icon from '../Layout/Icon';
import {
  computeStreak,
  getWeekStrip,
  getRecoveryAdvice,
  getNextMilestone,
  getMilestoneHit
} from '../../utils/streaks';

const STATUS_ICON = {
  start: 'sparkles',
  rest: 'moon',
  recover: 'heart',
  comeback: 'rotate',
  train: 'zap'
};

const StreakCard = ({ activityLog = {}, sleepHours = null, today }) => {
  const [showTips, setShowTips] = useState(false);
  const now = today || new Date();
  const streak = computeStreak(activityLog, now);
  const strip = getWeekStrip(activityLog, now);
  const advice = getRecoveryAdvice(activityLog, { today: now, sleepHours });
  const nextMilestone = getNextMilestone(streak.current);
  const milestoneHit = streak.trainedToday ? getMilestoneHit(streak.current) : null;
  const weekCount = strip.filter(d => d.trained).length;

  return (
    <section className="streak-card" aria-label="Workout consistency streak" data-testid="streak-card">
      <div className="streak-header">
        <div className={`streak-flame ${streak.current > 0 ? 'lit' : ''}`} aria-hidden="true">
          <Icon name="flame" />
        </div>
        <div className="streak-summary">
          <div className="streak-count" data-testid="streak-current">
            {streak.current} <span>workout streak</span>
          </div>
          <div className="streak-meta">
            Best {streak.longest} · {weekCount}/7 days this week
            {nextMilestone && streak.current > 0 && <> · {nextMilestone - streak.current} to {nextMilestone}</>}
          </div>
        </div>
        {milestoneHit && (
          <div className="streak-milestone" role="status" data-testid="streak-milestone">
            <Icon name="sparkles" /> {milestoneHit} streak!
          </div>
        )}
      </div>

      <ol className="streak-strip" aria-label="Last 7 days">
        {strip.map(day => (
          <li
            key={day.key}
            className={`streak-day ${day.trained ? 'trained' : 'rest'} ${day.isToday ? 'today' : ''}`.trim()}
            aria-label={`${day.key}: ${day.trained ? 'workout' : 'rest day'}${day.isToday ? ' (today)' : ''}`}
          >
            <span className="streak-dot">{day.trained ? <Icon name="check" /> : null}</span>
            <span className="streak-initial">{day.initial}</span>
          </li>
        ))}
      </ol>

      <div className={`recovery-advice status-${advice.status}`} data-testid="recovery-advice">
        <div className="recovery-advice-head">
          <Icon name={STATUS_ICON[advice.status] || 'lightbulb'} />
          <div>
            <div className="recovery-advice-title">{advice.title}</div>
            <p className="recovery-advice-message">{advice.message}</p>
          </div>
        </div>
        <button
          type="button"
          className="recovery-tips-toggle"
          aria-expanded={showTips}
          aria-controls="recovery-tips-list"
          onClick={() => setShowTips(v => !v)}
        >
          {showTips ? 'Hide recovery tips' : 'Show recovery tips'}
        </button>
        {showTips && (
          <ul id="recovery-tips-list" className="recovery-tips">
            {advice.tips.map(tip => <li key={tip}>{tip}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
};

export default StreakCard;
