// Subscription utilities for NovaFit Pro Tier ($9.99/mo)

export const PRO_PRICE_MONTHLY = 9.99;
export const PRO_PRICE_ANNUAL = 79.99;

export const PRO_FEATURES = Object.freeze([
  {
    id: 'ai-adjustments',
    title: 'Unlimited AI Workout Adjustments',
    description: 'Instant exercise swaps, automatic deload planning, and dynamic intensity adaptations powered by DeepSeek AI.',
    icon: 'zap',
    badge: 'Unlimited'
  },
  {
    id: 'biometrics',
    title: 'Deep Biometric Sleep & HRV Integration',
    description: 'Sync wearable sleep stages and heart rate variability (HRV) for an automated Daily Readiness Score that protects against overtraining.',
    icon: 'heart',
    badge: 'Real-Time'
  },
  {
    id: 'custom-macros',
    title: 'Custom Macro Targets & Meal Optimization',
    description: 'Fine-tune exact protein, carb, and fat distributions with automated refeed days and high-protein recipe recommendations.',
    icon: 'flame',
    badge: 'Precision'
  },
  {
    id: 'priority-coach',
    title: 'Priority 24/7 DeepSeek AI Coach',
    description: 'Sub-second response times, voice check-ins, and proactive recovery alerts before every gym session.',
    icon: 'sparkles',
    badge: 'Priority'
  }
]);

const STORAGE_KEY = 'novafit_pro_status';
const EVENT_NAME = 'novafit-subscription-change';

/**
 * Check if the user currently holds an active NovaFit Pro subscription.
 */
export const isProSubscriber = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.status === 'active';
  } catch {
    return false;
  }
};

/**
 * Get comprehensive subscription details.
 */
export const getSubscriptionDetails = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      isPro: false,
      tier: 'free',
      status: 'inactive',
      cycle: 'monthly',
      price: 0
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.status === 'active') {
        return {
          isPro: true,
          tier: 'pro',
          status: 'active',
          cycle: data.cycle || 'monthly',
          price: data.cycle === 'annual' ? PRO_PRICE_ANNUAL : PRO_PRICE_MONTHLY,
          activatedAt: data.activatedAt,
          renewsAt: data.renewsAt || 'Next billing cycle'
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    isPro: false,
    tier: 'free',
    status: 'inactive',
    cycle: 'monthly',
    price: 0
  };
};

/**
 * Activate or update NovaFit Pro subscription.
 */
export const upgradeToPro = (cycle = 'monthly') => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const now = new Date();
  const renewDate = new Date(now);
  if (cycle === 'annual') {
    renewDate.setFullYear(renewDate.getFullYear() + 1);
  } else {
    renewDate.setMonth(renewDate.getMonth() + 1);
  }

  const subscriptionData = {
    isPro: true,
    tier: 'pro',
    status: 'active',
    cycle,
    price: cycle === 'annual' ? PRO_PRICE_ANNUAL : PRO_PRICE_MONTHLY,
    activatedAt: now.toISOString(),
    renewsAt: renewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionData));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: subscriptionData }));
  return subscriptionData;
};

/**
 * Cancel or downgrade NovaFit Pro subscription to Free tier.
 */
export const cancelProSubscription = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { isPro: false, tier: 'free', status: 'inactive' } }));
  return true;
};

/**
 * Helper to subscribe to subscription changes.
 */
export const onSubscriptionChange = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback?.(event.detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
