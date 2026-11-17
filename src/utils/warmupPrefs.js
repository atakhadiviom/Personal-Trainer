// Per-exercise warm-up volume.
// A bench press and a lateral raise should not get the same warm-up. The athlete picks
// a mode in the guided session and the choice follows that exercise to every future
// session on this device: a name-keyed map in localStorage, nothing sent to the server.
import { DEFAULT_WARMUP_MODE, isWarmupMode } from './warmupRamp';

export const WARMUP_PREFS_KEY = 'novafit_warmup_modes';
// A generous cap that still cannot grow without bound on a shared phone.
export const MAX_WARMUP_PREFS = 200;

const safeStorage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

// Same lift, same preference: case, padding and double spaces never split a key.
export const normalizeExerciseName = (name) => (
  typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toLowerCase() : ''
);

export const readWarmupModes = (storage = safeStorage()) => {
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(WARMUP_PREFS_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean = {};
    Object.entries(parsed).forEach(([name, mode]) => {
      const key = normalizeExerciseName(name);
      if (key && isWarmupMode(mode)) clean[key] = mode;
    });
    return clean;
  } catch {
    return {};
  }
};

export const getWarmupMode = (exerciseName, storage = safeStorage()) => {
  const key = normalizeExerciseName(exerciseName);
  if (!key) return DEFAULT_WARMUP_MODE;
  return readWarmupModes(storage)[key] ?? DEFAULT_WARMUP_MODE;
};

// Saves the choice and returns the mode actually stored. Re-setting an exercise moves
// it to the newest slot so the cap drops the least recently used preference.
export const setWarmupMode = (exerciseName, mode, { storage = safeStorage() } = {}) => {
  const key = normalizeExerciseName(exerciseName);
  const value = isWarmupMode(mode) ? mode : DEFAULT_WARMUP_MODE;
  if (!key || !storage) return value;
  try {
    const modes = readWarmupModes(storage);
    delete modes[key];
    modes[key] = value;
    const keys = Object.keys(modes);
    const trimmed = keys.slice(Math.max(0, keys.length - MAX_WARMUP_PREFS));
    const next = {};
    trimmed.forEach(name => { next[name] = modes[name]; });
    storage.setItem(WARMUP_PREFS_KEY, JSON.stringify(next));
  } catch { /* storage unavailable — the open session still uses the chosen mode */ }
  return value;
};

export const clearWarmupMode = (exerciseName, { storage = safeStorage() } = {}) => {
  const key = normalizeExerciseName(exerciseName);
  if (!key || !storage) return false;
  try {
    const modes = readWarmupModes(storage);
    if (!(key in modes)) return false;
    delete modes[key];
    storage.setItem(WARMUP_PREFS_KEY, JSON.stringify(modes));
    return true;
  } catch {
    return false;
  }
};
