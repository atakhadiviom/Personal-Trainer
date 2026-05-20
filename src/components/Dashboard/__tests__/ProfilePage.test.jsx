import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../ProfilePage';
import { auth } from '../../../firebase';
import { signOut } from 'firebase/auth';

// Mock dependencies
vi.mock('../../../firebase', () => ({
  auth: {
    currentUser: null,
  }
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

vi.mock('../../../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getWeeklyAverageCalories: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('ProfilePage', () => {
  const mockResetWizard = vi.fn();

  const defaultFormData = {
    age: '30',
    weight: '75',
    height: '180',
    goal: 'fatloss',
    gymName: 'Gold Gym',
    gymLocation: 'New York',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = {
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'http://example.com/photo.jpg',
    };
  });

  it('renders user profile information with photo', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('avatar')).toHaveAttribute('src', 'http://example.com/photo.jpg');
  });

  it('renders user profile information without photo (fallback initials)', () => {
    auth.currentUser = {
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
    };
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    expect(screen.getByText('T')).toBeInTheDocument(); // test@example.com -> 'T'
  });

  it('renders default user information if current user is missing details', () => {
    auth.currentUser = null;
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    expect(screen.getByText('NovaFit Athlete')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // fallback when email is missing: ('U')[0] -> 'U'
  });

  it('renders profile stats correctly', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('75 kg')).toBeInTheDocument();
    expect(screen.getByText('180 cm')).toBeInTheDocument();
    expect(screen.getByText('Fat Loss')).toBeInTheDocument(); // goal replaced
    expect(screen.getByText('Gold Gym')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('renders goal replacements correctly for muscle', () => {
    render(<ProfilePage formData={{ ...defaultFormData, goal: 'muscle' }} resetWizard={mockResetWizard} />);
    expect(screen.getByText('Build Muscle')).toBeInTheDocument();
  });

  it('renders fallback dashes for missing profile stats', () => {
    render(<ProfilePage formData={{}} resetWizard={mockResetWizard} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(7); // age, weight, height, goal, gym, location, tdee
  });

  it('renders weight projection chart when weight is present', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    expect(screen.getByText('12-Week Weight Projection')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not render weight projection chart when weight is missing', () => {
    render(<ProfilePage formData={{ ...defaultFormData, weight: undefined }} resetWizard={mockResetWizard} />);

    expect(screen.queryByText('12-Week Weight Projection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('calls resetWizard when Recalibrate button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    const button = screen.getByRole('button', { name: /recalibrate — regenerate my plan/i });
    await user.click(button);

    expect(mockResetWizard).toHaveBeenCalledTimes(1);
  });

  it('calls signOut when Sign Out button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfilePage formData={defaultFormData} resetWizard={mockResetWizard} />);

    const button = screen.getByRole('button', { name: /sign out/i });
    await user.click(button);

    expect(signOut).toHaveBeenCalledWith(auth);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
