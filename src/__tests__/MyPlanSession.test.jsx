import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyPlan from '../components/Dashboard/MyPlan';
import { getDoc } from 'firebase/firestore';
import { ACTIVE_SESSION_KEY } from '../utils/workoutSession';

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
          { name: 'Bench Press', sets: 2, reps: '8-10', rest: '60s', weight: '40kg' },
          { name: 'Shoulder Press', sets: 1, reps: 10, rest: '60s', weight: '20kg' },
        ],
      }
    ]
  }
};

const logCurrentSet = async (user, exerciseName) => {
  const dialog = screen.getByRole('dialog', { name: /Guided workout/i });
  const weight = within(dialog).getByLabelText(new RegExp(`Weight in kg for ${exerciseName}`, 'i'));
  const reps = within(dialog).getByLabelText(new RegExp(`Reps for ${exerciseName}`, 'i'));
  await user.clear(weight);
  await user.type(weight, '40');
  await user.clear(reps);
  await user.type(reps, '10');
  await user.click(within(dialog).getByRole('button', { name: /Log set/i }));
};

describe('MyPlan guided session integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ completedExercises: {}, weeklyPlans: {} }) });
  });

  it('launches a guided session from a training day', async () => {
    const user = userEvent.setup();
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);

    await user.click(await screen.findByTestId('start-session-day1'));

    const dialog = screen.getByRole('dialog', { name: /Guided workout: Upper Body Push/i });
    expect(within(dialog).getByTestId('ws-exercise-name')).toHaveTextContent('Bench Press');
    expect(within(dialog).getByTestId('ws-progress-label')).toHaveTextContent('0 / 3 sets');
  });

  it('keeps a partial session so it can be resumed', async () => {
    const user = userEvent.setup();
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);

    await user.click(await screen.findByTestId('start-session-day1'));
    await logCurrentSet(user, 'Bench Press');
    await user.click(screen.getByRole('button', { name: /Close guided session/i }));

    const resume = await screen.findByTestId('resume-session');
    expect(resume).toHaveTextContent('Resume Upper Body Push');
    expect(resume).toHaveTextContent('1 of 3 sets logged');

    await user.click(resume);
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('1 / 3 sets');
    expect(screen.getByLabelText(/Weight in kg for Bench Press/i)).toHaveValue(40);
  });

  it('marks every exercise done after finishing the session', async () => {
    const user = userEvent.setup();
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);

    await user.click(await screen.findByTestId('start-session-day1'));
    await logCurrentSet(user, 'Bench Press');
    await logCurrentSet(user, 'Bench Press');
    await logCurrentSet(user, 'Shoulder Press');

    expect(screen.getByTestId('ws-summary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByTestId('ws-summary')).not.toBeInTheDocument();
    const cached = JSON.parse(localStorage.getItem('novafit_cached_completed'));
    expect(cached).toMatchObject({ 'w1_day1_0': true, 'w1_day1_1': true });
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
});
