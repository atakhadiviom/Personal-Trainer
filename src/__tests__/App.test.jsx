import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../App';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

// Mock Firebase dependencies
vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  firebaseMissingEnvKeys: [],
  get firebaseSetupError() {
    return global.__FIREBASE_SETUP_ERROR__ || null;
  }
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

vi.mock('../utils/aiService', () => ({
  generateWorkoutPlan: vi.fn()
}));

// Mock sub-components
vi.mock('../components/Auth/Login', () => ({ default: () => <div data-testid="mock-login">Login Component</div> }));
vi.mock('../components/Onboarding', () => ({ default: () => <div data-testid="mock-onboarding">Onboarding Component</div> }));
vi.mock('../components/Wizard/StepBody', () => ({ default: () => <div data-testid="mock-step-body">Step Body</div> }));
vi.mock('../components/Wizard/StepProblems', () => ({ default: () => <div data-testid="mock-step-problems">Step Problems</div> }));
vi.mock('../components/Wizard/StepGym', () => ({ default: () => <div data-testid="mock-step-gym">Step Gym</div> }));
vi.mock('../components/Wizard/LoadingAI', () => ({ default: () => <div data-testid="mock-loading-ai">Loading AI</div> }));
vi.mock('../components/Layout/Navbar', () => ({ default: () => <div data-testid="mock-navbar">Navbar Component</div> }));
vi.mock('../components/Dashboard/MyPlan', () => ({ default: () => <div data-testid="mock-my-plan">My Plan</div> }));
vi.mock('../components/Dashboard/CalorieTrackerPage', () => ({ default: () => <div data-testid="mock-calorie-tracker">Calorie Tracker</div> }));
vi.mock('../components/Dashboard/ProfilePage', () => ({ default: () => <div data-testid="mock-profile">Profile Page</div> }));
vi.mock('../components/Dashboard/HealthPage', () => ({ default: () => <div data-testid="mock-health">Health Page</div> }));

describe('App Component', () => {
  let authStateCallback = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset global error mock
    global.__FIREBASE_SETUP_ERROR__ = null;

    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return vi.fn(); // Return unsubscribe function
    });
  });

  it('shows Initializing loading screen initially', () => {
    render(<App />);
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
  });

  it('shows Firebase setup error screen when firebaseSetupError is true', () => {
    global.__FIREBASE_SETUP_ERROR__ = 'Setup error';
    render(<App />);
    expect(screen.getByText('Firebase setup required')).toBeInTheDocument();
  });

  it('shows Onboarding when localStorage does not have novafit_onboarded', async () => {
    render(<App />);

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback(null);
      }
    });

    expect(screen.getByTestId('mock-onboarding')).toBeInTheDocument();
  });

  it('shows Login when not onboarded (but onboarded flag is set) and no authenticated user', async () => {
    localStorage.setItem('novafit_onboarded', '1');
    render(<App />);

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback(null);
      }
    });

    expect(screen.getByTestId('mock-login')).toBeInTheDocument();
  });

  it('shows Wizard View (StepBody) when authenticated but no existing plan', async () => {
    localStorage.setItem('novafit_onboarded', '1');
    getDoc.mockResolvedValueOnce({ exists: () => false });

    render(<App />);

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback({ uid: 'user123', email: 'test@test.com' });
      }
    });

    expect(screen.getByTestId('mock-step-body')).toBeInTheDocument();
    // Wizard header is visible
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('shows Dashboard View when authenticated and has an existing plan', async () => {
    localStorage.setItem('novafit_onboarded', '1');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ aiPlan: { plan: 'some-plan' }, formData: {} })
    });

    render(<App />);

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback({ uid: 'user123', email: 'test@test.com', displayName: 'Test User' });
      }
    });

    // Should show Dashboard which defaults to MyPlan tab
    expect(screen.getByTestId('mock-my-plan')).toBeInTheDocument();
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
  });
});
