import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../components/Auth/Login';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  getRedirectResult,
  signInWithRedirect
} from 'firebase/auth';

// Mock the firebase configuration
vi.mock('../firebase', () => ({
  auth: {}
}));

// Mock the firebase/auth functions
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  signInWithRedirect: vi.fn()
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<Login />);
    expect(screen.getByRole('heading', { name: /NovaFit/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/athlete@novafit.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it('toggles to register mode', async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.click(screen.getByText(/Sign Up/i));

    expect(screen.getByRole('button', { name: /CREATE ACCOUNT/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
  });

  it('toggles to forgot password mode', async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.click(screen.getByText(/Forgot password\?/i));

    expect(screen.getByRole('button', { name: /SEND RESET LINK/i })).toBeInTheDocument();
    expect(screen.getByText(/← Back to Login/i)).toBeInTheDocument();

    // Password field should not be present
    expect(screen.queryByPlaceholderText(/••••••••/i)).not.toBeInTheDocument();

    // Google button should not be present
    expect(screen.queryByRole('button', { name: /Continue with Google/i })).not.toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { email: 'test@example.com' } });

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/athlete@novafit.com/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'password123');
    await user.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123');
  });

  it('handles login error with Firebase error message formatting', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Firebase: Invalid credentials (auth/invalid-credential).';
    signInWithEmailAndPassword.mockRejectedValueOnce(new Error(errorMessage));

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/athlete@novafit.com/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /SIGN IN/i }));

    await waitFor(() => {
      // The component strips 'Firebase: ' and '(auth/...)'
      expect(screen.getByText('Invalid credentials .')).toBeInTheDocument();
    });
  });

  it('handles successful registration', async () => {
    const user = userEvent.setup();
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { email: 'new@example.com' } });

    render(<Login />);

    // Switch to register mode
    await user.click(screen.getByText(/Sign Up/i));

    await user.type(screen.getByPlaceholderText(/athlete@novafit.com/i), 'new@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'password123');
    await user.click(screen.getByRole('button', { name: /CREATE ACCOUNT/i }));

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'new@example.com', 'password123');
  });

  it('handles password reset', async () => {
    const user = userEvent.setup();
    sendPasswordResetEmail.mockResolvedValueOnce();

    render(<Login />);

    // Switch to forgot password mode
    await user.click(screen.getByText(/Forgot password\?/i));

    await user.type(screen.getByPlaceholderText(/athlete@novafit.com/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /SEND RESET LINK/i }));

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'test@example.com');

    await waitFor(() => {
      expect(screen.getByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
    });
  });

  it('handles Google sign-in', async () => {
    const user = userEvent.setup();
    signInWithPopup.mockResolvedValueOnce({ user: { email: 'google@example.com' } });

    render(<Login />);

    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));

    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('handles Google sign-in error', async () => {
    const user = userEvent.setup();
    signInWithPopup.mockRejectedValueOnce(new Error('Popup closed by user'));

    render(<Login />);

    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(screen.getByText('Popup closed by user')).toBeInTheDocument();
    });
  });
});
