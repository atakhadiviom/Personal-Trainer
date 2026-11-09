import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../Layout/Icon';
import { auth, db } from '../../firebase';
import { loadBodyLog } from '../../utils/bodyProgress';
import { loadNutritionWeek } from '../../utils/nutritionWeek';
import { getWeeklyScorecard, formatWindowLabel, WINDOW_DAYS } from '../../utils/weeklyScorecard';

const RING_RADIUS = 42;
const RING_CIRCUM = 2 * Math.PI * RING_RADIUS;

const statusTone = (tone) => {
  if (tone === 'good' || tone === 'complete') return 'good';
  if (tone === 'warn' || tone === 'behind') return 'warn';
  if (tone === 'bad' || tone === 'no-data') return 'muted';
  return 'ok';
};

const ScoreRing = ({ score, grade }) => {
  const value = Number.isFinite(score) ? score : 0;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * RING_CIRCUM;
  return (
    <div
      className="asc-ring"
      role="img"
      aria-label={Number.isFinite(score) ? `Weekly adherence score ${score} out of 100, grade ${grade}` : 'Weekly adherence score unavailable'}
      data-testid="asc-ring"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="asc-ring-track" cx="50" cy="50" r={RING_RADIUS} />
        <circle
          className="asc-ring-value"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={`${dash} ${RING_CIRCUM}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="asc-ring-center">
        <span className="asc-score" data-testid="asc-score">{Number.isFinite(score) ? score : '—'}</span>
        <span className="asc-grade" data-testid="asc-grade">{grade}</span>
      </div>
    </div>
  );
};

const MetricBar = ({ label, value, score, detail, tone, testId }) => (
  <div className="asc-metric" data-testid={testId}>
    <div className="asc-metric-head">
      <span className="asc-metric-label">{label}</span>
      <span className={`asc-metric-value ${tone}`}>{value}</span>
    </div>
    <div
      className="asc-bar"
      role="meter"
      aria-label={`${label} adherence`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score === null ? undefined : score}
      aria-valuetext={score === null ? 'Not enough data' : `${score}%`}
    >
      <span className={`asc-bar-fill ${tone}`} style={{ width: `${score === null ? 0 : Math.min(100, score)}%` }} />
    </div>
    <p className="asc-metric-detail">{detail}</p>
  </div>
);

const AdherenceCard = ({
  activityLog = {},
  bodyLog,
  nutritionDays,
  daysPerWeek,
  goal = 'fatloss',
  targetCals = null,
  proteinTarget = null,
  today
}) => {
  const now = useMemo(() => today || new Date(), [today]);
  const [fetchedNutrition, setFetchedNutrition] = useState(undefined);
  const [loading, setLoading] = useState(nutritionDays === undefined);

  useEffect(() => {
    if (nutritionDays !== undefined) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const days = await loadNutritionWeek({ db, user: auth?.currentUser, today: now });
        if (!cancelled) setFetchedNutrition(days);
      } catch (err) {
        console.warn('Could not load nutrition week:', err);
        if (!cancelled) setFetchedNutrition([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [nutritionDays, now]);

  const resolvedNutrition = useMemo(
    () => (nutritionDays !== undefined ? nutritionDays : (fetchedNutrition || [])),
    [nutritionDays, fetchedNutrition]
  );
  const resolvedBody = useMemo(
    () => (bodyLog !== undefined ? bodyLog : loadBodyLog()),
    [bodyLog]
  );

  const card = useMemo(
    () => getWeeklyScorecard({
      activityLog,
      nutritionDays: resolvedNutrition,
      bodyLog: resolvedBody,
      daysPerWeek,
      goal,
      targetCals: targetCals ?? undefined,
      proteinTarget: proteinTarget ?? undefined,
      today: now
    }),
    [activityLog, resolvedNutrition, resolvedBody, daysPerWeek, goal, targetCals, proteinTarget, now]
  );

  const { training, nutrition, body, focus, highlights } = card;
  const windowLabel = formatWindowLabel(card.window.start, card.window.end);
  const nutritionDetail = nutrition.avgCals === null
    ? (loading ? 'Loading your meal log…' : 'Log meals in the Calories tab to unlock this score.')
    : `${nutrition.avgCals.toLocaleString()} kcal avg${nutrition.proteinHitDays !== null ? ` · protein target on ${nutrition.proteinHitDays}/${nutrition.loggedDays} days` : ''}`;
  const trainingDetail = training.sessions === 0
    ? 'Check off exercises or log sets to record a session.'
    : `${training.sessions} of ${training.planned} planned days · streak-safe rest days already allowed`;

  return (
    <section className={`asc-card tone-${card.tone}`} aria-label="Weekly adherence scorecard" data-testid="adherence-card">
      <div className="asc-header">
        <div className="asc-title-wrap">
          <span className="asc-icon" aria-hidden="true"><Icon name="chart" /></span>
          <div>
            <h3 className="asc-title">Weekly Scorecard</h3>
            <p className="asc-subtitle">
              Training, nutrition and body trend for {windowLabel} — one number for whether the plan is being executed.
            </p>
          </div>
        </div>
        <span className={`asc-band ${card.tone}`} data-testid="asc-band">{card.gradeLabel}</span>
      </div>

      <div className="asc-top">
        <ScoreRing score={card.score} grade={card.grade} />
        <div className="asc-metrics">
          <MetricBar
            label="Training"
            value={`${training.sessions}/${training.planned} sessions`}
            score={training.sessions === 0 ? 0 : training.score}
            detail={trainingDetail}
            tone={statusTone(training.status)}
            testId="asc-training"
          />
          <MetricBar
            label="Nutrition"
            value={nutrition.score === null ? 'no data' : `${nutrition.loggedDays}/7 days`}
            score={nutrition.score}
            detail={nutritionDetail}
            tone={statusTone(nutrition.status)}
            testId="asc-nutrition"
          />
        </div>
      </div>

      <div className={`asc-body ${body ? statusTone(body.tone) : 'muted'}`} data-testid="asc-body">
        <span className="asc-body-icon" aria-hidden="true"><Icon name="trending" /></span>
        <div>
          <strong>{body ? body.title : 'Body trend locked'}</strong>
          <p>
            {body
              ? body.message
              : 'Log your weight twice in the Body Progress card and the trend joins this score.'}
          </p>
        </div>
        {body && (
          <span className={`asc-body-delta ${statusTone(body.tone)}`} data-testid="asc-body-delta">
            {body.delta > 0 ? '+' : ''}{body.delta} kg
          </span>
        )}
      </div>

      <div className={`asc-focus ${card.tone}`} data-testid="asc-focus" data-dimension={focus.dimension}>
        <div className="asc-focus-head">
          <span className="asc-focus-tag">Next week's one thing</span>
          <strong>{focus.title}</strong>
        </div>
        <p className="asc-focus-message">{focus.message}</p>
        <p className="asc-focus-action"><Icon name="arrowRight" /> {focus.action}</p>
      </div>

      <div className="asc-highlights" data-testid="asc-highlights">
        {highlights.map(item => (
          <span key={item.label} className={`asc-chip ${statusTone(item.tone)}`}>
            <span className="asc-chip-label">{item.label}</span> {item.value}
          </span>
        ))}
      </div>

      <p className="asc-footnote">
        Score = 60% training adherence + 40% nutrition (logging coverage, calorie accuracy, protein).
        Body trend is coaching context, not scored. Window is the last {WINDOW_DAYS} days;{' '}
        {nutrition.loggedDays === 0 && !loading ? 'no meal log found for this week.' : 'meals come from the Calories tab.'}
      </p>
    </section>
  );
};

export default AdherenceCard;
