// Body composition & photo progress engine.
// Measurements live in localStorage as one entry per day:
// { date: 'YYYY-MM-DD', weightKg, waistCm, chestCm, armCm, hipsCm, thighCm }
// Photos are compressed data URLs kept beside them, never uploaded anywhere.
import { toDateKey, daysBetween } from './streaks';

export const BODY_LOG_KEY = 'novafit_body_log';
export const BODY_PHOTO_KEY = 'novafit_body_photos';
export const MAX_MEASUREMENTS = 240;
export const MAX_PHOTOS = 8;
export const PHOTO_MAX_EDGE = 640;
export const PHOTO_QUALITY = 0.72;
// ~190 kB of data URL; keeps eight photos inside a typical 5 MB localStorage budget.
export const MAX_PHOTO_CHARS = 260000;

export const METRICS = Object.freeze([
  { key: 'weightKg', label: 'Weight', unit: 'kg', min: 25, max: 350, step: 0.1, direction: 'neutral' },
  { key: 'waistCm', label: 'Waist', unit: 'cm', min: 40, max: 200, step: 0.5, direction: 'down' },
  { key: 'chestCm', label: 'Chest', unit: 'cm', min: 50, max: 200, step: 0.5, direction: 'up' },
  { key: 'armCm', label: 'Arm', unit: 'cm', min: 15, max: 80, step: 0.5, direction: 'up' },
  { key: 'hipsCm', label: 'Hips', unit: 'cm', min: 50, max: 200, step: 0.5, direction: 'down' },
  { key: 'thighCm', label: 'Thigh', unit: 'cm', min: 25, max: 120, step: 0.5, direction: 'up' }
]);

export const METRIC_BY_KEY = Object.freeze(
  METRICS.reduce((map, metric) => ({ ...map, [metric.key]: metric }), {})
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const round1 = (n) => Math.round(n * 10) / 10;

const isValidDateKey = (key) => typeof key === 'string' && DATE_PATTERN.test(key);

const readNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const formatBodyDate = (dateOrKey) => {
  const key = typeof dateOrKey === 'string' ? dateOrKey : toDateKey(dateOrKey);
  if (!isValidDateKey(key)) return '';
  const [, m, d] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

export const formatMetricValue = (value, key) => {
  const metric = METRIC_BY_KEY[key];
  if (!metric || value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${round1(Number(value))} ${metric.unit}`;
};

export const formatMetricDelta = (delta, key) => {
  const metric = METRIC_BY_KEY[key];
  if (!metric || delta === null || delta === undefined || !Number.isFinite(Number(delta))) return '';
  const amount = round1(Number(delta));
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount} ${metric.unit}`;
};

// Lower is better for waist/hips, higher is better for chest/arm/thigh.
export const isImprovement = (key, delta) => {
  const metric = METRIC_BY_KEY[key];
  if (!metric || delta === null || delta === undefined || !Number.isFinite(Number(delta))) return null;
  if (Math.abs(delta) < 0.05) return null;
  if (metric.direction === 'down') return delta < 0;
  if (metric.direction === 'up') return delta > 0;
  return null;
};

const sanitizeMeasurement = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const date = isValidDateKey(raw.date) ? raw.date : null;
  if (!date) return null;

  const entry = { date };
  let hasValue = false;
  METRICS.forEach(({ key, min, max }) => {
    const value = readNumber(raw[key]);
    if (value === null || value < min || value > max) {
      entry[key] = null;
      return;
    }
    entry[key] = round1(value);
    hasValue = true;
  });

  return hasValue ? entry : null;
};

// Accepts an array or a JSON string. Keeps the last entry for a date and sorts oldest first.
export const sanitizeBodyLog = (raw) => {
  let source = raw;
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];

  const byDate = new Map();
  source.forEach(item => {
    const entry = sanitizeMeasurement(item);
    if (entry) byDate.set(entry.date, entry);
  });

  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-MAX_MEASUREMENTS);
};

export const loadBodyLog = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    return sanitizeBodyLog(localStorage.getItem(BODY_LOG_KEY));
  } catch {
    return [];
  }
};

