import { useState } from 'react';
import { api } from '../lib/api';
import Logo from './Logo';

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
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Logo size={72} />
        <h1 className="auth-card__title">{isSetup ? 'Welcome to MyRack' : 'Welcome back'}</h1>
        <p className="auth-card__subtitle">
          {isSetup
            ? 'Create the admin account. This dashboard controls every device reporting to it, so it needs a login first.'
            : 'Sign in to view and manage your rack.'}
        </p>

        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="input input--round"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus={!isSetup}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input input--round"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            autoFocus={isSetup}
            required
          />
        </label>

        {isSetup && (
          <label className="field">
            <span className="field__label">Confirm password</span>
            <input
              className="input input--round"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && <p className="auth-card__error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--large auth-card__submit" disabled={busy}>
          {busy ? 'Please wait…' : isSetup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
