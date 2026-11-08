import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BODY_LOG_KEY,
  BODY_PHOTO_KEY,
  MAX_PHOTOS,
  sanitizeBodyLog,
  sanitizePhotos,
  upsertMeasurement,
  getMetricSeries,
  getMetricSummary,
  getBodySummary,
  formatBodyDate,
  formatMetricValue,
  formatMetricDelta,
  isImprovement,
  getTimeline,
  groupTimelineByMonth,
  getPhotoPair,
  addPhoto,
  removePhoto,
  getProgressInsight,
  loadBodyLog,
  saveBodyLog,
  loadBodyPhotos,
  saveBodyPhotos,
  preparePhoto
} from '../utils/bodyProgress';

const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const photo = (date, id = `photo-${date}`, createdAt = 1) => ({
  id,
  date,
  dataUrl: DATA_URL,
  createdAt
});

beforeEach(() => {
  localStorage.clear();
  // jsdom has no 2D context; return null quietly so the resize step falls back to the original.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('sanitizeBodyLog', () => {
  it('accepts a JSON string and sorts entries oldest first', () => {
    const log = sanitizeBodyLog(JSON.stringify([
      { date: '2026-11-08', weightKg: 80 },
      { date: '2026-10-01', weightKg: 82 }
    ]));
    expect(log.map(entry => entry.date)).toEqual(['2026-10-01', '2026-11-08']);
  });

  it('drops invalid dates, empty entries and out-of-range values', () => {
    const log = sanitizeBodyLog([
      { date: 'not-a-date', weightKg: 80 },
      { date: '2026-11-08' },
      { date: '2026-11-09', weightKg: 999 },
      { date: '2026-11-10', waistCm: 82 }
    ]);
    expect(log).toHaveLength(1);
    expect(log[0]).toEqual({ date: '2026-11-10', weightKg: null, waistCm: 82, chestCm: null, armCm: null, hipsCm: null, thighCm: null });
  });

  it('keeps the last entry for a duplicated date', () => {
    const log = sanitizeBodyLog([
      { date: '2026-11-08', weightKg: 80 },
      { date: '2026-11-08', weightKg: 79.5 }
    ]);
    expect(log).toHaveLength(1);
    expect(log[0].weightKg).toBe(79.5);
  });

  it('returns an empty list for garbage input', () => {
    expect(sanitizeBodyLog(null)).toEqual([]);
    expect(sanitizeBodyLog('{oops')).toEqual([]);
    expect(sanitizeBodyLog({})).toEqual([]);
  });
});

describe('upsertMeasurement', () => {
  it('adds a new dated entry', () => {
    const log = upsertMeasurement([], { weightKg: 80.4, waistCm: 88 }, { date: '2026-11-08' });
    expect(log).toHaveLength(1);
    expect(log[0].weightKg).toBe(80.4);
    expect(log[0].waistCm).toBe(88);
  });

  it('merges a same-day measurement instead of replacing it', () => {
    const first = upsertMeasurement([], { weightKg: 80 }, { date: '2026-11-08' });
    const second = upsertMeasurement(first, { waistCm: 88 }, { date: '2026-11-08' });
    expect(second).toHaveLength(1);
    expect(second[0].weightKg).toBe(80);
    expect(second[0].waistCm).toBe(88);
  });

  it('ignores out-of-range values and keeps a valid neighbourhood', () => {
    const log = upsertMeasurement([], { weightKg: 999, armCm: 38 }, { date: '2026-11-08' });
    expect(log[0].weightKg).toBeNull();
    expect(log[0].armCm).toBe(38);
  });

  it('returns the original log when nothing valid is supplied', () => {
    const log = upsertMeasurement([], {}, { date: '2026-11-08' });
    expect(log).toEqual([]);
  });
});

