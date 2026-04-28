import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SetupPage() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3000/api/flags', {
        headers: { 'x-api-key': key.trim() },
      });
      if (res.status === 401) throw new Error('Invalid API key');
      localStorage.setItem('ff_api_key', key.trim());
      navigate('/flags');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-logo">⚑</div>
        <h1 className="setup-title">FlagKit</h1>
        <p className="setup-sub">
          Enter your project API key to access the feature flag dashboard.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              className="form-input"
              type="text"
              placeholder="your-project-api-key"
              value={key}
              onChange={e => setKey(e.target.value)}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
              autoFocus
            />
            {error && <div className="form-error">{error}</div>}
            <div className="form-hint">
              You can find your API key in the projects collection in MongoDB.
            </div>
          </div>

          <button
            id="btn-connect"
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '12px' }}
            disabled={loading || !key.trim()}
          >
            {loading ? 'Connecting…' : 'Connect →'}
          </button>
        </form>

        <div className="divider" />

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          No account needed — API keys are managed directly in your database.
        </p>
      </div>
    </div>
  );
}