export const saveBodyLog = (log) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(BODY_LOG_KEY, JSON.stringify(sanitizeBodyLog(log)));
    return true;
  } catch {
    return false;
  }
};

// Same-day logs merge, so adding a waist measurement later does not wipe today's weight.
export const upsertMeasurement = (log, values, { date = toDateKey(new Date()) } = {}) => {
  const entries = sanitizeBodyLog(log);
  const key = isValidDateKey(date) ? date : toDateKey(new Date());
  const existing = entries.find(entry => entry.date === key);
  const merged = { ...(existing || { date: key }) };

  METRICS.forEach(({ key: metricKey }) => {
    const next = readNumber(values?.[metricKey]);
    if (next !== null) merged[metricKey] = next;
  });

  const cleaned = sanitizeMeasurement(merged);
  if (!cleaned) return entries;

  const nextLog = entries.filter(entry => entry.date !== key);
  nextLog.push(cleaned);
  nextLog.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return nextLog.slice(-MAX_MEASUREMENTS);
};

export const getMetricSeries = (log, key) => sanitizeBodyLog(log)
  .filter(entry => entry[key] !== null && entry[key] !== undefined)
  .map(entry => ({ date: entry.date, value: entry[key] }));

export const getMetricSummary = (log, key) => {
  const metric = METRIC_BY_KEY[key];
  const points = getMetricSeries(log, key);
  const base = {
    key,
    label: metric?.label || key,
    unit: metric?.unit || '',
    direction: metric?.direction || 'neutral',
    points,
    count: points.length,
    first: null,
    firstDate: null,
    latest: null,
    latestDate: null,
    previous: null,
    delta: null,
    deltaPct: null,
    lastChange: null,
    best: null,
    worst: null
  };
  if (!points.length) return base;

  const first = points[0];
  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const values = points.map(point => point.value);
  const delta = points.length > 1 ? round1(last.value - first.value) : null;

  return {
    ...base,
    first: first.value,
    firstDate: first.date,
    latest: last.value,
    latestDate: last.date,
    previous: previous ? previous.value : null,
    delta,
    deltaPct: delta === null || first.value === 0 ? null : round1((delta / first.value) * 100),
    lastChange: previous ? round1(last.value - previous.value) : null,
    best: Math.max(...values),
    worst: Math.min(...values)
  };
};

export const getBodySummary = (log) => {
  const entries = sanitizeBodyLog(log);
  const first = entries[0] || null;
  const last = entries[entries.length - 1] || null;
  return {
    entryCount: entries.length,
    firstDate: first?.date || null,
    latestDate: last?.date || null,
    spanDays: first && last ? daysBetween(first.date, last.date) : 0,
    weight: getMetricSummary(entries, 'weightKg'),
    waist: getMetricSummary(entries, 'waistCm'),
    chest: getMetricSummary(entries, 'chestCm'),
    arm: getMetricSummary(entries, 'armCm'),
    hips: getMetricSummary(entries, 'hipsCm'),
    thigh: getMetricSummary(entries, 'thighCm')
  };
};

const sanitizePhoto = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.dataUrl !== 'string' || !raw.dataUrl.startsWith('data:image/')) return null;
  if (raw.dataUrl.length > MAX_PHOTO_CHARS) return null;
  if (!isValidDateKey(raw.date)) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `photo-${raw.date}`,
    date: raw.date,
    dataUrl: raw.dataUrl,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : 0
  };
};

const sortPhotos = (photos) => [...photos].sort((a, b) => {
  if (a.date === b.date) return a.createdAt - b.createdAt;
  return a.date < b.date ? -1 : 1;
});

export const sanitizePhotos = (raw) => {
  let source = raw;
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];

  const seen = new Set();
  const photos = [];
  source.forEach(item => {
    const photo = sanitizePhoto(item);
    if (!photo || seen.has(photo.id)) return;
    seen.add(photo.id);
    photos.push(photo);
  });
  return sortPhotos(photos).slice(-MAX_PHOTOS);
};

export const loadBodyPhotos = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    return sanitizePhotos(localStorage.getItem(BODY_PHOTO_KEY));
  } catch {
    return [];
  }
};

