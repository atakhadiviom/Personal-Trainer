import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExerciseRow from '../ExerciseRow';

describe('ExerciseRow', () => {
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
    dayIdx: 1,
    dayId: 'day-1',
    isDone: false,
    isSwapping: false,
    toggleExercise: vi.fn(),
    handleSwap: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} {...props} />
        </tbody>
      </table>
    );
  };

  it('renders exercise details correctly', () => {
    renderComponent();

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Keep back flat')).toBeInTheDocument();
    expect(screen.getByText('3 × 10')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('135 lbs')).toBeInTheDocument();
  });

  it('renders YouTube link correctly', () => {
    renderComponent();

    const link = screen.getByRole('link', { name: /Watch/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=how+to+Bench%20Press');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('calls toggleExercise when checkbox is clicked', async () => {
    const toggleExerciseMock = vi.fn();
    const user = userEvent.setup();
    renderComponent({ toggleExercise: toggleExerciseMock });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Bench Press as complete/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(toggleExerciseMock).toHaveBeenCalledWith('day-1', 0);
    expect(toggleExerciseMock).toHaveBeenCalledTimes(1);
  });

  it('calls handleSwap when swap button is clicked', async () => {
    const handleSwapMock = vi.fn();
    const user = userEvent.setup();
    renderComponent({ handleSwap: handleSwapMock });

    const swapButton = screen.getByRole('button', { name: /🔄 Swap/i });
    await user.click(swapButton);
    expect(handleSwapMock).toHaveBeenCalledWith(1, 0, 'Bench Press');
    expect(handleSwapMock).toHaveBeenCalledTimes(1);
  });

  it('renders correctly when isDone is true', () => {
    renderComponent({ isDone: true });

    const row = screen.getByRole('row');
    expect(row).toHaveClass('exercise-done');
    // Using string matching for style attribute to handle potential parsing variations
    expect(row.style.opacity).toBe('0.5');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders correctly when isSwapping is true', () => {
    renderComponent({ isSwapping: true });

    const swapButton = screen.getByRole('button', { name: /⏳ Swapping.../i });
    expect(swapButton).toBeDisabled();
    expect(swapButton.style.cursor).toBe('wait');
    expect(swapButton.style.color).toBe('var(--accent-cyan)');
  });
});
