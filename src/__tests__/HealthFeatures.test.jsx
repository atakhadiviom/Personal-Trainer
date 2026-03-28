import { describe, it, expect } from 'vitest';

// ── Pure logic functions (extracted for testing) ──────────────────────────────

const getReadinessInfo = (sleepHrs, restingHR, baselineHR) => {
  const numHrs = parseFloat(sleepHrs || 0);
  const hrElevated = restingHR && baselineHR && restingHR > baselineHR * 1.10;
  if (hrElevated && numHrs < 6) return { color: '#ff6b6b', label: '⚠️ High HR + Low Sleep — Rest Day Recommended' };
  if (numHrs >= 7) return { color: 'green', label: 'Optimal Readiness' };
  if (numHrs >= 5.5) return { color: 'orange', label: 'Moderate Readiness' };
  return { color: '#ff6b6b', label: 'Low Readiness — Consider Active Recovery' };
};

const getHydrationTarget = (caloriesBurned) => {
  const base = 2.5;
  return caloriesBurned > 500 ? base + 0.5 : base;
};

const getStepCalories = (steps) => Math.round((steps || 0) * 0.04);

const shouldShowInactivityNudge = (steps, avg7Day, hourNow, dismissed) => {
  if (dismissed) return false;
  if (hourNow < 18) return false;
  if (!avg7Day || avg7Day === 0) return false;
  return steps < avg7Day * 0.6;
};

const detectPlateau = (avgIntake, targetCals, hasRealTDEE) => {
  if (!hasRealTDEE || !avgIntake || !targetCals) return false;
  return avgIntake > targetCals * 0.95;
};

const getChronotype = (avgSleepHours) => {
  if (avgSleepHours >= 8) return { label: 'Night Owl', time: '5–7 PM' };
  if (avgSleepHours >= 7) return { label: 'Flexible', time: 'Any time' };
  return { label: 'Early Bird', time: '7–9 AM' };
};

const getRecoveryInsight = (avgSleepHours) => {
  if (avgSleepHours >= 7) return 'Great recovery week — push hard';
  if (avgSleepHours >= 5.5) return 'Moderate recovery — stay consistent';
  return 'Poor sleep trend — reduce intensity';
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Readiness Badge Logic', () => {
  it('returns green for 7+ hours sleep', () => {
    const r = getReadinessInfo('7.5', null, null);
    expect(r.label).toBe('Optimal Readiness');
    expect(r.color).toBe('green');
  });

  it('returns amber for 5.5-7 hours sleep', () => {
    const r = getReadinessInfo('6.0', null, null);
    expect(r.label).toBe('Moderate Readiness');
    expect(r.color).toBe('orange');
  });

  it('returns red for under 5.5 hours sleep', () => {
    const r = getReadinessInfo('5.0', null, null);
    expect(r.label).toContain('Low Readiness');
    expect(r.color).toBe('#ff6b6b');
  });

  it('returns rest day warning when HR elevated AND sleep low', () => {
    const r = getReadinessInfo('5.0', 88, 78); // 88 > 78*1.10=85.8
    expect(r.label).toContain('Rest Day Recommended');
    expect(r.color).toBe('#ff6b6b');
  });

  it('does NOT trigger rest day warning when HR elevated but sleep ok', () => {
    const r = getReadinessInfo('7.5', 88, 78);
    expect(r.label).toBe('Optimal Readiness');
  });

  it('does NOT trigger rest day warning when HR normal even if sleep low', () => {
    const r = getReadinessInfo('5.0', 80, 78); // 80 < 78*1.10=85.8
    expect(r.label).toContain('Low Readiness');
    expect(r.label).not.toContain('Rest Day');
  });
});

describe('Hydration Target', () => {
  it('returns 2.5L as base target', () => {
    expect(getHydrationTarget(300)).toBe(2.5);
  });

  it('returns 3.0L when calories burned exceeds 500', () => {
    expect(getHydrationTarget(600)).toBe(3.0);
  });

  it('returns 3.0L at exactly 501 calories', () => {
    expect(getHydrationTarget(501)).toBe(3.0);
  });

  it('returns 2.5L at exactly 500 calories', () => {
    expect(getHydrationTarget(500)).toBe(2.5);
  });
});

describe('Step Calories Calculation', () => {
  it('calculates 0.04 kcal per step', () => {
    expect(getStepCalories(10000)).toBe(400);
  });

  it('returns 0 for null steps', () => {
    expect(getStepCalories(null)).toBe(0);
  });

  it('returns 0 for zero steps', () => {
    expect(getStepCalories(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(getStepCalories(7500)).toBe(300);
  });
});

describe('Inactivity Nudge Logic', () => {
  it('shows nudge after 6pm when steps below 60% of average', () => {
    expect(shouldShowInactivityNudge(3000, 8000, 19, false)).toBe(true);
  });

  it('does not show nudge before 6pm', () => {
    expect(shouldShowInactivityNudge(3000, 8000, 15, false)).toBe(false);
  });

  it('does not show nudge when steps are sufficient', () => {
    expect(shouldShowInactivityNudge(6000, 8000, 19, false)).toBe(false); // 6000 > 8000*0.6=4800
  });

  it('does not show nudge when dismissed', () => {
    expect(shouldShowInactivityNudge(3000, 8000, 19, true)).toBe(false);
  });

  it('does not show nudge when no 7-day average available', () => {
    expect(shouldShowInactivityNudge(3000, null, 19, false)).toBe(false);
  });

  it('shows nudge at exactly the 6pm threshold', () => {
    expect(shouldShowInactivityNudge(3000, 8000, 18, false)).toBe(true);
  });
});

describe('Plateau Detection', () => {
  it('detects plateau when intake consistently near target', () => {
    expect(detectPlateau(1950, 2000, true)).toBe(true); // 1950 > 2000*0.95=1900
  });

  it('does not flag plateau when intake is below 95% of target', () => {
    expect(detectPlateau(1800, 2000, true)).toBe(false); // 1800 < 1900
  });

  it('does not flag plateau without real TDEE data', () => {
    expect(detectPlateau(1950, 2000, false)).toBe(false);
  });

  it('does not flag with missing values', () => {
    expect(detectPlateau(null, 2000, true)).toBe(false);
    expect(detectPlateau(1950, null, true)).toBe(false);
  });
});

describe('Chronotype Scheduling', () => {
  it('recommends evening training for 8+ hrs sleepers (Night Owl)', () => {
    const r = getChronotype(8.5);
    expect(r.label).toBe('Night Owl');
    expect(r.time).toBe('5–7 PM');
  });

  it('recommends flexible training for 7-8 hrs sleepers', () => {
    const r = getChronotype(7.5);
    expect(r.label).toBe('Flexible');
    expect(r.time).toBe('Any time');
  });

  it('recommends morning training for under 7 hrs sleepers', () => {
    const r = getChronotype(6.0);
    expect(r.label).toBe('Early Bird');
    expect(r.time).toBe('7–9 AM');
  });
});

describe('Recovery Insight Text', () => {
  it('shows push hard message for great recovery', () => {
    expect(getRecoveryInsight(7.5)).toBe('Great recovery week — push hard');
  });

  it('shows moderate message for 5.5-7 hrs', () => {
    expect(getRecoveryInsight(6.5)).toBe('Moderate recovery — stay consistent');
  });

  it('shows reduce intensity for under 5.5 hrs', () => {
    expect(getRecoveryInsight(5.0)).toBe('Poor sleep trend — reduce intensity');
  });
});
