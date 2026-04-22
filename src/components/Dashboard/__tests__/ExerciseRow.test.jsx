import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExerciseRow from '../ExerciseRow';

describe('ExerciseRow', () => {
  const mockToggleExercise = vi.fn();
  const mockHandleSwap = vi.fn();

  const defaultProps = {
    ex: {
      name: 'Push Up',
      guide: 'Keep back straight',
      sets: 3,
      reps: 15,
      rest: '60s',
      weight: 'Bodyweight'
    },
    exIdx: 0,
    dayIdx: 1,
    dayId: 'day-1',
    isDone: false,
    isSwapping: false,
    toggleExercise: mockToggleExercise,
    handleSwap: mockHandleSwap
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exercise information correctly', () => {
    // Wrap in tbody since it renders a tr
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} />
        </tbody>
      </table>
    );

    expect(screen.getByText('Push Up')).toBeInTheDocument();
    expect(screen.getByText('Keep back straight')).toBeInTheDocument();
    expect(screen.getByText('3 × 15')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('Bodyweight')).toBeInTheDocument();

    const youtubeLink = screen.getByRole('link', { name: /Watch/i });
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=how+to+Push%20Up');
  });

  it('calls toggleExercise when checkbox is clicked', () => {
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} />
        </tbody>
      </table>
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockToggleExercise).toHaveBeenCalledTimes(1);
    expect(mockToggleExercise).toHaveBeenCalledWith('day-1', 0);
  });

  it('calls handleSwap when swap button is clicked', () => {
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} />
        </tbody>
      </table>
    );
    const swapButton = screen.getByRole('button', { name: /Swap/i });
    fireEvent.click(swapButton);

    expect(mockHandleSwap).toHaveBeenCalledTimes(1);
    expect(mockHandleSwap).toHaveBeenCalledWith(1, 0, 'Push Up');
  });

  it('applies done styles when isDone is true', () => {
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} isDone={true} />
        </tbody>
      </table>
    );

    // Checkbox should be checked
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // Look for the table row to have the 'exercise-done' class
    const row = screen.getByRole('row');
    expect(row).toHaveClass('exercise-done');
    // It's rendered with style opacity 0.5 when true
    expect(row).toHaveStyle({ opacity: 0.5 });
  });

  it('disables swap button and changes text when isSwapping is true', () => {
    render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} isSwapping={true} />
        </tbody>
      </table>
    );

    const swapButton = screen.getByRole('button', { name: /Swapping\.\.\./i });
    expect(swapButton).toBeDisabled();
  });

  it('does not render guide if not provided', () => {
    const propsWithoutGuide = { ...defaultProps, ex: { ...defaultProps.ex, guide: undefined } };
    render(
      <table>
        <tbody>
          <ExerciseRow {...propsWithoutGuide} />
        </tbody>
      </table>
    );

    expect(screen.queryByText('Keep back straight')).not.toBeInTheDocument();
  });
});
