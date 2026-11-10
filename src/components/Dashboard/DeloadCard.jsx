import React, { useMemo } from 'react';
import Icon from '../Layout/Icon';
import {
  detectDeloadNeed,
  buildDeloadSchedule,
  formatRatioPct,
  DELOAD_LOAD_RATIO,
  MIN_LOAD_RATIO,
  MAX_LOAD_RATIO
} from '../../utils/deloadWeek';
import { formatKg } from '../../utils/progressiveOverload';

const PREVIEW_LIMIT = 6;

const toneFor = (detection, applied) => {
  if (applied) return 'applied';
  if (detection.needed) return 'warn';
  if (detection.status === 'progressing') return 'good';
  return 'muted';
};

const smallDelta = (item) => `${item.deltaKg > 0 ? '+' : ''}${item.deltaKg} kg`;

const weightLabel = (change) => {
  if (change.toKg === 0 && change.fromKg === 0) return 'Bodyweight · fewer sets';
  if (change.toKg === null) return 'Bodyweight / easy effort';
  if (change.fromKg !== null && change.toKg !== null) {
    return `${formatKg(change.fromKg)} → ${formatKg(change.toKg)}`;
  }
  return change.weight;
};

const DeloadCard = ({ setLog = {}, schedule = null, week = 1, today, applied = null, onApply, onRevert }) => {
  const now = useMemo(() => today || new Date(), [today]);
  const detection = useMemo(() => detectDeloadNeed(setLog, { today: now }), [setLog, now]);

  const preview = useMemo(
    () => (detection.needed && Array.isArray(schedule) && schedule.length
      ? buildDeloadSchedule(schedule, setLog, { ratio: DELOAD_LOAD_RATIO })
      : null),
    [detection.needed, schedule, setLog]
  );

  const tone = toneFor(detection, applied);
  const hasSchedule = Array.isArray(schedule) && schedule.length > 0;
  const rows = preview ? preview.changes.slice(0, PREVIEW_LIMIT) : [];
  const hiddenRows = preview ? Math.max(0, preview.changes.length - rows.length) : 0;
  const appliedRatio = applied?.ratio ?? DELOAD_LOAD_RATIO;

  return (
    <section className={`dl-card tone-${tone}`} aria-label="Auto-regulated deload week" data-testid="deload-card">
      <div className="dl-header">
        <div className="dl-title-wrap">
          <span className="dl-icon" aria-hidden="true"><Icon name="rotate" /></span>
          <div>
            <h3 className="dl-title">Auto-Regulated Deload</h3>
            <p className="dl-subtitle">
              Compares your best estimated 1RM per lift across the last two complete weeks, then rewrites the loads.
            </p>
          </div>
        </div>
        <span className={`dl-status ${tone}`} data-testid="dl-status">
          {applied ? 'Deload active' : detection.needed ? 'Deload due' : detection.status === 'progressing' ? 'On track' : 'Collecting data'}
        </span>
      </div>

      {applied ? (
        <div className="dl-applied" data-testid="dl-applied">
          <div className="dl-applied-head">
            <span className="dl-applied-icon" aria-hidden="true"><Icon name="checkCircle" /></span>
            <div>
              <strong>Week {week} is a deload week</strong>
              <p>
                Loads at {formatRatioPct(appliedRatio)} of your last working weight
                {applied?.setsDropped ? `, ${applied.setsDropped} sets removed` : ''}
                {applied?.appliedAt ? ` · applied ${applied.appliedAt}` : ''}.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dl-revert"
            onClick={onRevert}
            disabled={!onRevert}
            data-testid="dl-revert"
          >
            <Icon name="rotate" /> Undo deload
          </button>
        </div>
      ) : (
        <>
          <p className="dl-message" data-testid="dl-message">
            <strong>{detection.title}.</strong> {detection.message}
          </p>

          {detection.tracked.length > 0 && (
            <div className="dl-evidence" data-testid="dl-evidence">
              {detection.triggers.map(trigger => (
                <span key={trigger.type} className="dl-chip warn">
                  <span className="dl-chip-label">{trigger.type === 'plateau' ? 'Plateau' : 'Load'}</span>
                  {trigger.label}
                </span>
              ))}
              {detection.weeks.length === 2 && (
                <span className="dl-chip muted">
                  <span className="dl-chip-label">Weeks</span>
                  {detection.weeks[0].label} vs {detection.weeks[1].label}
                </span>
              )}
              {detection.progressing.length > 0 && (
                <span className="dl-chip good">
                  <span className="dl-chip-label">Moving</span>
                  {detection.progressing.slice(0, 2).map(item => `${item.exercise} ${smallDelta(item)}`).join(' · ')}
                </span>
              )}
            </div>
          )}

          {preview && preview.changes.length > 0 && (
            <div className="dl-preview" data-testid="dl-preview">
              <div className="dl-preview-head">
                <strong>Week {week} preview</strong>
                <span>
                  {preview.changes.length} lifts · {preview.totalSetsBefore} → {preview.totalSetsAfter} sets
                </span>
              </div>
              <ul className="dl-preview-list">
                {rows.map(change => (
                  <li key={change.name} className="dl-preview-row">
                    <span className="dl-preview-name">{change.name}</span>
                    <span className="dl-preview-weight">{weightLabel(change)}</span>
                    <span className="dl-preview-sets">{change.setsFrom} → {change.setsTo} sets</span>
                  </li>
                ))}
              </ul>
              {hiddenRows > 0 && (
                <p className="dl-preview-more">+ {hiddenRows} more {hiddenRows === 1 ? 'lift' : 'lifts'} adjusted</p>
              )}
            </div>
          )}

          {detection.needed && (
            <div className="dl-actions">
              <button
                type="button"
                className="dl-apply"
                onClick={() => onApply?.({ changes: preview?.changes || [], ratio: preview?.ratio || DELOAD_LOAD_RATIO })}
                disabled={!hasSchedule || !preview}
                data-testid="dl-apply"
              >
                <Icon name="rotate" /> Apply deload to Week {week}
              </button>
              <span className="dl-actions-note">
                {hasSchedule
                  ? `${formatRatioPct(MIN_LOAD_RATIO)}–${formatRatioPct(MAX_LOAD_RATIO)} loads, one fewer set per lift. Undo any time.`
                  : 'Generate this week’s plan first to apply the deload.'}
              </span>
            </div>
          )}
        </>
      )}

      <p className="dl-footnote">
        A deload is one lighter week, not a week off. Keeping {formatRatioPct(MIN_LOAD_RATIO)}–{formatRatioPct(MAX_LOAD_RATIO)} of your
        working weight preserves the movement pattern and lets joints, sleep and motivation catch up.
      </p>
    </section>
  );
};

export default DeloadCard;
export { DeloadCard };
