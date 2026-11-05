import React, { useMemo } from 'react';
import Icon from '../Layout/Icon';
import {
  getTrainingLoadCoach,
  getZoneLabel,
  SWEET_SPOT_MIN,
  SWEET_SPOT_MAX,
  HIGH_RISK_RATIO
} from '../../utils/trainingLoad';

const SCALE_MIN = 0.4;
const SCALE_MAX = 1.8;

const formatVolume = (kg) => (kg >= 10000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg).toLocaleString()} kg`);

const statusIcon = (status) => {
  if (status === 'deload') return 'alert';
  if (status === 'rest') return 'moon';
  if (status === 'caution') return 'zap';
  if (status === 'build') return 'trending';
  return 'lightbulb';
};

const TrainingLoadCard = ({ setLog = {}, today, sleepHours = null }) => {
  const now = useMemo(() => today || new Date(), [today]);
  const coach = useMemo(
    () => getTrainingLoadCoach(setLog, { today: now, sleepHours }),
    [setLog, now, sleepHours]
  );

  const { ratio, advice, zone } = coach;
  const hasRatio = ratio !== null && Number.isFinite(ratio);
  const markerPos = hasRatio
    ? ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, ratio)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100
    : null;

  const compareMax = Math.max(coach.acuteKg, coach.chronicKg, 1);
  const acuteWidth = Math.round((coach.acuteKg / compareMax) * 100);
  const chronicWidth = Math.round((coach.chronicKg / compareMax) * 100);
  const rampLabel = coach.rampPct === null ? '—' : `${coach.rampPct > 0 ? '+' : ''}${coach.rampPct}%`;
  const rampClass = coach.rampPct === null ? 'flat' : coach.rampPct > 30 ? 'down' : coach.rampPct < -10 ? 'flat' : 'up';

  return (
    <section className="tl-card" aria-label="Training load and recovery advice" data-testid="training-load-card">
      <div className="tl-header">
        <div className="tl-title-wrap">
          <span className="tl-icon" aria-hidden="true"><Icon name="zap" /></span>
          <div>
            <h3 className="tl-title">Load &amp; Recovery</h3>
            <p className="tl-subtitle">Acute:chronic workload ratio from your logged sets — the early-warning system for overtraining.</p>
          </div>
        </div>
        <div className="tl-ratio-block">
          <span className="tl-ratio" data-testid="tl-ratio">{hasRatio ? ratio.toFixed(2) : '—'}</span>
          <span className={`tl-zone ${zone}`} data-testid="tl-zone">{getZoneLabel(zone)}</span>
        </div>
      </div>

      <div className="tl-gauge-wrap">
        <div
          className="tl-gauge"
          role="meter"
          aria-label="Acute to chronic workload ratio"
          aria-valuemin={SCALE_MIN}
          aria-valuemax={SCALE_MAX}
          aria-valuenow={hasRatio ? Math.min(SCALE_MAX, ratio) : undefined}
          aria-valuetext={hasRatio ? `${ratio} — ${getZoneLabel(zone)}` : 'Not enough data yet'}
          data-testid="tl-gauge"
        >
          <span className="tl-gauge-seg detraining" style={{ width: `${((SWEET_SPOT_MIN - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%` }} />
          <span className="tl-gauge-seg sweet" style={{ width: `${((SWEET_SPOT_MAX - SWEET_SPOT_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%` }} />
          <span className="tl-gauge-seg caution" style={{ width: `${((HIGH_RISK_RATIO - SWEET_SPOT_MAX) / (SCALE_MAX - SCALE_MIN)) * 100}%` }} />
          <span className="tl-gauge-seg high" style={{ width: `${((SCALE_MAX - HIGH_RISK_RATIO) / (SCALE_MAX - SCALE_MIN)) * 100}%` }} />
          {markerPos !== null && (
            <span
              className="tl-gauge-marker"
              style={{ left: `${markerPos}%` }}
              data-testid="tl-marker"
            />
          )}
        </div>
        <div className="tl-gauge-labels" aria-hidden="true">
          <span>{SWEET_SPOT_MIN}</span>
          <span className="tl-gauge-sweet-label">sweet spot</span>
          <span>{SWEET_SPOT_MAX}</span>
          <span>{HIGH_RISK_RATIO}+</span>
        </div>
      </div>

      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-value" data-testid="tl-acute">{formatVolume(coach.acuteKg)}</span>
          <span className="tl-stat-label">7-day load</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-value" data-testid="tl-chronic">{formatVolume(coach.chronicKg)}</span>
          <span className="tl-stat-label">4-week weekly avg</span>
        </div>
        <div className="tl-stat">
          <span className={`tl-stat-value tl-ramp ${rampClass}`} data-testid="tl-ramp">{rampLabel}</span>
          <span className="tl-stat-label">week over week</span>
        </div>
      </div>

      <div className="tl-compare" aria-hidden="true">
        <div className="tl-compare-row">
          <span className="tl-compare-label">This week</span>
          <div className="tl-compare-track">
            <div className="tl-compare-bar acute" style={{ width: `${acuteWidth}%` }} />
          </div>
          <span className="tl-compare-value">{formatVolume(coach.acuteKg)}</span>
        </div>
        <div className="tl-compare-row">
          <span className="tl-compare-label">Baseline</span>
          <div className="tl-compare-track">
            <div className="tl-compare-bar chronic" style={{ width: `${chronicWidth}%` }} />
          </div>
          <span className="tl-compare-value">{formatVolume(coach.chronicKg)}</span>
        </div>
      </div>

      <div className={`tl-advice ${advice.tone}`} data-status={advice.status} data-testid="tl-advice">
        <div className="tl-advice-head">
          <span className="tl-advice-icon" aria-hidden="true"><Icon name={statusIcon(advice.status)} /></span>
          <strong>{advice.title}</strong>
        </div>
        <p className="tl-advice-message">{advice.message}</p>
        <ul className="tl-tips" data-testid="tl-tips">
          {advice.tips.map(tip => <li key={tip}>{tip}</li>)}
        </ul>
      </div>

      <div className="tl-foot">
        <span><Icon name="calendar" /> {coach.trainingDays}/7 training days</span>
        <span><Icon name="moon" /> {coach.restDays} rest {coach.restDays === 1 ? 'day' : 'days'}</span>
        {coach.monotony !== null && (
          <span title="Training monotony: high values mean every day looks the same">
            <Icon name="chart" /> monotony {coach.monotony}
          </span>
        )}
      </div>

      <p className="tl-footnote">
        Ratio compares the last 7 days of tonnage with your 4-week weekly average. Under 0.8 detrains,
        0.8–1.3 is the sweet spot, above 1.5 is overreaching.
      </p>
    </section>
  );
};

export default TrainingLoadCard;
export { TrainingLoadCard };
