import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  LayoutDashboard,
  BarChart3,
  History,
  Layers,
  ScrollText,
  Settings,
  User,
  LogOut,
  UserPlus,
  HelpCircle,
  Sun,
  Moon,
  ChevronDown,
  Store
} from 'lucide-react';
import Logo from './Logo';
import GlobalNavbarSearch from './GlobalNavbarSearch';
import NotificationBell from './NotificationBell';

export default function UserLayout({
  user,
  theme,
  onToggleTheme,
  onLogout,
  onLogin,
  onOpenInvite,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'shop_admin' || user?.role === 'business_admin';
  const hasAnalyticsResults = Boolean(sessionStorage.getItem('analytics_results'));
  const isSetupState = location.pathname === '/analytics' && !hasAnalyticsResults;

  const [currentTheme, setCurrentTheme] = useState(() => {
    return theme || document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (e) => {
      const t = e?.detail || document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
      setCurrentTheme(prev => (prev !== t ? t : prev));
    };

    window.addEventListener('theme-change', handleThemeChange);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          setCurrentTheme(prev => (prev !== newTheme ? newTheme : prev));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const handleThemeButtonClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const current = document.documentElement.getAttribute('data-theme') || currentTheme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setCurrentTheme(next);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: next }));
    }, 0);
    if (onToggleTheme) {
      onToggleTheme(next);
    }
  };

  const isDark = currentTheme === 'dark';

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Keyboard accessibility: Escape closes sidebar or dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false);
        if (profileDropdownOpen) setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, profileDropdownOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Merchant');
  const userInitials = displayName
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg-color)',
      color: 'var(--text-main)',
      transition: 'background 0.2s ease, color 0.2s ease'
    }}>
      {/* ── Permanent Fixed Top Header (64px) ─────────────────────────────── */}
      <header
        id="user-top-header"
        className="user-top-header"
        style={{
          height: '64px',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}
      >
        {/* Left: Permanent 3-line Hamburger Menu Button (Invariant: never transforms to X) + CoBuy Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            id="user-hamburger-btn"
            type="button"
            aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.15s ease'
            }}
            title="Toggle navigation"
          >
            {/* STRICT INVARIANT: Always 3 horizontal lines (Menu), never changes to 'X' */}
            <Menu size={22} />
          </button>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '0.75rem' }}>
            <Logo size="md" />
            {user?.store_name && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
                color: '#3b82f6',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                <Store size={12} />
                <span>{user.store_name}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ flex: 1, maxWidth: '420px', margin: '0 1.5rem' }}>
          <GlobalNavbarSearch />
        </div>

        {/* Right Group: Theme Toggle, Notifications & User Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Sun/Moon Theme Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={handleThemeButtonClick}
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '7px 9px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? (
              <Sun size={17} style={{ color: '#f59e0b' }} />
            ) : (
              <Moon size={17} style={{ color: '#6366f1' }} />
            )}
          </button>

          {/* Notification Bell */}
          <NotificationBell user={user} onLogin={onLogin} />

          {/* User Profile Pill & Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                padding: '4px 10px 4px 6px',
                borderRadius: '24px',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {userInitials}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                {displayName}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-dim)', marginLeft: '2px' }} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '250px',
                background: isDark ? '#1e293b' : '#ffffff',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: isDark ? '0 16px 36px rgba(0,0,0,0.6)' : '0 12px 28px rgba(0,0,0,0.08)',
                zIndex: 200,
                overflow: 'hidden',
                animation: 'cobuyDropdownIn 0.18s ease-out forwards'
              }}>
                {/* User Identity Header */}
                <div style={{
                  padding: '1rem',
                  borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                  background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc'
                }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {user?.email || 'user@ruleminer.ai'}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: isAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                      color: isAdmin ? '#3b82f6' : '#10b981',
                      border: isAdmin ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(16,185,129,0.3)',
                      padding: '1px 7px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {user?.role ? user.role.replace('_', ' ') : 'MERCHANT'}
                    </span>
                  </div>
                </div>

                {/* Dropdown Items */}
                <div style={{ padding: '0.4rem' }}>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (onOpenInvite) onOpenInvite();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.55rem 0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#10b981',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <UserPlus size={16} />
                      <span>Invite Team Member</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.55rem 0.75rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/settings');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.55rem 0.75rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Settings size={16} style={{ color: 'var(--text-muted)' }} />
                    <span>System Settings</span>
                  </button>

                  <div style={{ height: '1px', background: isDark ? '#334155' : '#f1f5f9', margin: '0.4rem 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.55rem 0.75rem',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Dimming Backdrop when Sidebar is Open ────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 85,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      {/* ── Collapsible Overlay Sidebar (Drops down strictly below 64px header) ── */}
      <aside
        className="sidebar user-sidebar-overlay"
        style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          bottom: 0,
          width: '260px',
          height: 'calc(100vh - 64px)',
          zIndex: 90,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: 0,
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          background: isDark ? '#0B1F3A' : '#0f172a',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: sidebarOpen ? (isDark ? '6px 0 24px rgba(0,0,0,0.5)' : '6px 0 20px rgba(0,0,0,0.25)') : 'none',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        <nav
          style={{
            padding: '0.85rem 0.85rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {/* Main Dashboard item */}
          {(() => {
            const isDashboardActive = location.pathname === '/';
            const DashIcon = isAdmin ? ScrollText : LayoutDashboard;
            const dashLabel = isAdmin ? 'Audit Log' : 'Dashboard';
            return (
              <NavLink
                to="/"
                end
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.52rem 0.85rem',
                  borderRadius: '8px',
                  marginBottom: '0.65rem',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  lineHeight: 1.3,
                  fontWeight: isDashboardActive ? 600 : 500,
                  color: isDashboardActive ? '#ffffff' : '#94a3b8',
                  background: isDashboardActive ? '#2563eb' : 'transparent',
                  boxShadow: isDashboardActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!isDashboardActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDashboardActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#94a3b8';
                  }
                }}
              >
                <DashIcon size={18} color={isDashboardActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                <span style={{ whiteSpace: 'nowrap' }}>{dashLabel}</span>
              </NavLink>
            );
          })()}

          {/* Section: Analytics & Tools */}
          <div style={{
            fontSize: '0.67rem',
            fontWeight: 700,
            color: '#60a5fa',
            letterSpacing: '0.08em',
            padding: '0.2rem 0.85rem',
            marginBottom: '0.25rem',
            textTransform: 'uppercase'
          }}>
            Analytics & Tools
          </div>

          {!isAdmin && (
            <>
              {(() => {
                const isActive = location.pathname.startsWith('/analytics');
                return (
                  <NavLink
                    to="/analytics"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.52rem 0.85rem',
                      borderRadius: '8px',
                      marginBottom: '3px',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      lineHeight: 1.3,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive ? '#2563eb' : 'transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#ffffff';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = '#94a3b8';
                      }
                    }}
                  >
                    <BarChart3 size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>Analytics</span>
                  </NavLink>
                );
              })()}

              {(() => {
                const isActive = location.pathname.startsWith('/history') || location.pathname.startsWith('/data');
                return (
                  <NavLink
                    to="/history"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.52rem 0.85rem',
                      borderRadius: '8px',
                      marginBottom: '3px',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      lineHeight: 1.3,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive ? '#2563eb' : 'transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#ffffff';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = '#94a3b8';
                      }
                    }}
                  >
                    <History size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>History</span>
                  </NavLink>
                );
              })()}
            </>
          )}

          {isAdmin && (
            (() => {
              const isActive = location.pathname.startsWith('/evaluation');
              return (
                <NavLink
                  to="/evaluation"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.52rem 0.85rem',
                    borderRadius: '8px',
                    marginBottom: '3px',
                    textDecoration: 'none',
                    fontSize: '0.86rem',
                    lineHeight: 1.3,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive ? '#2563eb' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#ffffff';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = '#94a3b8';
                    }
                  }}
                >
                  <Layers size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Evaluation</span>
                </NavLink>
              );
            })()
          )}

          {/* Section: Account & Preferences */}
          <div style={{
            fontSize: '0.67rem',
            fontWeight: 700,
            color: '#60a5fa',
            letterSpacing: '0.08em',
            padding: '0.2rem 0.85rem',
            marginTop: '0.75rem',
            marginBottom: '0.25rem',
            textTransform: 'uppercase'
          }}>
            Account
          </div>

          {isAdmin && (
            <div
              onClick={() => {
                setSidebarOpen(false);
                if (onOpenInvite) onOpenInvite();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.52rem 0.85rem',
                borderRadius: '8px',
                marginBottom: '3px',
                fontSize: '0.86rem',
                lineHeight: 1.3,
                fontWeight: 600,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
            >
              <UserPlus size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>Invite Member</span>
            </div>
          )}

          {(() => {
            const isActive = location.pathname.startsWith('/settings');
            return (
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.52rem 0.85rem',
                  borderRadius: '8px',
                  marginBottom: '3px',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  lineHeight: 1.3,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? '#2563eb' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#94a3b8';
                  }
                }}
              >
                <Settings size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                <span style={{ whiteSpace: 'nowrap' }}>Settings</span>
              </NavLink>
            );
          })()}

          {(() => {
            const isActive = location.pathname.startsWith('/profile');
            return (
              <NavLink
                to="/profile"
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.52rem 0.85rem',
                  borderRadius: '8px',
                  marginBottom: '3px',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  lineHeight: 1.3,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? '#2563eb' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '#94a3b8';
                  }
                }}
              >
                <User size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
                <span style={{ whiteSpace: 'nowrap' }}>Profile</span>
              </NavLink>
            );
          })()}

          <div
            onClick={() => {
              setSidebarOpen(false);
              if (onLogout) onLogout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.52rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '3px',
              fontSize: '0.86rem',
              lineHeight: 1.3,
              fontWeight: 500,
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
              const icon = e.currentTarget.querySelector('svg');
              if (icon) icon.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
              const icon = e.currentTarget.querySelector('svg');
              if (icon) icon.style.color = '#94a3b8';
            }}
          >
            <LogOut size={18} color="#94a3b8" style={{ flexShrink: 0, transition: 'color 0.15s ease' }} />
            <span style={{ whiteSpace: 'nowrap' }}>Logout</span>
          </div>

          {/* Quick Guide Card flowing naturally below navigation */}
          <div style={{ marginTop: '0.85rem', padding: '0 0.1rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '0.85rem 0.95rem',
              boxSizing: 'border-box'
            }}>
              <div style={{ color: '#60a5fa', marginBottom: '0.35rem', display: 'flex', alignItems: 'center' }}>
                <HelpCircle size={17} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                {isSetupState ? 'Need help getting started?' : 'Not sure how it works?'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '0.45rem' }}>
                {isSetupState
                  ? 'Upload your dataset, verify columns, and run analysis to unlock customer recommendations.'
                  : 'View frequently bought products, top sellers, and useful recommendations.'}
              </div>
              <Link
                to="/analytics"
                onClick={() => setSidebarOpen(false)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#60a5fa',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
              >
                Quick Guide →
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* ── Main Full-Screen Content Area (marginLeft: 0) ────────────────── */}
      <main
        style={{
          marginLeft: 0,
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          paddingTop: '64px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ padding: '1.5rem 2rem', maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
