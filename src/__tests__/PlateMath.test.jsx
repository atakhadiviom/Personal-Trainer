import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import PlateMath from '../components/Dashboard/PlateMath';
import { BAR_WEIGHT_KEY, setBarWeight } from '../utils/plateMath';

const renderFor = (exerciseName, weightKg) => render(
  <PlateMath exerciseName={exerciseName} weightKg={weightKg} />
);

describe('PlateMath', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the plates per side for a barbell lift', () => {
    renderFor('Barbell Bench Press', 87.5);
    expect(screen.getByTestId('ws-plates')).toBeInTheDocument();
    expect(screen.getByTestId('ws-plates-total')).toHaveTextContent('87.5 kg');
    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent(
      '25 + 5 + 2.5 + 1.25 per side on a 20 kg bar → 87.5 kg.'
    );
  });

  it('draws one plate element per physical plate on the side', () => {
    const { container } = renderFor('Back Squat', 140);
    // 60 per side → 25, 25, 10 plus the bar itself.
    expect(container.querySelectorAll('.ws-plate[data-kg]')).toHaveLength(3);
    expect(container.querySelectorAll('.ws-plate[data-kg="25"]')).toHaveLength(2);
    expect(container.querySelector('.ws-plate.is-bar')).toBeInTheDocument();
  });

  it('stays hidden for cable, dumbbell and machine exercises', () => {
    renderFor('Cable Row', 60);
    expect(screen.queryByTestId('ws-plates')).not.toBeInTheDocument();
  });

  it('stays hidden until there is a weight to build', () => {
    const { rerender } = renderFor('Deadlift', '');
    expect(screen.queryByTestId('ws-plates')).not.toBeInTheDocument();
    rerender(<PlateMath exerciseName="Deadlift" weightKg="100" />);
    expect(screen.getByTestId('ws-plates-total')).toHaveTextContent('100 kg');
  });

  it('warns and offers neighbours when the weight cannot be built', () => {
    renderFor('Overhead Press', 88);
    const advice = screen.getByTestId('ws-plates-advice');
    expect(advice).toHaveTextContent('88 kg is not a buildable load');
    expect(advice).toHaveTextContent('87.5 kg');
    expect(advice).toHaveTextContent('90 kg');
    expect(advice).toHaveClass('is-warn');
  });

  it('shows an empty bar instead of a negative load', () => {
    renderFor('Deadlift', 20);
    expect(screen.getByText('empty bar')).toBeInTheDocument();
    expect(screen.getByTestId('ws-plates-total')).toHaveTextContent('20 kg');
  });

  it('rebuilds the plates when the athlete changes bar', async () => {
    const user = userEvent.setup();
    renderFor('Back Squat', 60);

    expect(screen.getByTestId('ws-plates-total')).toHaveTextContent('60 kg');
    await user.selectOptions(screen.getByLabelText(/Bar weight/i), '15');

    expect(localStorage.getItem(BAR_WEIGHT_KEY)).toBe('15');
    // (60 - 15) / 2 = 22.5 → 20 + 2.5
    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent('20 + 2.5 per side on a 15 kg bar');
  });

  it('follows a bar change made in the profile', () => {
    renderFor('Back Squat', 60);
    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent('20 per side on a 20 kg bar');

    act(() => { setBarWeight(10); });

    expect(screen.getByTestId('ws-plates-advice')).toHaveTextContent('25 per side on a 10 kg bar');
  });

  it('labels the group and gives a screen-reader sentence', () => {
    renderFor('Front Squat', 60);
    expect(screen.getByRole('group', { name: /Plates to load on the bar/i })).toBeInTheDocument();
    expect(screen.getByText(
      '1 20 kg plate per side on a 20 kg bar — 60 kg total.'
    )).toBeInTheDocument();
  });
});
