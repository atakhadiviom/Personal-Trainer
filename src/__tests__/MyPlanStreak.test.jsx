import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MyPlan from '../components/Dashboard/MyPlan';
import { getDoc, updateDoc } from 'firebase/firestore';
import { ACTIVITY_LOG_KEY, toDateKey } from '../utils/streaks';

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  aiInstance: {}
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/aiModel', () => ({ getAIModel: vi.fn() }));
vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleep: vi.fn(() => Promise.resolve(null)),
  getRestingHeartRate: vi.fn(() => Promise.resolve(null)),
  getSteps: vi.fn(() => Promise.resolve(null)),
  getCaloriesBurned: vi.fn(() => Promise.resolve(null)),
  get7DayStepAverage: vi.fn(() => Promise.resolve(null)),
}));

const mockPlan = {
  workout: {
    schedule: [
      {
        id: 'day1',
        label: 'Upper Body Push',
        warmup: [],
        cooldown: [],
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, rest: '60s', weight: '40kg' },
          { name: 'Shoulder Press', sets: 3, reps: 10, rest: '60s', weight: '20kg' },
        ],
      }
    ]
  }
};

const settle = () => act(async () => { await vi.runAllTimersAsync(); });

describe('MyPlan workout streak integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ completedExercises: {}, weeklyPlans: {} }) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the streak card on the plan', async () => {
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);
    await settle();
    expect(screen.getByTestId('streak-card')).toBeInTheDocument();
    expect(screen.getByTestId('streak-current')).toHaveTextContent('0 workout streak');
  });

  it('records today as a workout day when an exercise is completed and syncs it', async () => {
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);
    await settle();

    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    await settle();

    const todayKey = toDateKey(new Date());
    expect(screen.getByTestId('streak-current')).toHaveTextContent('1 workout streak');
    expect(screen.getByTestId('recovery-advice')).toHaveClass('status-recover');

    const stored = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY));
    expect(stored[todayKey]).toEqual({ exercises: 2, labels: ['Upper Body Push'] });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc.mock.calls[0][1].activityLog[todayKey].exercises).toBe(2);
  });

  it('does not count un-ticking an exercise as another workout', async () => {
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);
    await settle();

    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[0]);
    await settle();

    const stored = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY));
    expect(stored[toDateKey(new Date())].exercises).toBe(1);
  });

  it('merges the cloud activity log with the offline cache on load', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify({ [toDateKey(twoDaysAgo)]: { exercises: 3, labels: ['Pull'] } }));
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        completedExercises: {},
        weeklyPlans: {},
        activityLog: { [toDateKey(yesterday)]: { exercises: 4, labels: ['Lower Body'] } }
      })
    });

    render(<MyPlan aiPlan={mockPlan} formData={{}} />);
    await settle();

    expect(screen.getByTestId('streak-current')).toHaveTextContent('2 workout streak');
    const stored = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY));
    expect(Object.keys(stored)).toHaveLength(2);
  });
});
