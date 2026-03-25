import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from '../components/Dashboard/ProfilePage';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: null
  }
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

// Mock recharts to avoid rendering issues with SVGs/measurements in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

describe('ProfilePage', () => {
  const defaultFormData = {
    age: '30',
    weight: '75',
    height: '180',
    goal: 'fatloss',
    gymName: 'Golds',
    gymLocation: 'NY',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = {
      displayName: 'Test Athlete',
      email: 'test@novafit.com',
      photoURL: 'https://example.com/avatar.png',
    };
  });

  it('renders user info and avatar', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    expect(screen.getByText('Test Athlete')).toBeInTheDocument();
    expect(screen.getByText('test@novafit.com')).toBeInTheDocument();
    const avatar = screen.getByAltText('avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('renders placeholder when photoURL is missing', () => {
    auth.currentUser.photoURL = null;
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    // "test@novafit.com" starts with 't', so upper is 'T'
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders stats from formData', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('75 kg')).toBeInTheDocument();
    expect(screen.getByText('180 cm')).toBeInTheDocument();
    expect(screen.getByText('Fat Loss')).toBeInTheDocument();
    expect(screen.getByText('Golds')).toBeInTheDocument();
    expect(screen.getByText('NY')).toBeInTheDocument();
  });

  it('handles missing formData gracefully', () => {
    render(<ProfilePage formData={{}} resetWizard={vi.fn()} />);
    const emDashes = screen.getAllByText('—');
    expect(emDashes.length).toBe(6);
  });

  it('calls resetWizard on Recalibrate button click', () => {
    const mockReset = vi.fn();
    render(<ProfilePage formData={defaultFormData} resetWizard={mockReset} />);
    const btn = screen.getByText('↻ Recalibrate — Regenerate My Plan');
    fireEvent.click(btn);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('calls signOut on Sign Out button click', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    const btn = screen.getByText('Sign Out');
    fireEvent.click(btn);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it('renders LineChart when weight is provided', () => {
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not render LineChart when weight is missing', () => {
    const noWeightData = { ...defaultFormData, weight: undefined };
    render(<ProfilePage formData={noWeightData} resetWizard={vi.fn()} />);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders placeholder user info when user displayName and email are missing', () => {
    auth.currentUser = {};
    render(<ProfilePage formData={defaultFormData} resetWizard={vi.fn()} />);
    expect(screen.getByText('NovaFit Athlete')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
  });
});