describe('metric summaries', () => {
  const log = sanitizeBodyLog([
    { date: '2026-10-01', weightKg: 84, waistCm: 92, armCm: 36 },
    { date: '2026-10-15', weightKg: 82.5, waistCm: 90, armCm: 36.5 },
    { date: '2026-11-01', weightKg: 81, waistCm: 88, armCm: 37 }
  ]);

  it('returns only the dates that contain the metric', () => {
    const series = getMetricSeries(log, 'weightKg');
    expect(series).toHaveLength(3);
    expect(series[2]).toEqual({ date: '2026-11-01', value: 81 });
    expect(getMetricSeries(log, 'chestCm')).toEqual([]);
  });

  it('computes first, latest, delta and percentage change', () => {
    const summary = getMetricSummary(log, 'weightKg');
    expect(summary.count).toBe(3);
    expect(summary.first).toBe(84);
    expect(summary.latest).toBe(81);
    expect(summary.delta).toBe(-3);
    expect(summary.deltaPct).toBe(-3.6);
    expect(summary.lastChange).toBe(-1.5);
    expect(summary.best).toBe(84);
    expect(summary.worst).toBe(81);
  });

  it('has a safe empty shape', () => {
    const summary = getMetricSummary(log, 'thighCm');
    expect(summary.count).toBe(0);
    expect(summary.latest).toBeNull();
    expect(summary.delta).toBeNull();
    expect(summary.points).toEqual([]);
  });

  it('summarises the whole body', () => {
    const body = getBodySummary(log);
    expect(body.entryCount).toBe(3);
    expect(body.spanDays).toBe(31);
    expect(body.weight.latest).toBe(81);
    expect(body.waist.latest).toBe(88);
    expect(body.arm.latest).toBe(37);
  });
});

describe('formatting helpers', () => {
  it('formats dates, values and deltas', () => {
    expect(formatBodyDate('2026-11-08')).toBe('Nov 8');
    expect(formatMetricValue(80.25, 'weightKg')).toBe('80.3 kg');
    expect(formatMetricValue(null, 'weightKg')).toBe('—');
    expect(formatMetricDelta(-2.5, 'waistCm')).toBe('-2.5 cm');
    expect(formatMetricDelta(1, 'armCm')).toBe('+1 cm');
    expect(formatMetricDelta(null, 'armCm')).toBe('');
  });

  it('knows which direction is an improvement', () => {
    expect(isImprovement('waistCm', -2)).toBe(true);
    expect(isImprovement('waistCm', 2)).toBe(false);
    expect(isImprovement('armCm', 1)).toBe(true);
    expect(isImprovement('weightKg', -3)).toBeNull();
    expect(isImprovement('armCm', 0)).toBeNull();
  });
});

describe('photos', () => {
  it('rejects non-image and oversized entries', () => {
    expect(sanitizePhotos([{ date: '2026-11-08', dataUrl: 'https://example.com/a.jpg' }])).toEqual([]);
    expect(sanitizePhotos([{ date: '2026-11-08', dataUrl: `data:image/jpeg;base64,${'a'.repeat(300000)}` }])).toEqual([]);
  });

  it('sorts by date and caps the gallery at the newest photos', () => {
    const many = Array.from({ length: MAX_PHOTOS + 2 }, (_, i) => photo(`2026-01-${String(i + 1).padStart(2, '0')}`, `p${i}`, i));
    const clean = sanitizePhotos(many);
    expect(clean).toHaveLength(MAX_PHOTOS);
    expect(clean[0].id).toBe('p2');
    expect(clean[clean.length - 1].id).toBe(`p${MAX_PHOTOS + 1}`);
  });

  it('adds, replaces and removes photos', () => {
    let photos = addPhoto([], photo('2026-11-01', 'a'));
    photos = addPhoto(photos, photo('2026-11-08', 'b'));
    expect(photos.map(item => item.id)).toEqual(['a', 'b']);
    photos = addPhoto(photos, { ...photo('2026-11-08', 'b'), createdAt: 5 });
    expect(photos).toHaveLength(2);
    expect(photos[1].createdAt).toBe(5);
    expect(removePhoto(photos, 'a')).toHaveLength(1);
  });

  it('picks a before/after pair and day gap', () => {
    const photos = [photo('2026-11-08', 'b'), photo('2026-09-01', 'a'), photo('2026-10-01', 'm')];
    const pair = getPhotoPair(photos);
    expect(pair.before.id).toBe('a');
    expect(pair.after.id).toBe('b');
    expect(pair.days).toBe(68);
    expect(getPhotoPair(photos, { beforeId: 'a', afterId: 'm' }).days).toBe(30);
    expect(getPhotoPair([photo('2026-11-08', 'only')])).toEqual({ before: expect.objectContaining({ id: 'only' }), after: null, days: 0 });
  });
});

