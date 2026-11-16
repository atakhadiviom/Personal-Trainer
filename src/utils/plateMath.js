// Plate math.
// Every other engine tells the athlete *what* to lift; this one tells them how to
// build it. From the load in the kg box, a barbell weight and a standard plate set,
// it returns the plates per side, the closest buildable weight when the target is not
// a real combination, and the neighbours on either side.
//
// Arithmetic runs in grams so 87.5 kg never turns into 87.49999999 in the UI.
export const BAR_WEIGHT_KEY = 'novafit_bar_kg';
export const BAR_WEIGHT_EVENT = 'novafit:bar-weight';
export const DEFAULT_BAR_KG = 20;
export const MIN_BAR_KG = 0;
export const MAX_BAR_KG = 30;
export const MAX_TARGET_KG = 500;

// One pair of each plate most commercial gyms stock, heaviest first.
export const PLATE_SET_KG = Object.freeze([25, 20, 15, 10, 5, 2.5, 1.25]);

export const BAR_OPTIONS = Object.freeze([
  { id: 'olympic', kg: 20, label: '20 kg', title: 'Olympic bar', detail: "Men's 2.2 m bar" },
  { id: 'womens', kg: 15, label: '15 kg', title: "Women's bar", detail: '15 kg Olympic bar' },
  { id: 'technique', kg: 10, label: '10 kg', title: 'Technique bar', detail: 'Junior or technique bar' },
  { id: 'ez', kg: 7, label: '7 kg', title: 'EZ curl bar', detail: 'Fixed curl bar' },
  { id: 'none', kg: 0, label: '0 kg', title: 'No bar', detail: 'Plate-loaded machine, plates only' }
]);

// Exercises where "plates per side" is the right instruction. Anything cable, machine,
// dumbbell or bodyweight is excluded first, so a misread never sends someone hunting
// for plates on a lat pulldown.
const NON_BARBELL = [
  'cable', 'machine', 'smith', 'dumbbell', 'db ', 'kettlebell', 'band', 'pulldown',
  'pushdown', 'pec deck', 'chest fly', 'fly ', 'leg press', 'hack squat', 'seated row',
  'hip abduction', 'hip adduction', 'leg extension', 'leg curl', 'preacher', 'sled',
  'prowler', 'plank', 'crunch', 'ab wheel', 'pull-up', 'pullup', 'chin-up', 'dip',
  'glute kickback', 'back extension', 'shrug machine', 'calves machine'
];

const BARBELL = [
  'bench press', 'squat', 'deadlift', 'rdl', 'romanian', 'overhead press', 'military press',
  'push press', 'strict press', 'barbell', 'back row', 'bent over row', 'pendlay', 't-bar',
  'clean', 'snatch', 'jerk', 'hip thrust', 'good morning', 'lunge', 'curl bar',
  'floor press', 'zercher', 'front rack'
];

const round2 = (n) => Math.round(n * 100) / 100;

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== 'string') return Number.NaN;
  const match = value.trim().replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.NaN;
};

// Accepts 20, "15", "20kg" or a preset id. Returns a usable bar weight or null.
export const parseBarWeight = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    const preset = BAR_OPTIONS.find(option => option.id === cleaned);
    if (preset) return preset.kg;
  }
  const num = toNumber(value);
  if (!Number.isFinite(num) || num < MIN_BAR_KG || num > MAX_BAR_KG) return null;
  return round2(num);
};

const safeStorage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export const getBarWeight = (storage = safeStorage()) => {
  if (!storage) return DEFAULT_BAR_KG;
  try {
    return parseBarWeight(storage.getItem(BAR_WEIGHT_KEY)) ?? DEFAULT_BAR_KG;
  } catch {
    return DEFAULT_BAR_KG;
  }
};

export const setBarWeight = (value, { storage = safeStorage() } = {}) => {
  const barKg = parseBarWeight(value) ?? DEFAULT_BAR_KG;
  if (storage) {
    try {
      storage.setItem(BAR_WEIGHT_KEY, String(barKg));
    } catch { /* storage unavailable — the session still reflects the choice */ }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BAR_WEIGHT_EVENT, { detail: { barKg } }));
  }
  return barKg;
};

export const onBarWeightChange = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback?.(event?.detail?.barKg ?? getBarWeight());
  const onStorage = (event) => {
    if (event?.key && event.key !== BAR_WEIGHT_KEY) return;
    callback?.(getBarWeight());
  };
  window.addEventListener(BAR_WEIGHT_EVENT, handler);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(BAR_WEIGHT_EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
};

