import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutSession from '../components/Dashboard/WorkoutSession';
import { createSession, logSessionSet, ACTIVE_SESSION_KEY } from '../utils/workoutSession';
import { logSet } from '../utils/progressiveOverload';

const DAY = {
  id: 'day2',
  label: 'Upper Body Pull',
  exercises: [
    { name: 'Lat Pulldown', sets: 2, reps: '8-12', rest: '90s', weight: '40kg', guide: 'Drive elbows down to your ribs.' },
    { name: 'Cable Row', sets: 3, reps: '10-12', rest: '60s', weight: '30kg' }
  ]
};

const setup = (props = {}) => {
  const onLogSet = vi.fn();
  const onComplete = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <WorkoutSession
      day={DAY}
      setLog={{}}
      onLogSet={onLogSet}
      onComplete={onComplete}
      onClose={onClose}
      {...props}
    />
  );
  return { ...utils, onLogSet, onComplete, onClose };
};

const logSetViaForm = async (user, { weight, reps } = {}) => {
  if (weight !== undefined) {
    const field = screen.getByLabelText(/Weight in kg/i);
    await user.clear(field);
    await user.type(field, String(weight));
  }
  if (reps !== undefined) {
    const field = screen.getByLabelText(/^Reps for/i);
    await user.clear(field);
    await user.type(field, String(reps));
  }
  await user.click(screen.getByRole('button', { name: /Log set/i }));
};

describe('WorkoutSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens on the first exercise with the plan weight prefilled', () => {
    setup();
    expect(screen.getByRole('dialog', { name: /Guided workout: Upper Body Pull/i })).toBeInTheDocument();
    expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Lat Pulldown');
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('0 / 5 sets');
    expect(screen.getByLabelText(/Weight in kg for Lat Pulldown/i)).toHaveValue(40);
    expect(screen.getByLabelText(/Reps for Lat Pulldown/i)).toHaveValue(12);
    expect(screen.getByText(/Drive elbows down/i)).toBeInTheDocument();
  });

  it('logs a set, reports it upward and starts the rest countdown', async () => {
    const user = userEvent.setup();
    const { onLogSet } = setup();

    await logSetViaForm(user, { weight: 45, reps: 10 });

    expect(onLogSet).toHaveBeenCalledWith('Lat Pulldown', 45, 10);
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('1 / 5 sets');
    expect(screen.getByTestId('ws-rest')).toBeInTheDocument();
    expect(screen.getByTestId('ws-rest-time')).toHaveTextContent('01:30');
    expect(screen.getAllByTestId('ws-set-dot-done')).toHaveLength(1);
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeTruthy();
  });

  it('ignores impossible input', async () => {
    const user = userEvent.setup();
    const { onLogSet } = setup();

    await logSetViaForm(user, { weight: -5, reps: 10 });
    await logSetViaForm(user, { weight: 40, reps: 0 });

    expect(onLogSet).not.toHaveBeenCalled();
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('0 / 5 sets');
  });

  it('advances to the next exercise, then shows the summary', async () => {
    const user = userEvent.setup();
    const { onLogSet, onComplete, onClose } = setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    await logSetViaForm(user, { weight: 40, reps: 10 });

    expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Cable Row');
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('2 / 5 sets');

    await logSetViaForm(user, { weight: 30, reps: 12 });
    await logSetViaForm(user, { weight: 30, reps: 12 });
    await logSetViaForm(user, { weight: 30, reps: 12 });

    expect(onLogSet).toHaveBeenCalledTimes(5);
    expect(screen.getByTestId('ws-summary')).toBeInTheDocument();
    expect(screen.getByText('Session complete')).toBeInTheDocument();
    // 2 × 40×10 + 3 × 30×12 = 800 + 1080 = 1880 kg
    expect(screen.getByText('1.9t')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      dayId: 'day2', label: 'Upper Body Pull', sets: 5, complete: true
    });
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });

  it('flags new personal records in the summary', async () => {
    const user = userEvent.setup();
    const setLog = logSet({}, { exercise: 'Lat Pulldown', weightKg: 40, reps: 8 });
    const { onComplete } = setup({ setLog });

    await logSetViaForm(user, { weight: 50, reps: 10 });
    expect(screen.queryByTestId('ws-pr-banner')).not.toBeInTheDocument();

    await logSetViaForm(user, { weight: 50, reps: 10 });
    await logSetViaForm(user, { weight: 30, reps: 12 });
    await logSetViaForm(user, { weight: 30, reps: 12 });
    await logSetViaForm(user, { weight: 30, reps: 12 });

    expect(screen.getByTestId('ws-pr-banner')).toHaveTextContent('2 new personal records');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onComplete.mock.calls[0][0].prs).toBe(2);
  });

  it('can skip an exercise', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Skip exercise/i }));
    expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Cable Row');
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('0 / 5 sets');
  });

  it('saves a partial session from an early finish', async () => {
    const user = userEvent.setup();
    const { onComplete } = setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    await user.click(screen.getByRole('button', { name: /Finish early/i }));

    expect(screen.getByText('Partial session saved')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ sets: 1, complete: false });
  });

  it('undoes the last logged set', async () => {
    const user = userEvent.setup();
    setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('1 / 5 sets');

    await user.click(screen.getByRole('button', { name: /Undo set/i }));
    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('0 / 5 sets');
  });

  it('hides the rest dock when the athlete skips rest', async () => {
    const user = userEvent.setup();
    setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    expect(screen.getByTestId('ws-rest')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Skip rest/i }));
    expect(screen.queryByTestId('ws-rest')).not.toBeInTheDocument();
  });

  it('resumes an in-progress session', () => {
    const resumed = logSessionSet(createSession(DAY), { weightKg: 45, reps: 9 });
    setup({ day: null, initialSession: resumed });

    expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('1 / 5 sets');
    expect(screen.getByLabelText(/Weight in kg for Lat Pulldown/i)).toHaveValue(45);
    expect(screen.getByLabelText(/Reps for Lat Pulldown/i)).toHaveValue(9);
  });

  it('closes from the header without losing the session', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    await user.click(screen.getByRole('button', { name: /Close guided session/i }));

    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toContain('Lat Pulldown');
  });

  it('autoregulates the next set from the RPE of the set just logged', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText(/^Reps for/i));
    await user.type(screen.getByLabelText(/^Reps for/i), '12');
    await user.click(screen.getByRole('button', { name: 'RPE 8' }));
    expect(screen.getByRole('button', { name: 'RPE 8' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /Log set/i }));

    expect(screen.getByTestId('ws-auto')).toHaveTextContent('Auto-regulated next set');
    expect(screen.getByTestId('ws-auto')).toHaveTextContent('45 kg × 8');
    expect(screen.getByLabelText(/Weight in kg for Lat Pulldown/i)).toHaveValue(45);
    expect(screen.getByLabelText(/Reps for Lat Pulldown/i)).toHaveValue(8);
    // The choice resets so it never silently applies to a later set.
    expect(screen.getByRole('button', { name: 'RPE 8' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows no autoregulation banner for a set logged without RPE', async () => {
    const user = userEvent.setup();
    setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });

    expect(screen.queryByTestId('ws-auto')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Weight in kg for Lat Pulldown/i)).toHaveValue(40);
  });

  it('lets the athlete clear an RPE choice', async () => {
    const user = userEvent.setup();
    setup();

    const chip = screen.getByRole('button', { name: 'RPE 9' });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
});
