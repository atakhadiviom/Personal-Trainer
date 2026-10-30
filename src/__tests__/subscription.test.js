import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

import {
  PRO_PRICE_MONTHLY,
  PRO_PRICE_ANNUAL,
  PRO_FEATURES,
  isProSubscriber,
  getSubscriptionDetails,
  upgradeToPro,
  cancelProSubscription,
  onSubscriptionChange
} from '../utils/subscription';

describe('NovaFit Pro Subscription Utility', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('defines pricing and key feature highlights', () => {
    expect(PRO_PRICE_MONTHLY).toBe(9.99);
    expect(PRO_PRICE_ANNUAL).toBe(79.99);
    expect(PRO_FEATURES.length).toBe(4);

    const featureIds = PRO_FEATURES.map(f => f.id);
    expect(featureIds).toContain('ai-adjustments');
    expect(featureIds).toContain('biometrics');
    expect(featureIds).toContain('custom-macros');
    expect(featureIds).toContain('priority-coach');
  });

  it('identifies non-subscribers by default', () => {
    expect(isProSubscriber()).toBe(false);
    const details = getSubscriptionDetails();
    expect(details.isPro).toBe(false);
    expect(details.tier).toBe('free');
  });

  it('upgrades user to monthly pro subscription', () => {
    const res = upgradeToPro('monthly');
    expect(res.tier).toBe('pro');
    expect(res.status).toBe('active');
    expect(res.cycle).toBe('monthly');
    expect(res.price).toBe(9.99);

    expect(isProSubscriber()).toBe(true);
    const details = getSubscriptionDetails();
    expect(details.isPro).toBe(true);
    expect(details.tier).toBe('pro');
    expect(details.cycle).toBe('monthly');
  });

  it('upgrades user to annual pro subscription', () => {
    const res = upgradeToPro('annual');
    expect(res.tier).toBe('pro');
    expect(res.status).toBe('active');
    expect(res.cycle).toBe('annual');
    expect(res.price).toBe(79.99);

    const details = getSubscriptionDetails();
    expect(details.isPro).toBe(true);
    expect(details.price).toBe(79.99);
  });

  it('cancels active pro subscription and returns to free tier', () => {
    upgradeToPro('monthly');
    expect(isProSubscriber()).toBe(true);

    const cancelled = cancelProSubscription();
    expect(cancelled).toBe(true);
    expect(isProSubscriber()).toBe(false);

    const details = getSubscriptionDetails();
    expect(details.isPro).toBe(false);
    expect(details.tier).toBe('free');
  });

  it('dispatches custom event on subscription change', () => {
    const listener = vi.fn();
    const unsub = onSubscriptionChange(listener);

    upgradeToPro('monthly');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ tier: 'pro', status: 'active' }));

    cancelProSubscription();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ tier: 'free', status: 'inactive' }));

    unsub();
  });
});
