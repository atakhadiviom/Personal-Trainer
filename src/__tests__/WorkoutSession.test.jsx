import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutSession from '../components/Dashboard/WorkoutSession';
import { createSession, logSessionSet, loadActiveSession, ACTIVE_SESSION_KEY } from '../utils/workoutSession';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

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

  it('prefills the next load on the gym\'s own jump', () => {
    localStorage.setItem('novafit_load_step', '5');
    const date = toDateKey(new Date());
    setup({
      setLog: {
        'lat pulldown': { exercise: 'Lat Pulldown', sets: [{ date, weightKg: 40, reps: 12 }] }
      }
    });

    expect(screen.getByTestId('ws-jump')).toHaveTextContent('5 kg jumps');
    // Top of the 8–12 range at 40 kg → 45 kg on a 5 kg machine stack.
    expect(screen.getByLabelText(/Weight in kg for Lat Pulldown/i)).toHaveValue(45);
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

  it('ramps the working weight before the first set', () => {
    setup();

    const card = screen.getByTestId('ws-warm');
    expect(card).toHaveTextContent('Warm-up ramp');
    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('0 / 3 done');

    // 40 kg on a 2.5 kg bar: 50 % → 20, 70 % → 27.5, 85 % → 32.5, rounded down.
    const rungs = screen.getAllByTestId('ws-warm-rung');
    expect(rungs).toHaveLength(3);
    expect(rungs[0]).toHaveTextContent('20 kg × 5');
    expect(rungs[1]).toHaveTextContent('27.5 kg × 3');
    expect(rungs[2]).toHaveTextContent('32.5 kg × 2');
    expect(rungs[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('ticks ramp sets and keeps them across a session restore', async () => {
    const user = userEvent.setup();
    const { unmount } = setup();

    await user.click(screen.getByRole('button', { name: /Warm-up 20 kg × 5/i }));
    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('1 / 3 done');
    expect(screen.getByRole('button', { name: /Warm-up 20 kg × 5/i })).toHaveAttribute('aria-pressed', 'true');

    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
    expect(stored.exercises[0].warmupDone).toEqual(['ramp50']);

    unmount();
    const restored = loadActiveSession();
    setup({ day: null, initialSession: restored });
    expect(screen.getByRole('button', { name: /Warm-up 20 kg × 5/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('1 / 3 done');
  });

  it('marks the ramp ready to work once every rung is ticked', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Warm-up 20 kg × 5/i }));
    await user.click(screen.getByRole('button', { name: /Warm-up 27.5 kg × 3/i }));
    await user.click(screen.getByRole('button', { name: /Warm-up 32.5 kg × 2/i }));

    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('ready to work');
    expect(screen.getByTestId('ws-warm')).toHaveClass('is-complete');
  });

  it('drops the ramp once the first work set is logged', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByTestId('ws-warm')).toBeInTheDocument();
    await logSetViaForm(user, { weight: 40, reps: 10 });
    expect(screen.queryByTestId('ws-warm')).not.toBeInTheDocument();
  });

  it('lets the athlete skip the ramp', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /No warm-up today/i }));
    expect(screen.queryByTestId('ws-warm')).not.toBeInTheDocument();
  });

  it('switches a lift to a single primer and remembers the choice', async () => {
    const user = userEvent.setup();
    const { unmount } = setup();

    expect(screen.getByRole('button', { name: 'Full ramp' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '1 primer' }));

    const rungs = screen.getAllByTestId('ws-warm-rung');
    expect(rungs).toHaveLength(1);
    expect(rungs[0]).toHaveTextContent('32.5 kg × 2');
    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('0 / 1 done');
    expect(screen.getByTestId('ws-warm')).toHaveTextContent('Warm-up primer');
    expect(JSON.parse(localStorage.getItem('novafit_warmup_modes'))).toEqual({ 'lat pulldown': 'primer' });

    // A fresh player on the same device opens the lift with the primer already set.
    unmount();
    setup();
    expect(screen.getByRole('button', { name: '1 primer' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('ws-warm-rung')).toHaveLength(1);
  });

  it('keeps warm-up volume per exercise, not per session', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: '1 primer' }));
    await logSetViaForm(user, { weight: 40, reps: 10 });
    await logSetViaForm(user, { weight: 40, reps: 10 });

    expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Cable Row');
    expect(screen.getByRole('button', { name: 'Full ramp' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('ws-warm-rung')).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem('novafit_warmup_modes'))).toEqual({ 'lat pulldown': 'primer' });
  });

  it('turns warm-up off for one lift and back on', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Off' }));
    expect(screen.queryByTestId('ws-warm')).not.toBeInTheDocument();
    expect(screen.getByTestId('ws-warm-status')).toHaveTextContent('Off for this exercise');
    expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Full ramp' }));
    expect(screen.getByTestId('ws-warm')).toBeInTheDocument();
    expect(screen.getAllByTestId('ws-warm-rung')).toHaveLength(3);
    expect(screen.queryByTestId('ws-warm-status')).not.toBeInTheDocument();
  });

  it('brings the ramp back after a one-off skip', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /No warm-up today/i }));
    expect(screen.getByTestId('ws-warm-status')).toHaveTextContent('Skipped today');

    await user.click(screen.getByRole('button', { name: 'Full ramp' }));
    expect(screen.getByTestId('ws-warm')).toBeInTheDocument();
    expect(screen.getAllByTestId('ws-warm-rung')).toHaveLength(3);
  });

  it('shows no warm-up switch on bodyweight work', () => {
    setup({
      day: { id: 'day3', label: 'Bodyweight', exercises: [{ name: 'Push-up', sets: 3, reps: '10-15' }] }
    });
    expect(screen.queryByTestId('ws-warm-modes')).not.toBeInTheDocument();
  });

  it('rebuilds the ramp for the next exercise\'s own weight', async () => {
    const user = userEvent.setup();
    setup();

    await logSetViaForm(user, { weight: 40, reps: 10 });
    await logSetViaForm(user, { weight: 40, reps: 10 });

    expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Cable Row');
    const rungs = screen.getAllByTestId('ws-warm-rung');
    // 30 kg on a 2.5 kg bar: 15, 20, 25.
    expect(rungs[0]).toHaveTextContent('15 kg × 5');
    expect(rungs[1]).toHaveTextContent('20 kg × 3');
    expect(rungs[2]).toHaveTextContent('25 kg × 2');
    expect(screen.getByTestId('ws-warm-count')).toHaveTextContent('0 / 3 done');
  });

  it('follows the gym jump set in the profile', () => {
    localStorage.setItem('novafit_load_step', '5');
    setup();

    const rungs = screen.getAllByTestId('ws-warm-rung');
    expect(rungs.map(rung => rung.textContent)).toEqual([
      expect.stringContaining('20 kg × 5'),
      expect.stringContaining('25 kg × 3'),
      expect.stringContaining('30 kg × 2')
    ]);
  });

  it('follows the weight the athlete is about to lift', async () => {
    const user = userEvent.setup();
    setup();

    const field = screen.getByLabelText(/Weight in kg for Lat Pulldown/i);
    await user.clear(field);
    await user.type(field, '60');

    const rungs = screen.getAllByTestId('ws-warm-rung');
    expect(rungs[0]).toHaveTextContent('30 kg × 5');
    expect(rungs[1]).toHaveTextContent('40 kg × 3');
    expect(rungs[2]).toHaveTextContent('50 kg × 2');
    expect(screen.getByTestId('ws-warm')).toHaveTextContent('Ramp to 60 kg');
  });

  it('shows no ramp for bodyweight work or a weight too light to build one', () => {    const { unmount } = setup({
      day: { id: 'day3', label: 'Bodyweight', exercises: [{ name: 'Push-up', sets: 3, reps: '10-15' }] }
    });
    expect(screen.queryByTestId('ws-warm')).not.toBeInTheDocument();
    unmount();

    setup({
      day: { id: 'day4', label: 'Arms', exercises: [{ name: 'Curl', sets: 3, reps: '12-15', weight: '5kg' }] }
    });
    expect(screen.queryByTestId('ws-warm')).not.toBeInTheDocument();
  });

  it('shows the plates to load on a barbell lift and follows the typed weight', async () => {
    const user = userEvent.setup();
    setup({
      day: {
        id: 'day5',
        label: 'Barbell Strength',
        exercises: [{ name: 'Barbell Bench Press', sets: 3, reps: '5', rest: '150s', weight: '100kg' }]
      }
    });

    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent('25 + 15 per side on a 20 kg bar → 100 kg.');

    const field = screen.getByLabelText(/Weight in kg for Barbell Bench Press/i);
    await user.clear(field);
    await user.type(field, '87.5');

    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent('25 + 5 + 2.5 + 1.25 per side on a 20 kg bar');
  });

  it('offers no plate maths on cable work', () => {
    setup();
    expect(screen.queryByTestId('ws-plates')).not.toBeInTheDocument();
  });

  describe('busy rack substitution', () => {
    const PUSH_DAY = {
      id: 'day6',
      label: 'Barbell Strength',
      exercises: [
        {
          name: 'Barbell Bench Press',
          sets: 3,
          reps: '5',
          rest: '150s',
          weight: '100kg',
          guide: 'Tuck the elbows to 45°.'
        },
        { name: 'Cable Row', sets: 2, reps: '10-12', rest: '60s', weight: '30kg' }
      ]
    };

    const openSwaps = async (user) => {
      await user.click(screen.getByRole('button', { name: /Rack.s busy/i }));
      return screen.getByTestId('ws-swap-panel');
    };

    it('keeps the swap offer closed until the athlete needs it', () => {
      setup({ day: PUSH_DAY });
      const button = screen.getByRole('button', { name: /Rack.s busy/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('ws-swap-panel')).not.toBeInTheDocument();
    });

    it('lists same-pattern lifts on different kit with a starting load', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });
      const panel = await openSwaps(user);

      expect(panel).toHaveTextContent('Horizontal push · different kit');
      const names = screen.getAllByRole('button', { name: /^Swap to / }).map(button => button.getAttribute('aria-label'));
      expect(names).toEqual([
        'Swap to Dumbbell Bench Press',
        'Swap to Standing Cable Chest Press',
        'Swap to Chest Press Machine'
      ]);
      expect(screen.getAllByTestId('ws-swap-load').map(node => node.textContent)).toEqual([
        '≈ 2 × 37.5 kg',
        '≈ 90 kg',
        '≈ 100 kg'
      ]);
      expect(panel).toHaveTextContent('3 × 5 and 150s rest carry over');
    });

    it('follows the weight in the box, not the plan string', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });

      const field = screen.getByLabelText(/Weight in kg for Barbell Bench Press/i);
      await user.clear(field);
      await user.type(field, '60');
      await openSwaps(user);

      expect(screen.getAllByTestId('ws-swap-load')[0]).toHaveTextContent('≈ 2 × 22.5 kg');
    });

    it('swaps the lift and keeps sets, reps, rest and progress', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });
      await openSwaps(user);

      await user.click(screen.getByRole('button', { name: 'Swap to Dumbbell Bench Press' }));

      expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Dumbbell Bench Press');
      expect(screen.getByLabelText(/Weight in kg for Dumbbell Bench Press/i)).toHaveValue(75);
      expect(screen.getByLabelText(/^Reps for/i)).toHaveValue(5);
      expect(screen.getByText(/Press both bells from chest level/i)).toBeInTheDocument();
      expect(screen.getByText('3 × 5', { exact: false })).toBeInTheDocument();
      expect(screen.getByText(/rest 150s/i)).toBeInTheDocument();
      expect(screen.getByTestId('ws-progress-label')).toHaveTextContent('0 / 5 sets');
      // The closed panel leaves no swap button behind, only the undo strip.
      expect(screen.queryByTestId('ws-swap-panel')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Rack.s busy/i })).not.toBeInTheDocument();
    });

    it('labels the swap and puts the plan lift back in one tap', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });
      await openSwaps(user);
      await user.click(screen.getByRole('button', { name: 'Swap to Dumbbell Bench Press' }));

      const status = screen.getByTestId('ws-swap-status');
      expect(status).toHaveTextContent('Swapped from Barbell Bench Press');

      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Barbell Bench Press');
      expect(screen.getByLabelText(/Weight in kg for Barbell Bench Press/i)).toHaveValue(100);
      expect(screen.queryByTestId('ws-swap-status')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rack.s busy/i })).toBeInTheDocument();
    });

    it('rebuilds the warm-up ramp for the substitute\'s own load', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });

      expect(screen.getByTestId('ws-warm')).toHaveTextContent('Ramp to 100 kg');
      await openSwaps(user);
      await user.click(screen.getByRole('button', { name: 'Swap to Dumbbell Bench Press' }));

      const rungs = screen.getAllByTestId('ws-warm-rung');
      expect(rungs.map(rung => rung.textContent)).toEqual([
        expect.stringContaining('37.5 kg × 5'),
        expect.stringContaining('52.5 kg × 3'),
        expect.stringContaining('62.5 kg × 2')
      ]);
    });

    it('stops offering a swap once the first set is logged', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });

      expect(screen.getByRole('button', { name: /Rack.s busy/i })).toBeInTheDocument();
      await logSetViaForm(user, { weight: 100, reps: 5 });
      expect(screen.queryByTestId('ws-swap')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Rack.s busy/i })).not.toBeInTheDocument();
    });

    it('closes the swap panel from its × without changing the lift', async () => {
      const user = userEvent.setup();
      setup({ day: PUSH_DAY });
      await openSwaps(user);

      await user.click(screen.getByRole('button', { name: /Close swap options/i }));
      expect(screen.queryByTestId('ws-swap-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('ws-exercise-name')).toHaveTextContent('Barbell Bench Press');
    });

    it('shows nothing for cardio or a lift it cannot place', () => {
      setup({
        day: {
          id: 'day7',
          label: 'Mixed',
          exercises: [
            { name: 'Rowing Machine', sets: 1, reps: '5 min' },
            { name: 'Turkish Get-Up', sets: 3, reps: '3' }
          ]
        }
      });
      expect(screen.queryByTestId('ws-swap')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Rack.s busy/i })).not.toBeInTheDocument();
    });
  });
});
