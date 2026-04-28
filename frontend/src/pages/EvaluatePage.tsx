import { useState } from 'react';
import { api, type EvaluationResult } from '../api/client';
import { useToast, ToastContainer } from '../components/Toast';

type Env = 'development' | 'staging' | 'production';

interface UserAttrs { [key: string]: string }

export default function EvaluatePage() {
  const { toasts, add: addToast } = useToast();
  const [flagKey, setFlagKey]     = useState('');
  const [env, setEnv]             = useState<Env>('production');
  const [userId, setUserId]       = useState('');
  const [email, setEmail]         = useState('');
  const [attrKey, setAttrKey]     = useState('');
  const [attrVal, setAttrVal]     = useState('');
  const [attrs, setAttrs]         = useState<UserAttrs>({});
  const [result, setResult]       = useState<EvaluationResult | null>(null);
  const [bulkResults, setBulkResults] = useState<EvaluationResult[] | null>(null);
  const [loading, setLoading]     = useState(false);

  function addAttr() {
    if (!attrKey.trim()) return;
    setAttrs(p => ({ ...p, [attrKey.trim()]: attrVal }));
    setAttrKey(''); setAttrVal('');
  }

  function removeAttr(k: string) {
    setAttrs(p => { const n = { ...p }; delete n[k]; return n; });
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!flagKey.trim() || !userId.trim()) { addToast('Flag key and User ID are required', 'error'); return; }
    setLoading(true);
    setBulkResults(null);
    try {
      const res = await api.evaluate.single({
        flagKey: flagKey.trim(),
        environment: env,
        user: { id: userId.trim(), email: email.trim() || undefined, attributes: Object.keys(attrs).length ? attrs : undefined },
      });
      setResult(res);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Evaluation failed', 'error');
    } finally { setLoading(false); }
  }

  async function handleBulk() {
    if (!userId.trim()) { addToast('User ID is required', 'error'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.evaluate.bulk({
        environment: env,
        user: { id: userId.trim(), email: email.trim() || undefined, attributes: Object.keys(attrs).length ? attrs : undefined },
      });
      setBulkResults(res);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Bulk evaluation failed', 'error');
    } finally { setLoading(false); }
  }

  const reasonColors: Record<string, string> = {
    kill_switch: 'var(--rose)', env_disabled: 'var(--rose)',
    blocklist: 'var(--rose)', allowlist_match: 'var(--green)',
    attribute_rule_match: 'var(--teal-light)', percentage_rollout: 'var(--accent-light)',
    default: 'var(--text-muted)',
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluation Playground</h1>
          <p className="page-subtitle">Test how flags evaluate for a specific user context</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Input panel */}
        <div className="card">
          <h3 className="fw-600" style={{ marginBottom: 20 }}>Evaluation Input</h3>
          <form onSubmit={handleEvaluate}>
            <div className="form-group">
              <label className="form-label" htmlFor="eval-flag-key">Flag Key</label>
              <input id="eval-flag-key" className="form-input" placeholder="new_ui" value={flagKey}
                onChange={e => setFlagKey(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
              <div className="form-hint">Leave blank to evaluate ALL flags (bulk mode)</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="eval-env">Environment</label>
              <select id="eval-env" className="form-select" value={env} onChange={e => setEnv(e.target.value as Env)}>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="eval-user-id">User ID *</label>
                <input id="eval-user-id" className="form-input" placeholder="user_123" value={userId}
                  onChange={e => setUserId(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="eval-email">Email (optional)</label>
                <input id="eval-email" className="form-input" placeholder="user@example.com" type="email"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Attribute builder */}
            <div className="form-group">
              <label className="form-label">User Attributes</label>
              {Object.entries(attrs).map(([k, v]) => (
                <div key={k} className="flex-center gap-2" style={{ marginBottom: 6 }}>
                  <span className="mono text-sm" style={{ background: 'var(--bg-overlay)', padding: '4px 10px', borderRadius: 4, flex: 1 }}>
                    {k}: {v}
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAttr(k)}>✕</button>
                </div>
              ))}
              <div className="flex-center gap-2" style={{ marginTop: 8 }}>
                <input className="form-input" placeholder="key" value={attrKey} onChange={e => setAttrKey(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                <input className="form-input" placeholder="value" value={attrVal} onChange={e => setAttrVal(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addAttr}>+</button>
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <button id="btn-evaluate" type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Evaluating…' : '◈ Evaluate Flag'}
              </button>
              <button id="btn-evaluate-bulk" type="button" className="btn btn-secondary" disabled={loading} onClick={handleBulk}>
                Bulk
              </button>
            </div>
          </form>
        </div>

        {/* Result panel */}
        <div>
          {!result && !bulkResults && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>◈</div>
              <div className="text-muted">Run an evaluation to see the result</div>
            </div>
          )}

          {result && (
            <div className={`eval-result ${result.result}`}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>{result.flagKey}</div>
              <div className="eval-result-value">{String(result.result).toUpperCase()}</div>
              <div className="eval-result-reason" style={{ color: reasonColors[result.reason] ?? 'var(--text-muted)' }}>
                reason: {result.reason}
              </div>
            </div>
          )}

          {bulkResults && (
            <div className="card">
              <h3 className="fw-600" style={{ marginBottom: 16 }}>Bulk Results ({bulkResults.length} flags)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bulkResults.length === 0 && <div className="text-muted text-sm">No active flags found</div>}
                {bulkResults.map(r => (
                  <div key={r.flagKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent-light)' }}>{r.flagKey}</span>
                    <div className="flex-center gap-2">
                      <span style={{ fontSize: 12, color: reasonColors[r.reason] ?? 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{r.reason}</span>
                      <span className={`badge badge-${r.result ? 'active' : 'inactive'}`}>{String(r.result)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