export const saveBodyPhotos = (photos) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(BODY_PHOTO_KEY, JSON.stringify(sanitizePhotos(photos)));
    return true;
  } catch {
    return false;
  }
};

export const addPhoto = (photos, photo) => {
  const clean = sanitizePhoto(photo);
  if (!clean) return sanitizePhotos(photos);
  const next = sanitizePhotos(photos).filter(item => item.id !== clean.id);
  next.push(clean);
  return sortPhotos(next).slice(-MAX_PHOTOS);
};

export const removePhoto = (photos, id) => sanitizePhotos(photos).filter(photo => photo.id !== id);

export const getPhotoPair = (photos, { beforeId, afterId } = {}) => {
  const sorted = sortPhotos(sanitizePhotos(photos));
  if (sorted.length < 2) return { before: sorted[0] || null, after: null, days: 0 };
  const before = sorted.find(photo => photo.id === beforeId) || sorted[0];
  const after = sorted.find(photo => photo.id === afterId) || sorted[sorted.length - 1];
  if (before.id === after.id) {
    const fallback = sorted.find(photo => photo.id !== before.id);
    return { before, after: fallback || null, days: fallback ? Math.abs(daysBetween(before.date, fallback.date)) : 0 };
  }
  return { before, after, days: Math.abs(daysBetween(before.date, after.date)) };
};

// Timeline joins measurements and photos by date, newest first.
export const getTimeline = (log, photos = []) => {
  const entries = sanitizeBodyLog(log);
  const byDate = new Map(entries.map(entry => [entry.date, { ...entry, photos: [] }]));
  sanitizePhotos(photos).forEach(photo => {
    if (!byDate.has(photo.date)) {
      byDate.set(photo.date, { date: photo.date, photos: [] });
    }
    byDate.get(photo.date).photos.push(photo);
  });

  return [...byDate.values()]
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .map(entry => ({ ...entry, photos: sortPhotos(entry.photos) }));
};

