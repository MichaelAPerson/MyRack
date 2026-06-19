import { useState } from 'react';
import { api } from '../lib/api';

export default function AuthScreen({ mode, onSuccess }) {
  const isSetup = mode === 'setup';
  const [username, setUsername] = useState(isSetup ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (isSetup && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (isSetup && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (isSetup) {
        await api.setup(username, password);
      } else {
        await api.login(username, password);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__brand">
          <span className="topbar__logoDot" aria-hidden="true" />
          <span className="topbar__wordmark">MYRACK</span>
        </div>

        <h1 className="auth-card__title">{isSetup ? 'Create the admin account' : 'Sign in'}</h1>
        <p className="auth-card__subtitle">
          {isSetup
            ? 'This dashboard controls every device reporting to it, so it needs a login before anything else.'
            : 'Sign in to view and manage this rack.'}
        </p>

        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {isSetup && (
          <label className="field">
            <span className="field__label">Confirm password</span>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && <p className="auth-card__error">{error}</p>}

        <button type="submit" className="btn btn--amber auth-card__submit" disabled={busy}>
          {busy ? 'Please wait…' : isSetup ? 'Create account & continue' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
