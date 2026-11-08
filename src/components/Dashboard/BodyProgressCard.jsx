import React, { useMemo, useState } from 'react';
import Icon from '../Layout/Icon';
import { toDateKey } from '../../utils/streaks';
import {
  METRICS,
  MAX_PHOTOS,
  formatBodyDate,
  formatMetricValue,
  formatMetricDelta,
  isImprovement,
  sanitizeBodyLog,
  sanitizePhotos,
  loadBodyLog,
  saveBodyLog,
  upsertMeasurement,
  getBodySummary,
  getMetricSummary,
  getProgressInsight,
  getTimeline,
  groupTimelineByMonth,
  getPhotoPair,
  loadBodyPhotos,
  saveBodyPhotos,
  addPhoto,
  removePhoto,
  preparePhoto
} from '../../utils/bodyProgress';

const TABS = [
  { id: 'trend', label: 'Trend' },
  { id: 'photos', label: 'Photos' },
  { id: 'timeline', label: 'Timeline' }
];

const emptyDraft = (todayKey) => METRICS.reduce(
  (draft, metric) => ({ ...draft, [metric.key]: '' }),
  { date: todayKey }
);

const deltaClass = (key, delta) => {
  const good = isImprovement(key, delta);
  if (good === null) return 'neutral';
  return good ? 'good' : 'bad';
};

const TrendChart = ({ series, label, unit }) => {
  const points = series.slice(-12);
  if (points.length < 2) {
    return (
      <p className="bp-chart-empty" data-testid="bp-chart-empty">
        Add a second {label.toLowerCase()} measurement to draw the trend.
      </p>
    );
  }

  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((point, index) => ({
    x: 10 + (index / (points.length - 1)) * 280,
    y: 90 - ((point.value - min) / span) * 70
  }));
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},100 L${coords[0].x.toFixed(1)},100 Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const chartLabel = `${label} trend, ${points.length} measurements from ${formatBodyDate(first.date)} (${first.value} ${unit}) to ${formatBodyDate(last.date)} (${last.value} ${unit})`;

  return (
    <div className="bp-chart" role="img" aria-label={chartLabel} data-testid="bp-chart">
      <svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="bpAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#bpAreaGradient)" />
        <path d={line} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <circle
            key={points[index].date}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 3.6 : 2}
            fill={index === coords.length - 1 ? 'var(--accent-cyan)' : 'var(--bg-card)'}
            stroke="var(--accent-cyan)"
            strokeWidth="1.6"
          />
        ))}
      </svg>
      <div className="bp-chart-axis" aria-hidden="true">
        <span>{formatBodyDate(first.date)} · {first.value} {unit}</span>
        <span>{formatBodyDate(last.date)} · {last.value} {unit}</span>
      </div>
    </div>
  );
};

