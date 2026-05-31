import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExerciseRow from '../components/Dashboard/ExerciseRow';

const defaultProps = {
  ex: {
    name: 'Bench Press',
    sets: 3,
    reps: 10,
    rest: '60s',
    weight: '135 lbs',
    guide: 'Keep back flat',
  },
  exIdx: 0,
  dayIdx: 1,
  dayId: 'day_1',
  isDone: false,
  isSwapping: false,
};

describe('ExerciseRow Component', () => {
  it('renders exercise details correctly', () => {
    const toggleExercise = vi.fn();
    const handleSwap = vi.fn();
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} toggleExercise={toggleExercise} handleSwap={handleSwap} />
        </tbody>
      </table>
    );

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('3 × 10')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('135 lbs')).toBeInTheDocument();
    expect(screen.getByText('Keep back flat')).toBeInTheDocument();

    // Checkbox is unchecked
    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    expect(checkbox).not.toBeChecked();

    // Watch button is present with correct link
    const watchLink = screen.getByRole('link', { name: /▶ Watch/i });
    expect(watchLink).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=how+to+Bench%20Press');
  });

  it('calls toggleExercise when checkbox is clicked', () => {
    const toggleExercise = vi.fn();
    const handleSwap = vi.fn();
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} toggleExercise={toggleExercise} handleSwap={handleSwap} />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    fireEvent.click(checkbox);

    expect(toggleExercise).toHaveBeenCalledTimes(1);
    expect(toggleExercise).toHaveBeenCalledWith('day_1', 0);
  });

  it('calls handleSwap when Swap button is clicked', () => {
    const toggleExercise = vi.fn();
    const handleSwap = vi.fn();
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} toggleExercise={toggleExercise} handleSwap={handleSwap} />
        </tbody>
      </table>
    );

    const swapButton = screen.getByRole('button', { name: /🔄 Swap/i });
    fireEvent.click(swapButton);

    expect(handleSwap).toHaveBeenCalledTimes(1);
    expect(handleSwap).toHaveBeenCalledWith(1, 0, 'Bench Press');
  });

  it('disables swap button and shows swapping text when isSwapping is true', () => {
    const toggleExercise = vi.fn();
    const handleSwap = vi.fn();
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} isSwapping={true} toggleExercise={toggleExercise} handleSwap={handleSwap} />
        </tbody>
      </table>
    );

    const swapButton = screen.getByRole('button', { name: /⏳ Swapping.../i });
    expect(swapButton).toBeInTheDocument();
    expect(swapButton).toBeDisabled();
  });

  it('applies done styling and checks the box when isDone is true', () => {
    const toggleExercise = vi.fn();
    const handleSwap = vi.fn();
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} isDone={true} toggleExercise={toggleExercise} handleSwap={handleSwap} />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    expect(checkbox).toBeChecked();

    // Check row has class
    const row = checkbox.closest('tr');
    expect(row).toHaveClass('exercise-done');
    expect(row).toHaveStyle('opacity: 0.5');
  });
});
