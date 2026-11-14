// Gym load steps.
// Every load suggestion in the app (next-set autoregulation, next-session targets and
// deloads) is rounded to a weight the athlete can actually build. The smallest jump in
// their gym is the input: a bar with fractional plates moves in 1.25 kg, a fixed
// dumbbell rack in 2 kg, a standard bar in 2.5 kg, and a selectorised machine stack in
// 5 kg. One preference, stored on the device, read by every engine.
export const LOAD_STEP_KEY = 'novafit_load_step';
export const LOAD_STEP_EVENT = 'novafit:load-step';
export const DEFAULT_STEP_KG = 2.5;
export const MIN_STEP_KG = 0.5;
export const MAX_STEP_KG = 25;

export const LOAD_STEP_OPTIONS = Object.freeze([
  { id: 'fractional', kg: 1.25, label: '1.25 kg', title: 'Fractional plates', detail: 'Microplates for slow strength pushes' },
  { id: 'dumbbell', kg: 2, label: '2 kg', title: 'Dumbbell rack', detail: 'Fixed dumbbells in 2 kg pairs' },
  { id: 'standard', kg: 2.5, label: '2.5 kg', title: 'Standard bar', detail: 'One 1.25 kg plate per side' },
  { id: 'stack', kg: 5, label: '5 kg', title: 'Machine stack', detail: 'Selector pin or big plate jumps' }
]);

const round2 = (n) => Math.round(n * 100) / 100;

// Accepts 1.25, "2.5", "5kg" or a preset id. Returns a usable step or null.
export const parseLoadStep = (value) => {
  if (value === null || value === undefined || value === '') return null;
  let num = Number.NaN;
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    const preset = LOAD_STEP_OPTIONS.find(option => option.id === cleaned);
    if (preset) return preset.kg;
    const match = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (match) num = Number(match[1].replace(',', '.'));
  } else {
    num = Number(value);
  }
  if (!Number.isFinite(num) || num < MIN_STEP_KG || num > MAX_STEP_KG) return null;
  return round2(num);
};

const safeStorage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

// The athlete's smallest jump, always a valid weight step.
export const getLoadStep = (storage = safeStorage()) => {
  if (!storage) return DEFAULT_STEP_KG;
  try {
    return parseLoadStep(storage.getItem(LOAD_STEP_KEY)) ?? DEFAULT_STEP_KG;
  } catch {
    return DEFAULT_STEP_KG;
  }
};

// Saves the preference and notifies every mounted card. Returns the stored step.
export const setLoadStep = (value, { storage = safeStorage() } = {}) => {
  const step = parseLoadStep(value) ?? DEFAULT_STEP_KG;
  if (storage) {
    try {
      storage.setItem(LOAD_STEP_KEY, String(step));
    } catch { /* storage unavailable — the UI still reflects the chosen step */ }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOAD_STEP_EVENT, { detail: { step } }));
  }
  return step;
};

export const onLoadStepChange = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback?.(event?.detail?.step ?? getLoadStep());
  // `storage` fires in other tabs, so a change there keeps this tab honest.
  const onStorage = (event) => {
    if (event?.key && event.key !== LOAD_STEP_KEY) return;
    callback?.(getLoadStep());
  };
  window.addEventListener(LOAD_STEP_EVENT, handler);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(LOAD_STEP_EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
};

// Rounds a load to the nearest buildable weight.
// direction: 'nearest' (default) | 'down' (never above the target) | 'up' (never below).
export const roundToStep = (kg, step = DEFAULT_STEP_KG, direction = 'nearest') => {
  const weight = Number(kg);
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  const ratio = weight / jump;
  const units = direction === 'down' ? Math.floor(ratio) : direction === 'up' ? Math.ceil(ratio) : Math.round(ratio);
  return round2(units * jump);
};

export const describeLoadStep = (step = DEFAULT_STEP_KG) => {
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  const preset = LOAD_STEP_OPTIONS.find(option => option.kg === jump);
  return preset ? `${preset.label} jumps` : `${round2(jump)} kg jumps`;
};

export const loadStepTitle = (step = DEFAULT_STEP_KG) => {
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  const preset = LOAD_STEP_OPTIONS.find(option => option.kg === jump);
  return preset ? preset.title : `${round2(jump)} kg jumps`;
};
