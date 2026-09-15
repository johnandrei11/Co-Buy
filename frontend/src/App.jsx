import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  User,
  LogOut,
  Zap,
  Layers,
  Database,
  History,
  Moon,
  Sun,
  Bell,
  ScrollText,
  UserPlus,
  Copy,
  Check,
  X,
  ChevronDown,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  HelpCircle
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Evaluation from './pages/Evaluation';
import SettingsPage from './pages/Settings';
import Profile from './pages/Profile';
import Dataset from './pages/Dataset';
import Login, { PendingActivation, JoinPage } from './pages/Login';
import ActivityLog from './pages/ActivityLog';
import Logo from './components/Logo';
import GlobalNavbarSearch from './components/GlobalNavbarSearch';
import './index.css';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.email) {
        config.headers['X-User-Email'] = user.email;
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeDatasetId');
      localStorage.removeItem('activeDatasetName');
      sessionStorage.clear();
      window.dispatchEvent(new Event('auth-session-expired'));
    }
    return Promise.reject(error);
  }
);

// ── Invite Panel (shown inside sidebar for admins) ────────────────────────────
const InvitePanel = ({ user, onClose }) => {
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!email.trim()) {
      setError('Email address is required to send an invitation.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/v1/invitations/generate`, { email: email.trim().toLowerCase() });
      const fullUrl = `${window.location.origin}${res.data.invite_url}`;
      setInviteUrl(fullUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '440px', padding: '2rem',
        margin: '1rem',
        boxShadow: '0 24px 48px rgba(0,0,0,0.8), inset 1px 1px 0 rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Invite Team Member
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Send a secure 48-hour invitation link by email.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {user?.store_name && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '8px', padding: '0.625rem 0.875rem', marginBottom: '1.25rem',
            fontSize: '0.83rem', color: 'var(--text-muted)'
          }}>
            <Store size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
            <span>Inviting to: <strong style={{ color: 'var(--text-main)' }}>{user.store_name}</strong></span>
          </div>
        )}

        {!inviteUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Member's Email Address <span style={{ color: '#ef4444', fontWeight: 600 }}>*</span></label>
              <input
                type="email"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                autoFocus
              />
            </div>
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#ef4444', margin: 0 }}>{error}</p>
            )}
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{ height: '42px' }}
            >
              {loading ? (
                <div className="spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--bg-color)', borderTopColor: 'transparent' }} />
              ) : 'Send Invitation'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.82rem', color: '#10b981', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={14} /> Invitation sent to <strong>{email}</strong>!
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>They'll also see a notification in their bell icon once they log in. Share this backup link:</p>
            <div style={{
              background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)',
              borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.875rem',
              fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
              wordBreak: 'break-all', lineHeight: 1.5
            }}>
              {inviteUrl}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleCopy}
                style={{ flex: 1, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setInviteUrl(''); setEmail(''); }}
                style={{ height: '40px', padding: '0 1rem' }}
              >
                New Invite
              </button>
            </div>
            <p style={{ fontSize: '0.77rem', color: 'var(--text-dim)', marginTop: '0.75rem', textAlign: 'center' }}>
              ⏳ Expires in 48 hours · Single-use only
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Notification Bell ─────────────────────────────────────────────────────────
const NotificationBell = ({ user, onLogin }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_BASE}/notifications`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAccept = async (notif) => {
    setLoadingId(notif.id);
    try {
      const res = await axios.post(`${API_BASE}/v1/invitations/${notif.reference_id}/accept`);
      if (res.data.user && res.data.token && onLogin) {
        onLogin(res.data.token, res.data.user);
      }
      fetchNotifications();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (notif) => {
    setLoadingId(`d-${notif.id}`);
    try {
      await axios.post(`${API_BASE}/v1/invitations/${notif.reference_id}/decline`);
      fetchNotifications();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to decline invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await axios.post(`${API_BASE}/notifications/${notifId}/read`);
      fetchNotifications();
    } catch (e) { /* silent */ }
  };

  const typeLabel = (type) => {
    if (type === 'invitation_received') return 'Store Invitation';
    if (type === 'invitation_accepted') return 'Invite Accepted';
    if (type === 'invitation_declined') return 'Invite Declined';
    return type;
  };

  const typeColor = (type) => {
    if (type === 'invitation_received') return '#3b82f6';
    if (type === 'invitation_accepted') return '#10b981';
    if (type === 'invitation_declined') return '#f43f5e';
    return '#94a3b8';
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts + 'Z').getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-muted)',
          padding: '8px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="Notifications"
      >
        <Bell size={20} style={{ color: unreadCount > 0 ? 'var(--primary-color)' : 'var(--text-dim)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16,
            background: '#ef4444',
            borderRadius: '50%',
            fontSize: '0.65rem', fontWeight: 700,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-color)',
            lineHeight: 1
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 480,
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          zIndex: 2000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--inner-box-bg)'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={async () => { await axios.post(`${API_BASE}/notifications/read-all`); fetchNotifications(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <Bell size={28} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <div>No notifications</div>
              </div>
            ) : notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: notif.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                  transition: 'background 0.2s'
                }}
              >
                {/* Badge + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: typeColor(notif.type),
                    background: `${typeColor(notif.type)}18`,
                    border: `1px solid ${typeColor(notif.type)}30`,
                    padding: '0.15rem 0.5rem', borderRadius: '20px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {typeLabel(notif.type)}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={10} />
                    {timeAgo(notif.created_at)}
                  </span>
                </div>

                {/* Body */}
                {notif.type === 'invitation_received' && (
                  <>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem', lineHeight: 1.45 }}>
                      You've been invited to join
                      <strong style={{ color: 'var(--text-main)' }}> {notif.store_name || 'a store'}</strong>
                      {notif.invited_by && <> by <strong style={{ color: 'var(--text-main)' }}>{notif.invited_by}</strong></>}.
                    </p>
                    {notif.inv_status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          id={`accept-invite-${notif.reference_id}`}
                          onClick={() => handleAccept(notif)}
                          disabled={loadingId === notif.id}
                          style={{
                            flex: 1, padding: '0.4rem 0', borderRadius: '6px',
                            background: '#10b981', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            opacity: loadingId === notif.id ? 0.6 : 1
                          }}
                        >
                          {loadingId === notif.id
                            ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                            : <><CheckCircle2 size={13} /> Accept</>}
                        </button>
                        <button
                          id={`decline-invite-${notif.reference_id}`}
                          onClick={() => handleDecline(notif)}
                          disabled={loadingId === `d-${notif.id}`}
                          style={{
                            flex: 1, padding: '0.4rem 0', borderRadius: '6px',
                            background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                            border: '1px solid rgba(244,63,94,0.25)', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            opacity: loadingId === `d-${notif.id}` ? 0.6 : 1
                          }}
                        >
                          <XCircle size={13} /> Decline
                        </button>
                      </div>
                    )}
                    {notif.inv_status === 'accepted' && (
                      <p style={{ fontSize: '0.78rem', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={12} /> Accepted
                      </p>
                    )}
                    {notif.inv_status === 'declined' && (
                      <p style={{ fontSize: '0.78rem', color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <XCircle size={12} /> Declined
                      </p>
                    )}
                  </>
                )}

                {notif.type === 'invitation_accepted' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    A team member accepted your invitation to <strong style={{ color: 'var(--text-main)' }}>{notif.store_name || 'your store'}</strong>.
                  </p>
                )}

                {notif.type === 'invitation_declined' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    A team member declined your invitation to <strong style={{ color: 'var(--text-main)' }}>{notif.store_name || 'your store'}</strong>.
                  </p>
                )}

                {!notif.read && notif.type !== 'invitation_received' && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem', padding: 0 }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({ onLogout, user, theme, onToggleTheme, onOpenInvite }) => {
  // isAdmin is purely a UX hint to hide/show nav items.
  // Actual security enforcement happens server-side via role column.
  const isAdmin = user?.role === 'shop_admin';

  const location = useLocation();
  const hasAnalyticsResults = Boolean(sessionStorage.getItem('analytics_results'));
  const isSetupState = location.pathname === '/analytics' && !hasAnalyticsResults;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ paddingBottom: '1.25rem' }}>
        <Logo size="md" />
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {isAdmin ? <ScrollText size={20} /> : <LayoutDashboard size={20} />}
          <span>{isAdmin ? 'Audit Log' : 'Dashboard'}</span>
        </NavLink>
        {!isAdmin && (
          <>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Analytics</span>
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <History size={20} />
              <span>History</span>
            </NavLink>
          </>
        )}
        {isAdmin && (
          <NavLink to="/evaluation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Layers size={20} />
            <span>Evaluation</span>
          </NavLink>
        )}
      </nav>

      {/* Quick Guide Card from Reference A & B */}
      <div className="cobuy-sidebar-guide-card">
        <div className="cobuy-sidebar-guide-icon">
          <HelpCircle size={18} />
        </div>
        <div className="cobuy-sidebar-guide-title">
          {isSetupState ? 'Need help getting started?' : 'Not sure how it works?'}
        </div>
        <div className="cobuy-sidebar-guide-desc">
          {isSetupState
            ? 'Follow the steps to upload your dataset, verify columns, and run analysis to unlock customer recommendations.'
            : 'This page shows the most frequently bought products, top sellers, and useful recommendations based on your sales data.'}
        </div>
        <Link to="/analytics" className="cobuy-sidebar-guide-link">
          Quick Guide →
        </Link>
      </div>

      <div className="sidebar-footer">
        {isAdmin && (
          <div
            onClick={onOpenInvite}
            className="nav-link"
            style={{ cursor: 'pointer', background: 'rgba(16,185,129,0.08)', color: '#10b981', marginBottom: '0.25rem' }}
          >
            <UserPlus size={20} />
            <span>Invite Member</span>
          </div>
        )}
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <User size={20} />
          <span>Profile</span>
        </NavLink>
        <div
          onClick={onLogout}
          className="nav-link"
          style={{ cursor: 'pointer' }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
};



// ── Join Route wrapper (reads ?token from URL) ────────────────────────────────
const JoinRoute = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  return (
    <JoinPage
      token={token}
      onLogin={onLogin}
      onGoToLogin={() => navigate('/login')}
    />
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [showInvitePanel, setShowInvitePanel] = useState(false);

  const isAdmin = user?.role === 'shop_admin';
  const isUnlinkedMember = user?.role === 'team_member' && !user?.store_id;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        handleSessionExpired();
      }
    };
    window.addEventListener('auth-session-expired', handleSessionExpired);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('activeDatasetId');
    localStorage.removeItem('activeDatasetName');
    sessionStorage.clear();
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeDatasetId');
    localStorage.removeItem('activeDatasetName');
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/join" element={<JoinRoute onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
          {showInvitePanel && (
            <InvitePanel user={user} onClose={() => setShowInvitePanel(false)} />
          )}
          <Sidebar
            onLogout={handleLogout}
            user={user}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenInvite={() => setShowInvitePanel(true)}
          />
          <main className="main-content" style={{ paddingTop: '6rem' }}>
            {/* Global Top Navbar matching Reference Screens A & B */}
            <header className="cobuy-top-navbar">
              <GlobalNavbarSearch />

              <div className="cobuy-top-right-group">
                <button
                  id="theme-toggle-btn"
                  onClick={handleToggleTheme}
                  className="cobuy-top-icon-btn"
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun size={17} style={{ color: '#f59e0b' }} />
                  ) : (
                    <Moon size={17} style={{ color: '#6366f1' }} />
                  )}
                </button>
                <NotificationBell user={user} onLogin={handleLogin} />

                <NavLink to="/profile" className="cobuy-user-header-pill">
                  <div className="cobuy-user-avatar">
                    {(user?.full_name || user?.name || user?.email || 'JA').charAt(0).toUpperCase()}
                  </div>
                  <span className="cobuy-user-name">
                    {user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'John Andreil')}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />
                </NavLink>
              </div>
            </header>
            <Routes>
              <Route path="/" element={isAdmin ? <ActivityLog /> : <Dashboard />} />
              <Route path="/analytics" element={!isAdmin ? <Analytics /> : <Navigate to="/" replace />} />
              <Route path="/evaluation" element={user?.role === 'shop_admin' ? <Evaluation /> : <Navigate to="/" replace />} />
              <Route path="/history" element={!isAdmin ? <Dataset /> : <Navigate to="/" replace />} />
              <Route path="/data" element={<Navigate to="/history" replace />} />
              <Route path="/audit-log" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
