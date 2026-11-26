import { useEffect, useState, type FormEvent } from 'react';

type Firebase = typeof import('../firebase');

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [firebase, setFirebase] = useState<Firebase>();

  // Loaded in advance: Safari blocks a popup that is not opened straight from the tap.
  useEffect(() => {
    import('../firebase').then(setFirebase, () => setMessage('Could not start the sign-in service. Reload to try again.'));
  }, []);

  const attempt = async (action: (firebase: Firebase) => Promise<unknown>, done = '') => {
    if (!firebase) return;
    const request = action(firebase);
    setBusy(true);
    setMessage('');
    try {
      await request;
      setMessage(done);
    } catch (e) {
      setMessage(firebase.authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    attempt((f) => (creating ? f.createAccount(email, password) : f.signInWithEmail(email, password)));
  };

  return (
    <div className="app">
      <div className="screen sign-in">
        <div className="record-mark" aria-hidden="true" />
        <h1>Your listening room</h1>
        <p className="muted">Sign in to open your record collection.</p>
        <button type="button" className="button primary wide" disabled={busy || !firebase} onClick={() => attempt((f) => f.signInWithGoogle())}>
          Continue with Google
        </button>
        <p className="muted small">or with email</p>
        <form className="stack" onSubmit={submit}>
          <label className="field wide">
            <span>Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field wide">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="button wide" disabled={busy}>{creating ? 'Create account' : 'Sign in'}</button>
        </form>
        <div className="row centre">
          <button type="button" className="link" onClick={() => setCreating(!creating)}>
            {creating ? 'I already have an account' : 'Create an account'}
          </button>
          {!creating && (
            <button
              type="button"
              className="link"
              disabled={busy}
              onClick={() => (email ? attempt((f) => f.resetPassword(email), 'If that account exists, a reset email is on its way.') : setMessage('Enter your email first.'))}
            >
              Forgot password
            </button>
          )}
        </div>
        <p className="error" role="alert">{message}</p>
      </div>
    </div>
  );
}
