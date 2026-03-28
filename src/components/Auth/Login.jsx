import React, { useState } from 'react';
import { auth } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail
} from 'firebase/auth';

const isRestrictedWebView = () => {
  const ua = navigator.userAgent || '';
  return /Telegram|Instagram|FBAN|FBAV|Twitter|Line\/|MicroMessenger/i.test(ua) ||
    (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua) && /AppleWebKit/.test(ua));
};

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const inWebView = isRestrictedWebView();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent! Check your inbox.');
        setLoading(false);
        return;
      }
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (inWebView) {
      window.open(window.location.href, '_blank', 'noreferrer');
      return;
    }
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Popup blocked (common in PWA standalone mode) — fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          setError(redirectErr.message.replace('Firebase: ', '').replace(/\s*\(auth\/[^)]*\)\.?/g, '').trim());
        }
      } else {
        setError(err.message.replace('Firebase: ', '').replace(/\s*\(auth\/[^)]*\)\.?/g, '').trim());
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass animate-fade-in">
        
        {/* Brand */}
        <div className="login-brand">
          <h1 className="super-title gradient-text" style={{ fontSize: '3rem' }}>NovaFit</h1>
          <p className="subtitle-tech">AI-Powered Personal Training</p>
        </div>

        {/* Alerts */}
        {error && <div className="alert-box alert-warning" style={{ width: '100%', marginBottom: '20px' }}>{error}</div>}
        {success && <div className="alert-box" style={{ width: '100%', marginBottom: '20px', background: 'rgba(0,245,160,0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>{success}</div>}

        {/* Google Auth */}
        {mode !== 'forgot' && (
          <>
            <button type="button" className="btn-google" onClick={handleGoogleSignIn}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {inWebView ? 'Open in Browser for Google Sign-in' : 'Continue with Google'}
            </button>
            <div className="divider"><span>or</span></div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="athlete@novafit.com" />
          </div>
          
          {mode !== 'forgot' && (
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'SIGN IN' : mode === 'register' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="login-footer">
          {mode === 'login' && (
            <>
              <button type="button" className="link-btn" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>Forgot password?</button>
              <button type="button" className="link-btn" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Don't have an account? <strong>Sign Up</strong></button>
            </>
          )}
          {mode === 'register' && (
            <button type="button" className="link-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Already have an account? <strong>Log In</strong></button>
          )}
          {mode === 'forgot' && (
            <button type="button" className="link-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>← Back to Login</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
