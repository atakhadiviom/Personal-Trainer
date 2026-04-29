import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExerciseRow from '../../../components/Dashboard/ExerciseRow';

const defaultProps = {
  ex: {
    name: 'Bench Press',
    guide: 'Keep back flat',
    sets: 3,
    reps: '10',
    rest: '60s',
    weight: '135 lbs'
  },
  exIdx: 0,
  dayIdx: 0,
  dayId: 'day1',
  isDone: false,
  isSwapping: false,
  toggleExercise: vi.fn(),
  handleSwap: vi.fn()
};

const renderWithTable = (ui) => {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
};

describe('ExerciseRow', () => {
  it('renders exercise details correctly', () => {
    renderWithTable(<ExerciseRow {...defaultProps} />);

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Keep back flat')).toBeInTheDocument();
    expect(screen.getByText('3 × 10')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('135 lbs')).toBeInTheDocument();

    const youtubeLink = screen.getByRole('link', { name: /▶ Watch/i });
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=how+to+Bench%20Press');
  });

  it('calls toggleExercise when checkbox is clicked', () => {
    const toggleMock = vi.fn();
    renderWithTable(<ExerciseRow {...defaultProps} toggleExercise={toggleMock} />);

    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    fireEvent.click(checkbox);

    expect(toggleMock).toHaveBeenCalledWith('day1', 0);
  });

  it('calls handleSwap when swap button is clicked', () => {
    const swapMock = vi.fn();
    renderWithTable(<ExerciseRow {...defaultProps} handleSwap={swapMock} />);

    const swapButton = screen.getByRole('button', { name: /🔄 Swap/i });
    fireEvent.click(swapButton);

    expect(swapMock).toHaveBeenCalledWith(0, 0, 'Bench Press');
  });

  it('applies correct styles and disables swap button when isSwapping is true', () => {
    renderWithTable(<ExerciseRow {...defaultProps} isSwapping={true} />);

    const swapButton = screen.getByRole('button', { name: /⏳ Swapping.../i });
    expect(swapButton).toBeDisabled();
    expect(swapButton).toHaveStyle({ cursor: 'wait' });
  });

  it('applies correct styles when isDone is true', () => {
    renderWithTable(<ExerciseRow {...defaultProps} isDone={true} />);

    const row = screen.getByRole('row');
    expect(row).toHaveClass('exercise-done');
    expect(row).toHaveStyle({ opacity: '0.5' });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    expect(checkbox).toBeChecked();
  });
});