export const getMonthLabel = (dateKey) => {
  if (!isValidDateKey(dateKey)) return '';
  const [y, m] = dateKey.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const groupTimelineByMonth = (timeline) => {
  const groups = [];
  let current = null;
  timeline.forEach(item => {
    const label = getMonthLabel(item.date);
    if (!current || current.label !== label) {
      current = { label, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  });
  return groups;
};

export const getProgressInsight = (log, { goal = 'fatloss' } = {}) => {
  const summary = getBodySummary(log);
  const weight = summary.weight;
  if (weight.count < 2) {
    return {
      status: 'starting',
      title: 'Your baseline starts here',
      body: 'Log one measurement now, then again in a week. NovaFit compares the tape and the scale so you can see change before the mirror does.'
    };
  }

  const spanDays = Math.max(1, daysBetween(weight.firstDate, weight.latestDate));
  const weeks = spanDays / 7;
  const weeklyPct = weight.first
    ? (weight.delta / weight.first) * 100 / weeks
    : 0;
  const waistDelta = summary.waist.delta;
  const armDelta = summary.arm.delta;
  const chestDelta = summary.chest.delta;
  const tapeUp = (armDelta !== null && armDelta >= 0.5) || (chestDelta !== null && chestDelta >= 1);

  if (goal === 'muscle') {
    if (weeklyPct >= 0.7) {
      return {
        status: 'fast',
        title: 'Gaining quickly',
        body: `Up ${Math.abs(weight.delta)} kg in ${Math.round(weeks)} weeks. If the waist is climbing too, ease the surplus by ~200 kcal and keep protein high.`
      };
    }
    if (weeklyPct >= 0.1 || tapeUp) {
      return {
        status: 'ontrack',
        title: 'Lean gain is on pace',
        body: `${weight.delta >= 0 ? `+${weight.delta}` : weight.delta} kg with the tape moving in the right places. Keep progressive overload steady.`
      };
    }
    if (weeklyPct <= -0.2) {
      return {
        status: 'stalled',
        title: 'Scale is drifting down',
        body: `You are down ${Math.abs(weight.delta)} kg while trying to build. Add ~250 kcal on training days and protect 1.6–2.2 g protein per kg.`
      };
    }
    return {
      status: 'slow',
      title: 'Holding steady',
      body: 'Weight is flat. If performance is climbing, that is fine — otherwise add a small surplus and one hard set per lift.'
    };
  }

  if (goal === 'endurance') {
    if (Math.abs(weeklyPct) <= 0.4 && (waistDelta === null || waistDelta <= 1)) {
      return {
        status: 'ontrack',
        title: 'Race weight is stable',
        body: 'Weight and waist are holding while training volume builds. Fuel sessions first and keep long-run carbs consistent.'
      };
    }
    return {
      status: 'stalled',
      title: 'Body weight is moving',
      body: `${waistDelta !== null ? `Waist ${waistDelta > 0 ? '+' : ''}${waistDelta} cm · ` : ''}Weight ${weight.delta > 0 ? '+' : ''}${weight.delta} kg. Stable weight protects endurance — adjust intake toward maintenance.`
    };
  }

  // Default: fat loss.
  if (waistDelta !== null && waistDelta <= -1 && weeklyPct > -0.25) {
    return {
      status: 'ontrack',
      title: 'Recomposition is working',
      body: `Waist down ${Math.abs(waistDelta)} cm while weight held. That is the signature of losing fat and keeping muscle.`
    };
  }
  if (weeklyPct <= -1.5) {
    return {
      status: 'fast',
      title: 'Dropping faster than planned',
      body: `Down ${Math.abs(weight.delta)} kg in ${Math.round(weeks)} weeks. Very aggressive cuts cost muscle — add ~200 kcal and keep lifting heavy.`
    };
  }
  if (weeklyPct <= -0.25) {
    return {
      status: 'ontrack',
      title: 'Fat loss is on pace',
      body: `Down ${Math.abs(weight.delta)} kg across ${Math.round(weeks)} weeks${waistDelta !== null ? `, waist ${waistDelta} cm` : ''}. Hold the current intake and training volume.`
    };
  }
  if (weeklyPct >= 0.2) {
    return {
      status: 'stalled',
      title: 'The scale is trending up',
      body: `Up ${weight.delta} kg since your first log. Tighten the weekly average by ~250 kcal and re-check in seven days.`
    };
  }
  return {
    status: 'slow',
    title: 'Progress is slow but real',
    body: 'The scale is nearly flat. Give it another week, then trim ~150 kcal if the waist has not moved either.'
  };
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  if (typeof FileReader === 'undefined') {
    reject(new Error('Photo reading is not available in this browser.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Could not read that photo.'));
  reader.readAsDataURL(file);
});

// Resize in a canvas when available; tests and very old browsers keep the original.
export const downscaleDataUrl = (dataUrl, { maxEdge = PHOTO_MAX_EDGE, quality = PHOTO_QUALITY } = {}) => new Promise(resolve => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    resolve(dataUrl);
    return;
  }
  const canvas = document.createElement('canvas');
  let ctx = null;
  try {
    ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  } catch {
    ctx = null;
  }
  if (!ctx) {
    resolve(dataUrl);
    return;
  }

  const img = new Image();
  img.onload = () => {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      resolve(dataUrl);
      return;
    }
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    try {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    } catch {
      resolve(dataUrl);
    }
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

export const makePhotoId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Reads, shrinks and validates one file from an <input type="file">.
export const preparePhoto = async (file, { date = toDateKey(new Date()) } = {}) => {
  if (!file) throw new Error('Choose a photo first.');
  if (file.type && !file.type.startsWith('image/')) throw new Error('That file is not an image.');
  if (!isValidDateKey(date)) throw new Error('Pick a valid photo date.');

  const raw = await readFileAsDataUrl(file);
  const shrunk = await downscaleDataUrl(raw);
  if (!shrunk.startsWith('data:image/')) throw new Error('Could not read that photo.');
  if (shrunk.length > MAX_PHOTO_CHARS) {
    throw new Error('That photo is too large even after resizing. Try a smaller image.');
  }

  return {
    id: makePhotoId(),
    date,
    dataUrl: shrunk,
    createdAt: Date.now()
  };
};
