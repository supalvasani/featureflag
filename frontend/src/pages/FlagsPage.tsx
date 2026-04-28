import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Flag } from '../api/client';
import { useToast, ToastContainer, registerToast } from '../components/Toast';

function StatusBadge({ status }: { status: Flag['status'] }) {
  return <span className={`badge badge-${status}`}>{status === 'active' ? '● Active' : '○ Inactive'}</span>;
}

function TypeBadge({ type }: { type: Flag['type'] }) {
  const labels: Record<Flag['type'], string> = {
    boolean: 'Boolean',
    percentage: '% Rollout',
    user_list: 'User List',
    attribute_rule: 'Attr Rule',
  };
  return <span className={`badge badge-${type}`}>{labels[type]}</span>;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: '', name: '', description: '', type: 'boolean' as Flag['type'], defaultValue: false,
  });
  const navigate = useNavigate();
  const { toasts, add: addToast } = useToast();

  useEffect(() => { registerToast(addToast); }, [addToast]);

  useEffect(() => {
    api.flags.list()
      .then(setFlags)
      .catch(() => addToast('Failed to load flags', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = flags.filter(f =>
    f.key.includes(search.toLowerCase()) ||
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const active   = flags.filter(f => f.status === 'active').length;
  const inactive = flags.filter(f => f.status === 'inactive').length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const flag = await api.flags.create(form);
      setFlags(p => [flag, ...p]);
      setShowCreate(false);
      setForm({ key: '', name: '', description: '', type: 'boolean', defaultValue: false });
      addToast('Flag created', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleKill(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Kill switch "${key}"? This disables it in ALL environments immediately.`)) return;
    try {
      await api.flags.kill(key);
      setFlags(p => p.map(f => f.key === key ? { ...f, status: 'inactive' } : f));
      addToast('Kill switch activated', 'error');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Kill failed', 'error');
    }
  }

  async function handleDelete(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete flag "${key}"? This cannot be undone.`)) return;
    try {
      await api.flags.delete(key);
      setFlags(p => p.filter(f => f.key !== key));
      addToast('Flag deleted', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Feature Flags</h1>
          <p className="page-subtitle">Manage all flags for this project</p>
        </div>
        <button id="btn-create-flag" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Flag
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{flags.length}</div>
          <div className="stat-label">Total Flags</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--rose)' }}>{inactive}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex-center gap-3" style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input
            id="search-flags"
            placeholder="Search flags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Flags list */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading flags…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚑</div>
          <div className="empty-title">{search ? 'No results' : 'No flags yet'}</div>
          <div className="empty-desc">{search ? 'Try a different search' : 'Create your first feature flag to get started'}</div>
          {!search && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Flag</button>}
        </div>
      ) : (
        <div className="flags-grid">
          {filtered.map(flag => (
            <div
              key={flag._id}
              id={`flag-${flag.key}`}
              className="card card-hover"
              onClick={() => navigate(`/flags/${flag.key}`)}
            >
              <div className="flag-card">
                <div>
                  <div className="flag-card-key">{flag.key}</div>
                  <div className="flag-card-name">{flag.name}</div>
                  {flag.description && <div className="flag-card-desc">{flag.description}</div>}
                  <div className="flag-card-meta">
                    <StatusBadge status={flag.status} />
                    <TypeBadge type={flag.type} />
                    <span className="text-sm text-muted">
                      Default: <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{String(flag.defaultValue)}</code>
                    </span>
                  </div>
                </div>
                <div className="flag-card-actions">
                  <button
                    id={`btn-kill-${flag.key}`}
                    className="btn btn-danger btn-sm"
                    onClick={e => handleKill(flag.key, e)}
                    title="Kill switch"
                    disabled={flag.status === 'inactive'}
                  >
                    ⚡ Kill
                  </button>
                  <button
                    id={`btn-delete-${flag.key}`}
                    className="btn btn-ghost btn-sm"
                    onClick={e => handleDelete(flag.key, e)}
                    style={{ color: 'var(--rose)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Feature Flag</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="flag-key">Key *</label>
                    <input
                      id="flag-key"
                      className="form-input"
                      placeholder="new_feature"
                      value={form.key}
                      onChange={e => setForm(p => ({ ...p, key: e.target.value }))}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                      required
                    />
                    <div className="form-hint">Lowercase letters, numbers, underscores</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="flag-name">Name *</label>
                    <input
                      id="flag-name"
                      className="form-input"
                      placeholder="New Feature"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="flag-desc">Description</label>
                  <input
                    id="flag-desc"
                    className="form-input"
                    placeholder="What does this flag control?"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="flag-type">Type *</label>
                    <select
                      id="flag-type"
                      className="form-select"
                      value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value as Flag['type'] }))}
                    >
                      <option value="boolean">Boolean</option>
                      <option value="percentage">Percentage Rollout</option>
                      <option value="user_list">User List</option>
                      <option value="attribute_rule">Attribute Rule</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Value</label>
                    <label className="form-check" style={{ marginTop: 10 }}>
                      <input
                        type="checkbox"
                        checked={form.defaultValue}
                        onChange={e => setForm(p => ({ ...p, defaultValue: e.target.checked }))}
                      />
                      <span>{form.defaultValue ? 'true' : 'false'}</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button id="btn-submit-flag" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