// Splits one side of the bar into plates, biggest first. Greedy is exact for the
// canonical set because every smaller plate can always cover the remainder.
const splitSide = (gramsPerSide, plates) => {
  let remaining = gramsPerSide;
  const perSide = [];
  plates
    .map(plate => ({ kg: round2(plate), grams: Math.round(round2(plate) * 100) }))
    .sort((a, b) => b.grams - a.grams)
    .forEach(plate => {
      if (plate.grams <= 0) return;
      const count = Math.floor(remaining / plate.grams);
      if (count > 0) {
        perSide.push({ kg: plate.kg, count });
        remaining -= count * plate.grams;
      }
    });
  return { perSide, remaining };
};

// Everything the UI needs for one target weight, or null when nothing can be shown
// (bodyweight work, unreadable input, or a load that is not above the empty bar).
export const computePlateLoad = (targetKg, { barKg = DEFAULT_BAR_KG, plates = PLATE_SET_KG } = {}) => {
  const target = toNumber(targetKg);
  if (!Number.isFinite(target) || target <= 0 || target > MAX_TARGET_KG) return null;
  const bar = parseBarWeight(barKg) ?? DEFAULT_BAR_KG;
  if (target < bar) return null;
  if (target === bar) {
    return {
      barKg: bar,
      targetKg: round2(target),
      perSide: [],
      plateCount: 0,
      exact: true,
      buildableKg: bar,
      remainderKg: 0,
      lighterKg: null,
      heavierKg: null
    };
  }

  const usable = plates
    .map(plate => round2(Number(plate)))
    .filter(plate => Number.isFinite(plate) && plate > 0);
  if (!usable.length) return null;
  const smallest = Math.min(...usable);

  const sideGrams = Math.round(((target - bar) * 100) / 2);
  const { perSide, remaining } = splitSide(sideGrams, usable);
  const perSideKg = perSide.reduce((sum, plate) => sum + plate.kg * plate.count, 0);
  const buildableKg = round2(bar + perSideKg * 2);
  const exact = remaining === 0;

  return {
    barKg: bar,
    targetKg: round2(target),
    perSide,
    plateCount: perSide.reduce((sum, plate) => sum + plate.count * 2, 0),
    exact,
    buildableKg,
    remainderKg: exact ? 0 : round2(target - buildableKg),
    lighterKg: exact ? null : buildableKg,
    heavierKg: exact ? null : round2(buildableKg + smallest * 2)
  };
};

export const formatPlateSet = (plate) => (
  plate.count > 1 ? `${plate.count} × ${plate.kg}` : `${plate.kg}`
);

export const formatPlateList = (perSide = []) => perSide.map(formatPlateSet).join(' + ');

export const formatBarKg = (barKg) => `${round2(barKg)} kg`;

export const describePlateLoad = (load) => {
  if (!load) return '';
  if (!load.perSide.length) {
    return load.barKg === 0
      ? 'Empty bar — add plates and this updates.'
      : `Empty ${formatBarKg(load.barKg)} bar — add plates and this updates.`;
  }
  return `${formatPlateList(load.perSide)} per side${load.barKg > 0 ? ` on a ${formatBarKg(load.barKg)} bar` : ''}`;
};

// The one line under the rack. Non-buildable targets get honest neighbours instead
// of a silently rounded number.
export const plateLoadAdvice = (load) => {
  if (!load || !load.perSide.length) return '';
  if (load.exact) {
    return `${describePlateLoad(load)} → ${formatBarKg(load.buildableKg)}.`;
  }
  return `${formatBarKg(load.targetKg)} is not a buildable load. Build ${formatBarKg(load.buildableKg)} `
    + `(${formatPlateList(load.perSide)} per side) or ${formatBarKg(load.heavierKg)}.`;
};

// Sentence for a screen reader or a plain list row.
export const plateLoadLabel = (load) => {
  if (!load) return '';
  if (!load.perSide.length) return `Empty bar at ${formatBarKg(load.buildableKg)}.`;
  const pairs = load.perSide.map(plate => `${plate.count} ${plate.kg} kg plate${plate.count === 1 ? '' : 's'}`).join(', ');
  return `${pairs} per side on a ${formatBarKg(load.barKg)} bar — ${formatBarKg(load.buildableKg)} total.`;
};

export const isBarbellLift = (name) => {
  const text = ` ${String(name || '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim()} `;
  if (text.trim() === '') return false;
  if (NON_BARBELL.some(word => text.includes(word))) return false;
  return BARBELL.some(word => text.includes(word));
};
