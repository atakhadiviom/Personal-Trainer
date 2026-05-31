import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../App';

// --- Mocks for Firebase ---
// Vitest hoists vi.mock, so we cannot use out-of-scope variables like mockFirebase directly.
// Instead, we return an object whose properties can be spied on or mutated using getters/setters,
// or we just define the default mock state and use vi.mocked or dynamic imports inside tests.
vi.mock('../firebase', () => {
  return {
    auth: {},
    db: {},
    get firebaseSetupError() { return globalThis.__mockFirebaseSetupError || null; },
    get firebaseMissingEnvKeys() { return globalThis.__mockFirebaseMissingEnvKeys || []; }
  };
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve())
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

// --- Mocks for Subcomponents ---
vi.mock('../components/Auth/Login', () => ({
  default: () => <div data-testid="mock-login">Mock Login</div>
}));
vi.mock('../components/Onboarding', () => ({
  default: () => <div data-testid="mock-onboarding">Mock Onboarding</div>
}));
vi.mock('../components/Wizard/StepBody', () => ({
  default: () => <div data-testid="mock-step-body">Mock Step Body</div>
}));
vi.mock('../components/Dashboard/MyPlan', () => ({
  default: () => <div data-testid="mock-my-plan">Mock My Plan</div>
}));

// Prevent issues with CSS imports in the test environment
vi.mock('../index.css', () => ({}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset local storage for each test
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('renders initializing screen when authLoading is true', async () => {
    // onAuthStateChanged returns an unsubscribe function. We need to mock it properly
    // to avoid the "unsub is not a function" error during the component's cleanup.
    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockReturnValue(vi.fn());

    // If we mock firebase to have auth/db, authLoading starts true.
    // We don't await act immediately so we can catch the initial render.
    render(<App />);
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
  });

  it('renders firebase setup error when firebaseSetupError is populated', async () => {
    // Temporarily override the global mock state
    globalThis.__mockFirebaseSetupError = 'Missing env';
    globalThis.__mockFirebaseMissingEnvKeys = ['KEY'];

    render(<App />);
    expect(screen.getByText('Firebase setup required')).toBeInTheDocument();

    // Cleanup
    globalThis.__mockFirebaseSetupError = null;
    globalThis.__mockFirebaseMissingEnvKeys = [];
  });

  it('renders onboarding when showOnboarding is true', async () => {
    // localStorage.getItem returns null by default in our beforeEach
    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null); // No user
      return vi.fn(); // Unsubscribe mock
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId('mock-onboarding')).toBeInTheDocument();
  });

  it('renders login when there is no user and onboarding is skipped', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('1'); // Onboarded

    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null); // No user
      return vi.fn(); // Unsubscribe mock
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId('mock-login')).toBeInTheDocument();
  });

  it('renders wizard view (StepBody) when user exists but has no aiPlan', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('1'); // Onboarded

    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-uid' }); // User exists
      return vi.fn(); // Unsubscribe mock
    });

    const { getDoc } = await import('firebase/firestore');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({}) // No aiPlan
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-step-body')).toBeInTheDocument();
    });
  });

  it('renders dashboard view (MyPlan) when user exists and has an aiPlan', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('1'); // Onboarded

    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-uid' }); // User exists
      return vi.fn(); // Unsubscribe mock
    });

    const { getDoc } = await import('firebase/firestore');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ aiPlan: { plan: 'data' }, formData: {} }) // Has aiPlan
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-my-plan')).toBeInTheDocument();
    });
  });
});
