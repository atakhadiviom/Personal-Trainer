import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { auth } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';

// Mock firebase
vi.mock('../../firebase', () => ({
  auth: {}
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('athlete@novafit.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it('switches to register mode', async () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/Sign Up/i));

    expect(screen.getByRole('button', { name: /CREATE ACCOUNT/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
  });

  it('switches to forgot password mode', async () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    expect(screen.getByRole('button', { name: /SEND RESET LINK/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with Google/i })).not.toBeInTheDocument();
    expect(screen.getByText(/← Back to Login/i)).toBeInTheDocument();
  });

  it('calls signInWithEmailAndPassword on login submit', async () => {
    render(<Login />);

    await userEvent.type(screen.getByPlaceholderText('athlete@novafit.com'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');

    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password123');
    });
  });

  it('calls createUserWithEmailAndPassword on register submit', async () => {
    render(<Login />);

    fireEvent.click(screen.getByText(/Sign Up/i));

    await userEvent.type(screen.getByPlaceholderText('athlete@novafit.com'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');

    fireEvent.click(screen.getByRole('button', { name: /CREATE ACCOUNT/i }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password123');
    });
  });

  it('calls sendPasswordResetEmail on forgot password submit', async () => {
    render(<Login />);

    fireEvent.click(screen.getByText(/Forgot password\?/i));

    await userEvent.type(screen.getByPlaceholderText('athlete@novafit.com'), 'test@example.com');

    fireEvent.click(screen.getByRole('button', { name: /SEND RESET LINK/i }));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'test@example.com');
    });

    expect(await screen.findByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
  });

  it('calls signInWithPopup on Google sign in click', async () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(GoogleAuthProvider).toHaveBeenCalled();
    });
  });

  it('displays error message on failed login', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(new Error('Firebase: invalid credentials (auth/invalid-credential)'));

    render(<Login />);

    await userEvent.type(screen.getByPlaceholderText('athlete@novafit.com'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');

    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    expect(await screen.findByText('invalid credentials')).toBeInTheDocument();
  });
});