describe('timeline', () => {
  it('merges measurements and photos newest first', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-01', weightKg: 84 },
      { date: '2026-11-01', weightKg: 81 }
    ]);
    const timeline = getTimeline(log, [photo('2026-11-01', 'p1'), photo('2026-10-15', 'p2')]);
    expect(timeline.map(item => item.date)).toEqual(['2026-11-01', '2026-10-15', '2026-10-01']);
    expect(timeline[0].photos).toHaveLength(1);
    expect(timeline[1].weightKg).toBeUndefined();
  });

  it('groups timeline items by month', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-01', weightKg: 84 },
      { date: '2026-11-01', weightKg: 81 }
    ]);
    const groups = groupTimelineByMonth(getTimeline(log));
    expect(groups.map(group => group.label)).toEqual(['Nov 2026', 'Oct 2026']);
  });
});

describe('progress insight', () => {
  it('asks for a baseline with fewer than two weight logs', () => {
    const insight = getProgressInsight(sanitizeBodyLog([{ date: '2026-11-01', weightKg: 81 }]));
    expect(insight.status).toBe('starting');
  });

  it('recognises on-pace fat loss', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 84 },
      { date: '2026-10-18', weightKg: 83 },
      { date: '2026-11-01', weightKg: 82 }
    ]);
    const insight = getProgressInsight(log, { goal: 'fatloss' });
    expect(insight.status).toBe('ontrack');
    expect(insight.title).toContain('on pace');
  });

  it('flags recomposition when the waist falls but weight holds', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 82, waistCm: 90 },
      { date: '2026-11-01', weightKg: 82, waistCm: 87 }
    ]);
    const insight = getProgressInsight(log, { goal: 'fatloss' });
    expect(insight.status).toBe('ontrack');
    expect(insight.title).toContain('Recomposition');
  });

  it('warns about overly fast loss', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 90 },
      { date: '2026-11-01', weightKg: 84 }
    ]);
    expect(getProgressInsight(log, { goal: 'fatloss' }).status).toBe('fast');
  });

  it('coaches a lean gain and a drift down for muscle goals', () => {
    const gain = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 80, chestCm: 100 },
      { date: '2026-11-01', weightKg: 80.7, chestCm: 101 }
    ]);
    expect(getProgressInsight(gain, { goal: 'muscle' }).status).toBe('ontrack');

    const drop = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 82 },
      { date: '2026-11-01', weightKg: 80 }
    ]);
    expect(getProgressInsight(drop, { goal: 'muscle' }).status).toBe('stalled');
  });

  it('keeps endurance weight stable', () => {
    const log = sanitizeBodyLog([
      { date: '2026-10-04', weightKg: 70 },
      { date: '2026-11-01', weightKg: 70.2 }
    ]);
    expect(getProgressInsight(log, { goal: 'endurance' }).status).toBe('ontrack');
  });
});

describe('storage', () => {
  it('round-trips measurements and photos through localStorage', () => {
    expect(loadBodyLog()).toEqual([]);
    saveBodyLog([{ date: '2026-11-08', weightKg: 80 }]);
    expect(JSON.parse(localStorage.getItem(BODY_LOG_KEY))).toHaveLength(1);
    expect(loadBodyLog()[0].weightKg).toBe(80);

    saveBodyPhotos([photo('2026-11-08')]);
    expect(JSON.parse(localStorage.getItem(BODY_PHOTO_KEY))).toHaveLength(1);
    expect(loadBodyPhotos()).toHaveLength(1);
  });
});

describe('preparePhoto', () => {
  it('reads a small image file into a storable photo', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'progress.png', { type: 'image/png' });
    const result = await preparePhoto(file, { date: '2026-11-08' });
    expect(result.date).toBe('2026-11-08');
    expect(result.dataUrl.startsWith('data:image/png')).toBe(true);
    expect(result.id).toMatch(/^p-/);
  });

  it('rejects a missing file and non-image uploads', async () => {
    await expect(preparePhoto(null)).rejects.toThrow(/Choose a photo/i);
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await expect(preparePhoto(file, { date: '2026-11-08' })).rejects.toThrow(/not an image/i);
  });
});
