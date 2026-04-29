import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock import.meta.env
vi.mock('../firebase', () => ({ auth: {}, db: {} }));

// We need to mock fetch before importing the module
global.fetch = vi.fn();

// Mock window.google
global.window = global.window || {};

describe('googleFitService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getToken', () => {
    it('returns null when no token stored', async () => {
      const { getToken } = await import('../utils/googleFitService');
      expect(getToken()).toBeNull();
    });

    it('returns null when token is expired', async () => {
      localStorageMock.setItem('gfit_token', 'abc123');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() - 1000));
      const { getToken } = await import('../utils/googleFitService');
      expect(getToken()).toBeNull();
    });

    it('returns token when valid', async () => {
      localStorageMock.setItem('gfit_token', 'abc123');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      const { getToken } = await import('../utils/googleFitService');
      expect(getToken()).toBe('abc123');
    });
  });

  describe('get7DayStepAverage', () => {
    it('returns average of non-zero days', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          bucket: [
            { dataset: [{ point: [{ value: [{ intVal: 8000 }] }] }] },
            { dataset: [{ point: [{ value: [{ intVal: 6000 }] }] }] },
            { dataset: [{ point: [] }] },
            { dataset: [{ point: [{ value: [{ intVal: 10000 }] }] }] },
          ]
        })
      });
      const { get7DayStepAverage } = await import('../utils/googleFitService');
      const result = await get7DayStepAverage();
      expect(result).toBe(8000); // (8000+6000+10000)/3
    });

    it('returns null when no step data', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ bucket: [{ dataset: [{ point: [] }] }] })
      });
      const { get7DayStepAverage } = await import('../utils/googleFitService');
      const result = await get7DayStepAverage();
      expect(result).toBeNull();
    });
  });

  describe('getRestingHeartRate', () => {
    it('returns 20th percentile of HR readings', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      // 10 readings: 55,60,65,70,75,80,85,90,95,100 → 20th percentile idx=2 → 65
      const points = [55,60,65,70,75,80,85,90,95,100].map(v => ({ value: [{ fpVal: v }] }));
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ point: points })
      });
      const { getRestingHeartRate } = await import('../utils/googleFitService');
      const result = await getRestingHeartRate();
      expect(result).toBe(65);
    });

    it('returns null when no HR data', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      global.fetch.mockResolvedValueOnce({ status: 200, json: async () => ({ point: [] }) });
      const { getRestingHeartRate } = await import('../utils/googleFitService');
      const result = await getRestingHeartRate();
      expect(result).toBeNull();
    });
  });

  describe('getSleepHistory', () => {
    it('returns array with date and hours for each bucket', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      const startMs = new Date('2026-03-21').getTime();
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          bucket: [
            {
              startTimeMillis: String(startMs),
              dataset: [{
                point: [{
                  startTimeNanos: String(startMs * 1000000),
                  endTimeNanos: String((startMs + 7.5 * 3600000) * 1000000)
                }]
              }]
            }
          ]
        })
      });
      const { getSleepHistory } = await import('../utils/googleFitService');
      const result = await getSleepHistory();
      expect(result).toHaveLength(1);
      expect(result[0].hours).toBe(7.5);
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getCaloriesBurned', () => {
    it('returns rounded calories burned', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          bucket: [{
            dataset: [{
              point: [{
                value: [{ fpVal: 2050.6 }]
              }]
            }]
          }]
        })
      });
      const { getCaloriesBurned } = await import('../utils/googleFitService');
      const result = await getCaloriesBurned();
      expect(result).toBe(2051);
    });

    it('returns null when no calorie data is available', async () => {
      localStorageMock.setItem('gfit_token', 'tok');
      localStorageMock.setItem('gfit_token_exp', String(Date.now() + 3600000));
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          bucket: [{
            dataset: [{
              point: []
            }]
          }]
        })
      });
      const { getCaloriesBurned } = await import('../utils/googleFitService');
      const result = await getCaloriesBurned();
      expect(result).toBeNull();
    });
  });
});
