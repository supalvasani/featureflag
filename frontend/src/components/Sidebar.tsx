import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/flags',    icon: '⚑', label: 'Feature Flags' },
  { to: '/evaluate', icon: '◈', label: 'Evaluate' },
];

export default function Sidebar() {
  const key = localStorage.getItem('ff_api_key') ?? '';
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('ff_api_key');
    navigate('/setup');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">⚑</div>
        <div>
          <div className="brand-name">FlagKit</div>
          <div className="brand-sub">Feature Flags</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="api-key-indicator">
          <div className="dot" />
          <span className="key-text">{key ? `••••${key.slice(-6)}` : 'No key'}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 10, width: '100%', justifyContent: 'flex-start', padding: '6px 0' }}
          onClick={handleLogout}
        >
          ↩ Change key
        </button>
      </div>
    </aside>
  );
}
