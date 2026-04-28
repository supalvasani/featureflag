import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Flag, type FlagEnvironment, type AuditLog, type Analytics } from '../api/client';
import { useToast, ToastContainer } from '../components/Toast';

const ENVIRONMENTS = ['development', 'staging', 'production'] as const;
type Env = typeof ENVIRONMENTS[number];

export default function FlagDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { toasts, add: addToast } = useToast();
  const [tab, setTab] = useState<'overview' | 'environments' | 'analytics' | 'audit'>('overview');
  const [flag, setFlag] = useState<Flag | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Env | null>(null);
  const [envForms, setEnvForms] = useState<Record<Env, { enabled: boolean; rolloutPercentage: string; allowlist: string; blocklist: string }>>({
    development: { enabled: true, rolloutPercentage: '', allowlist: '', blocklist: '' },
    staging:     { enabled: false, rolloutPercentage: '', allowlist: '', blocklist: '' },
    production:  { enabled: false, rolloutPercentage: '', allowlist: '', blocklist: '' },
  });

  useEffect(() => {
    if (!key) return;
    Promise.all([api.flags.get(key), api.flags.audit(key), api.flags.analytics(key)])
      .then(([f, a, an]) => { setFlag(f); setAudit(a); setAnalytics(an); })
      .catch(() => { addToast('Failed to load flag', 'error'); navigate('/flags'); })
      .finally(() => setLoading(false));
  }, [key]);

  async function saveEnv(env: Env) {
    if (!key) return;
    setSaving(env);
    const f = envForms[env];
    try {
      await api.flags.setEnv(key, env, {
        enabled: f.enabled,
        rolloutPercentage: f.rolloutPercentage ? Number(f.rolloutPercentage) : undefined,
        allowlist: f.allowlist ? f.allowlist.split(',').map(s => s.trim()).filter(Boolean) : [],
        blocklist: f.blocklist ? f.blocklist.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      addToast(`${env} config saved`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setSaving(null); }
  }

  async function handleKill() {
    if (!key || !confirm(`Kill switch "${key}"?`)) return;
    try {
      const res = await api.flags.kill(key);
      setFlag(res.flag);
      addToast('Kill switch activated', 'error');
    } catch (err: unknown) { addToast(err instanceof Error ? err.message : 'Kill failed', 'error'); }
  }

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading…</span></div>;
  if (!flag) return null;

  const total = analytics?.total ?? 0;
  const truePct = total === 0 ? 0 : Math.round(((analytics?.trueCount ?? 0) / total) * 100);
  const falsePct = total === 0 ? 0 : Math.round(((analytics?.falseCount ?? 0) / total) * 100);

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/flags')} style={{ marginBottom: 8 }}>← Back</button>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--accent-light)', marginBottom: 4 }}>{flag.key}</div>
          <h1 className="page-title">{flag.name}</h1>
          {flag.description && <p className="page-subtitle">{flag.description}</p>}
        </div>
        <div className="flex gap-2">
          <span className={`badge badge-${flag.status}`}>{flag.status}</span>
          <button id="btn-kill-switch" className="btn btn-danger btn-sm" onClick={handleKill} disabled={flag.status === 'inactive'}>⚡ Kill</button>
        </div>
      </div>

      {flag.status === 'inactive' && (
        <div className="kill-switch-banner">
          <span className="kill-switch-text">⚡ Kill switch active — disabled in all environments</span>
        </div>
      )}

      <div className="tabs">
        {(['overview', 'environments', 'analytics', 'audit'] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <h3 className="fw-600" style={{ marginBottom: 16 }}>Flag Config</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {[{ label: 'Type', value: flag.type }, { label: 'Status', value: flag.status }, { label: 'Default', value: String(flag.defaultValue) }].map(r => (
              <div key={r.label}>
                <div className="text-sm text-muted" style={{ marginBottom: 4 }}>{r.label}</div>
                <div className="fw-600 mono">{r.value}</div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div><div className="text-sm text-muted" style={{ marginBottom: 4 }}>Created</div><div className="fw-600 text-sm">{new Date(flag.createdAt).toLocaleString()}</div></div>
            <div><div className="text-sm text-muted" style={{ marginBottom: 4 }}>Updated</div><div className="fw-600 text-sm">{new Date(flag.updatedAt).toLocaleString()}</div></div>
          </div>
        </div>
      )}

      {tab === 'environments' && (
        <div>
          {ENVIRONMENTS.map(env => (
            <div key={env} className="env-card">
              <div className="env-card-header">
                <div className="env-card-title">
                  <span className={`badge badge-env-${env}`}>{env}</span>
                </div>
                <button id={`btn-save-${env}`} className="btn btn-primary btn-sm" onClick={() => saveEnv(env)} disabled={saving === env}>
                  {saving === env ? 'Saving…' : 'Save'}
                </button>
              </div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Enabled</label>
                  <label className="toggle">
                    <input type="checkbox" checked={envForms[env].enabled} onChange={e => setEnvForms(p => ({ ...p, [env]: { ...p[env], enabled: e.target.checked } }))} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Rollout % (0–100)</label>
                  <input className="form-input" type="number" min={0} max={100} placeholder="50" value={envForms[env].rolloutPercentage} onChange={e => setEnvForms(p => ({ ...p, [env]: { ...p[env], rolloutPercentage: e.target.value } }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Allowlist</label>
                  <input className="form-input" placeholder="user_123, admin@example.com" value={envForms[env].allowlist} onChange={e => setEnvForms(p => ({ ...p, [env]: { ...p[env], allowlist: e.target.value } }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Blocklist</label>
                  <input className="form-input" placeholder="blocked_456" value={envForms[env].blocklist} onChange={e => setEnvForms(p => ({ ...p, [env]: { ...p[env], blocklist: e.target.value } }))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="card">
          <h3 className="fw-600" style={{ marginBottom: 20 }}>Evaluation Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
            {[{ label: 'Total', value: total, color: 'var(--text-primary)' }, { label: 'True', value: analytics?.trueCount ?? 0, color: '#34d399' }, { label: 'False', value: analytics?.falseCount ?? 0, color: '#fb7185' }].map(s => (
              <div key={s.label} className="stat-card"><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
            ))}
          </div>
          {[{ label: 'True', pct: truePct, cls: 'true-bar' }, { label: 'False', pct: falsePct, cls: 'false-bar' }].map(b => (
            <div key={b.label} className="analytics-bar-wrap" style={{ marginBottom: 12 }}>
              <div className="analytics-bar-label"><span>{b.label}</span><span>{b.pct}%</span></div>
              <div className="analytics-bar-bg"><div className={`analytics-bar-fill ${b.cls}`} style={{ width: `${b.pct}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Changed By</th><th>When</th></tr></thead>
            <tbody>
              {audit.length === 0
                ? <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No audit logs</td></tr>
                : audit.map(a => (
                  <tr key={a._id}>
                    <td><span className="mono" style={{ color: 'var(--accent-light)' }}>{a.action}</span></td>
                    <td className="mono text-muted" style={{ fontSize: 11 }}>{a.changedBy}</td>
                    <td className="text-sm text-muted">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