const BodyProgressCard = ({
  today,
  goal = 'fatloss',
  initialWeight,
  initialLog,
  initialPhotos,
  onNotify
}) => {
  const todayKey = toDateKey(today || new Date());
  const [log, setLog] = useState(() => (initialLog ? sanitizeBodyLog(initialLog) : loadBodyLog()));
  const [photos, setPhotos] = useState(() => (initialPhotos ? sanitizePhotos(initialPhotos) : loadBodyPhotos()));
  const [tab, setTab] = useState('trend');
  const [metric, setMetric] = useState('weightKg');
  const [draft, setDraft] = useState(() => ({
    ...emptyDraft(todayKey),
    weightKg: initialWeight ? String(initialWeight) : ''
  }));
  const [formError, setFormError] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoDate, setPhotoDate] = useState(todayKey);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [compare, setCompare] = useState({ beforeId: null, afterId: null });
  const [split, setSplit] = useState(50);

  const summary = useMemo(() => getBodySummary(log), [log]);
  const insight = useMemo(() => getProgressInsight(log, { goal }), [log, goal]);
  const selected = useMemo(() => getMetricSummary(log, metric), [log, metric]);
  const timeline = useMemo(() => getTimeline(log, photos), [log, photos]);
  const groups = useMemo(() => groupTimelineByMonth(timeline), [timeline]);
  const photoPair = useMemo(() => getPhotoPair(photos, compare), [photos, compare]);
  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1)),
    [photos]
  );

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFormError('');
    setSaveNote('');
  };

  const handleSaveMeasurement = (event) => {
    event.preventDefault();
    const values = {};

    for (const definition of METRICS) {
      const raw = draft[definition.key];
      if (raw === '' || raw === null || raw === undefined) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < definition.min || value > definition.max) {
        setFormError(`${definition.label} must be between ${definition.min} and ${definition.max} ${definition.unit}.`);
        return;
      }
      values[definition.key] = value;
    }

    if (!Object.keys(values).length) {
      setFormError('Enter at least one measurement before saving.');
      return;
    }

    const date = draft.date || todayKey;
    const next = upsertMeasurement(log, values, { date });
    if (!next.some(entry => entry.date === date)) {
      setFormError('Those values are outside the expected range.');
      return;
    }

    setLog(next);
    const persisted = saveBodyLog(next);
    setFormError('');
    setDraft({ ...emptyDraft(todayKey), date });
    setSaveNote(persisted
      ? `Saved ${formatBodyDate(date)}. Log again next week to grow the trend.`
      : `Saved for this session — this browser blocked local storage.`);
    onNotify?.(
      persisted ? `Measurements saved for ${formatBodyDate(date)}` : 'Measurements saved for this session only',
      persisted ? 'success' : 'info'
    );
  };

  const handlePhotoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoBusy(true);
    setPhotoError('');
    try {
      const dropped = photos.length >= MAX_PHOTOS;
      const photo = await preparePhoto(file, { date: photoDate || todayKey });
      const next = addPhoto(photos, photo);
      setPhotos(next);
      const persisted = saveBodyPhotos(next);
      if (!persisted) {
        setPhotoError('Storage is full. Delete an older photo and try again.');
        return;
      }
      onNotify?.(
        dropped
          ? `Photo added — the oldest of ${MAX_PHOTOS} was removed.`
          : 'Progress photo added — it stays on this device.',
        'success'
      );
    } catch (error) {
      setPhotoError(error?.message || 'Could not add that photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const next = removePhoto(photos, pendingDelete);
    setPhotos(next);
    const persisted = saveBodyPhotos(next);
    if (!persisted) setPhotoError('Could not update stored photos in this browser.');
    if (compare.beforeId === pendingDelete) setCompare(prev => ({ ...prev, beforeId: null }));
    if (compare.afterId === pendingDelete) setCompare(prev => ({ ...prev, afterId: null }));
    setPendingDelete(null);
  };

  const newestPhoto = photos[photos.length - 1] || null;

  return (
    <section className="bp-card" aria-label="Body measurements and photo progress" data-testid="body-progress-card">
      <div className="bp-header">
        <div className="bp-title-wrap">
          <span className="bp-icon" aria-hidden="true"><Icon name="trending" /></span>
          <div>
            <h3 className="bp-title">Body Progress</h3>
            <p className="bp-subtitle">Measure the tape, stack the photos, and watch change before the mirror shows it.</p>
          </div>
        </div>
        <div className="bp-stats">
          <div className="bp-stat">
            <span className="bp-stat-value" data-testid="bp-stat-weight">
              {summary.weight.latest !== null ? `${summary.weight.latest}` : '—'}
              <small>{summary.weight.latest !== null ? ' kg' : ''}</small>
            </span>
            <span className="bp-stat-label">weight</span>
          </div>
          <div className="bp-stat">
            <span className="bp-stat-value" data-testid="bp-stat-waist">
              {summary.waist.latest !== null ? `${summary.waist.latest}` : '—'}
              <small>{summary.waist.latest !== null ? ' cm' : ''}</small>
            </span>
            <span className="bp-stat-label">waist</span>
          </div>
          <div className="bp-stat">
            <span className="bp-stat-value" data-testid="bp-stat-checkins">{summary.entryCount}</span>
            <span className="bp-stat-label">check-ins</span>
          </div>
          <div className="bp-stat">
            <span className="bp-stat-value" data-testid="bp-stat-photos">{photos.length}</span>
            <span className="bp-stat-label">photos</span>
          </div>
        </div>
      </div>

      <div className={`bp-insight status-${insight.status}`} data-testid="bp-insight" data-status={insight.status}>
        <span className="bp-insight-icon" aria-hidden="true"><Icon name="lightbulb" /></span>
        <div>
          <strong>{insight.title}</strong>
          <p>{insight.body}</p>
        </div>
      </div>

      <div className="bp-toolbar">
        <div className="bp-tabs" role="tablist" aria-label="Body progress view">
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`bp-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`bp-panel-${item.id}`}
              className={`bp-tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.id === 'photos' && photos.length > 0 ? ` (${photos.length})` : ''}
            </button>
          ))}
        </div>
        <span className="bp-privacy"><Icon name="lock" /> Stored on this device</span>
      </div>

      {tab === 'trend' && (
        <div className="bp-panel" role="tabpanel" id="bp-panel-trend" aria-labelledby="bp-tab-trend">
          <div className="bp-metrics" data-testid="bp-metrics">
            {METRICS.map(definition => {
              const stat = getMetricSummary(log, definition.key);
              const delta = stat.delta;
              return (
                <button
                  key={definition.key}
                  type="button"
                  className={`bp-metric ${metric === definition.key ? 'active' : ''}`}
                  aria-pressed={metric === definition.key}
                  onClick={() => setMetric(definition.key)}
                  data-testid={`bp-metric-${definition.key}`}
                >
                  <span className="bp-metric-label">{definition.label}</span>
                  <span className="bp-metric-value">
                    {stat.latest !== null ? `${stat.latest}` : '—'}
                    <small>{stat.latest !== null ? ` ${definition.unit}` : ''}</small>
                  </span>
                  <span className={`bp-metric-delta ${deltaClass(definition.key, delta)}`}>
                    {delta === null
                      ? 'first log'
                      : delta === 0
                        ? 'no change'
                        : `${delta > 0 ? '↑' : '↓'} ${formatMetricDelta(delta, definition.key)}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bp-trend">
            <div className="bp-trend-head">
              <h4 className="bp-block-title">
                {selected.label} · {selected.count > 0 ? `${selected.count} check-ins` : 'no data yet'}
              </h4>
              {selected.delta !== null && (
                <span className={`bp-trend-delta ${deltaClass(selected.key, selected.delta)}`}>
                  {formatMetricDelta(selected.delta, selected.key)} since {formatBodyDate(selected.firstDate)}
                </span>
              )}
            </div>
            <TrendChart series={selected.points} label={selected.label} unit={selected.unit} />
          </div>

          <form className="bp-form" onSubmit={handleSaveMeasurement} data-testid="bp-form" noValidate>
            <div className="bp-form-head">
              <h4 className="bp-block-title">Log measurements</h4>
              <span className="bp-form-hint">Same date updates that day&apos;s entry.</span>
            </div>
            <div className="bp-form-grid">
              <label className="bp-field bp-field-date" htmlFor="bp-date">
                <span>Date</span>
                <input
                  id="bp-date"
                  type="date"
                  value={draft.date}
                  max={todayKey}
                  onChange={event => updateDraft('date', event.target.value)}
                />
              </label>
              {METRICS.map(definition => (
                <label className="bp-field" key={definition.key} htmlFor={`bp-${definition.key}`}>
                  <span>{definition.label} <small>{definition.unit}</small></span>
                  <input
                    id={`bp-${definition.key}`}
                    type="number"
                    inputMode="decimal"
                    step={definition.step}
                    min={definition.min}
                    max={definition.max}
                    placeholder="—"
                    value={draft[definition.key]}
                    onChange={event => updateDraft(definition.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            {formError && <p className="bp-error" role="alert" data-testid="bp-form-error">{formError}</p>}
            {saveNote && <p className="bp-save-note" data-testid="bp-save-note">{saveNote}</p>}
            <button type="submit" className="bp-save" data-testid="bp-save">
              <Icon name="check" /> Save measurements
            </button>
          </form>
        </div>
      )}

      {tab === 'photos' && (
        <div className="bp-panel" role="tabpanel" id="bp-panel-photos" aria-labelledby="bp-tab-photos">
          <div className="bp-upload-row">
            <label className="bp-field bp-field-date" htmlFor="bp-photo-date">
              <span>Photo date</span>
              <input
                id="bp-photo-date"
                type="date"
                value={photoDate}
                max={todayKey}
                onChange={event => setPhotoDate(event.target.value)}
              />
            </label>
            <label className={`bp-upload ${photoBusy ? 'busy' : ''}`}>
              <Icon name="share" />
              {photoBusy ? 'Preparing photo…' : 'Add progress photo'}
              <input
                type="file"
                accept="image/*"
                aria-label="Add progress photo"
                onChange={handlePhotoFile}
                disabled={photoBusy}
                hidden
              />
            </label>
            <span className="bp-upload-meta">{photos.length} / {MAX_PHOTOS} saved</span>
          </div>
          <p className="bp-photo-note">
            Photos are resized to 640 px and kept in this browser only — nothing is uploaded.
            Adding a ninth photo drops the oldest.
          </p>
          {photoError && <p className="bp-error" role="alert" data-testid="bp-photo-error">{photoError}</p>}

          {photos.length === 0 ? (
            <p className="bp-empty" data-testid="bp-photo-empty">
              No progress photos yet. Take the same front-facing shot in similar light every two weeks —
              the compare slider makes small changes obvious.
            </p>
          ) : (
            <>
              {photos.length >= 2 && photoPair.before && photoPair.after && (
                <div className="bp-compare-wrap">
                  <div className="bp-compare" data-testid="bp-compare">
                    <img
                      className="bp-compare-img"
                      src={photoPair.after.dataUrl}
                      alt={`Progress photo from ${formatBodyDate(photoPair.after.date)}`}
                    />
                    <div
                      className="bp-compare-before"
                      style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                    >
                      <img
                        className="bp-compare-img"
                        src={photoPair.before.dataUrl}
                        alt={`Progress photo from ${formatBodyDate(photoPair.before.date)}`}
                      />
                    </div>
                    <div className="bp-compare-tag left">{formatBodyDate(photoPair.before.date)}</div>
                    <div className="bp-compare-tag right">{formatBodyDate(photoPair.after.date)}</div>
                  </div>
                  <div className="bp-compare-controls">
                    <select
                      aria-label="Before photo"
                      value={photoPair.before.id}
                      onChange={event => setCompare(prev => ({ ...prev, beforeId: event.target.value }))}
                    >
                      {sortedPhotos.map(photo => (
                        <option key={photo.id} value={photo.id}>{formatBodyDate(photo.date)}</option>
                      ))}
                    </select>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={split}
                      aria-label="Reveal before photo"
                      onChange={event => setSplit(Number(event.target.value))}
                    />
                    <select
                      aria-label="After photo"
                      value={photoPair.after.id}
                      onChange={event => setCompare(prev => ({ ...prev, afterId: event.target.value }))}
                    >
                      {sortedPhotos.map(photo => (
                        <option key={photo.id} value={photo.id}>{formatBodyDate(photo.date)}</option>
                      ))}
                    </select>
                    <span className="bp-compare-days">{photoPair.days} days apart</span>
                  </div>
                </div>
              )}

              <div className="bp-photo-grid" data-testid="bp-photo-grid">
                {sortedPhotos.map(photo => (
                  <figure className="bp-photo" key={photo.id}>
                    <img src={photo.dataUrl} alt={`Progress photo from ${formatBodyDate(photo.date)}`} />
                    <figcaption>{formatBodyDate(photo.date)}</figcaption>
                    <button
                      type="button"
                      className="bp-photo-delete"
                      aria-label={`Delete photo from ${formatBodyDate(photo.date)}`}
                      onClick={() => setPendingDelete(photo.id)}
                    >
                      <Icon name="trash" />
                    </button>
                  </figure>
                ))}
              </div>

              {pendingDelete && (
                <div className="bp-confirm" role="alertdialog" aria-label="Delete progress photo" data-testid="bp-delete-confirm">
                  <span>Delete this photo? It cannot be restored.</span>
                  <div>
                    <button type="button" className="bp-confirm-cancel" onClick={() => setPendingDelete(null)}>Keep</button>
                    <button type="button" className="bp-confirm-delete" onClick={confirmDelete}>Delete</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bp-panel" role="tabpanel" id="bp-panel-timeline" aria-labelledby="bp-tab-timeline">
          {timeline.length === 0 ? (
            <p className="bp-empty" data-testid="bp-timeline-empty">
              Log your first measurement or add a photo and the timeline builds itself.
            </p>
          ) : (
            <div className="bp-timeline" data-testid="bp-timeline">
              {groups.map(group => (
                <div className="bp-month" key={group.label}>
                  <h4 className="bp-month-label">{group.label}</h4>
                  <ul className="bp-timeline-list">
                    {group.items.map(item => {
                      const values = METRICS.filter(definition => item[definition.key] !== null && item[definition.key] !== undefined);
                      return (
                        <li className="bp-timeline-item" key={item.date}>
                          <span className="bp-timeline-dot" aria-hidden="true" />
                          <div className="bp-timeline-body">
                            <div className="bp-timeline-date">{formatBodyDate(item.date)}</div>
                            <div className="bp-timeline-values">
                              {values.length === 0 && <span className="bp-muted">Photo only</span>}
                              {values.map(definition => (
                                <span className="bp-chip" key={definition.key}>
                                  {definition.label} <strong>{formatMetricValue(item[definition.key], definition.key)}</strong>
                                </span>
                              ))}
                            </div>
                            {item.photos.length > 0 && (
                              <div className="bp-timeline-photos">
                                {item.photos.map(photo => (
                                  <img
                                    key={photo.id}
                                    src={photo.dataUrl}
                                    alt={`Progress photo from ${formatBodyDate(photo.date)}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {newestPhoto && (
            <p className="bp-footnote">
              Latest photo {formatBodyDate(newestPhoto.date)}. Keep the camera height and lighting the same for a fair comparison.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default BodyProgressCard;
export { BodyProgressCard };
