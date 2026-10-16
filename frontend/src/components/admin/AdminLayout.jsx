import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  Home,
  Building2,
  User,
  Database,
  TrendingUp,
  Award,
  FileText,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import { useAdminTheme } from '../../context/AdminThemeContext';

export default function AdminLayout({ user, onLogout, children }) {
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility: Escape closes sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/businesses')) return 'Businesses';
    if (path.includes('/users')) return 'Users';
    if (path.includes('/datasets')) return 'Datasets';
    if (path.includes('/analysis-history')) return 'Analysis History';
    if (path.includes('/evaluations')) return 'Evaluations';
    if (path.includes('/audit-logs')) return 'Audit Logs';
    if (path.includes('/settings')) return 'System Settings';
    if (path.includes('/profile')) return 'My Profile';
    return 'Admin Dashboard';
  };

  const navSections = [
    {
      group: 'BUSINESS MANAGEMENT',
      items: [
        { path: '/admin/businesses', label: 'Businesses', icon: Building2 },
        { path: '/admin/users', label: 'Users', icon: User }
      ]
    },
    {
      group: 'DATA & ANALYTICS',
      items: [
        { path: '/admin/datasets', label: 'Datasets', icon: Database },
        { path: '/admin/analysis-history', label: 'Analysis History', icon: TrendingUp },
        { path: '/admin/evaluations', label: 'Evaluations', icon: Award }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
        { path: '/admin/settings', label: 'System Settings', icon: Settings }
      ]
    },
    {
      group: 'ACCOUNT',
      items: [
        { path: '/admin/profile', label: 'My Profile', icon: User },
        { action: 'logout', label: 'Logout', icon: LogOut }
      ]
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--admin-bg)',
      color: 'var(--admin-text-primary)',
      transition: 'background 0.2s ease, color 0.2s ease'
    }}>
      {/* ── Permanent Top Header (Anchored navigation bar) ───────────────── */}
      <header
        id="admin-top-header"
        style={{
          height: '64px',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 60,
          background: 'var(--admin-header)',
          borderBottom: '1px solid var(--admin-card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}
      >
        {/* Left: Hamburger Button (Permanent 3-line icon, never changes to X) + CoBuy Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            id="admin-hamburger-btn"
            type="button"
            aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.45rem',
              borderRadius: '8px',
              color: isDark ? '#F5F7FA' : '#0f172a',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#2A3036' : '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Always exactly three-line hamburger icon */}
            <Menu size={22} />
          </button>

          {/* CoBuy Brand Logo & Pill - Remains fixed and visible in both states */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', userSelect: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" />
                <polyline points="2 12 12 17 22 12" stroke="#3b82f6" />
                <polyline points="2 17 12 22 22 17" stroke="#3b82f6" />
              </svg>
            </div>

            <span style={{
              fontFamily: 'Outfit, Inter, system-ui, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: isDark ? '#F5F7FA' : '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              CoBuy
            </span>

            <span style={{
              background: '#1d4ed8',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0
            }}>
              ADMIN
            </span>
          </div>
        </div>

        {/* Center: Global Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          width: '380px',
          maxWidth: '45%'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            placeholder="Search anything... (businesses, users, datasets...)"
            className="admin-input"
            style={{
              width: '100%',
              padding: '0.52rem 1rem 0.52rem 2.4rem',
              borderRadius: '24px',
              fontSize: '0.84rem'
            }}
          />
        </div>

        {/* Right: Quick Theme Toggle + User Profile Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Quick Light/Dark Toggle Button */}
          <button
            id="admin-theme-toggle-btn"
            type="button"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            onClick={toggleTheme}
            style={{
              background: isDark ? '#252A2F' : '#f1f5f9',
              border: `1px solid ${isDark ? '#3A424A' : '#e2e8f0'}`,
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDark ? '#f59e0b' : '#6366f1',
              transition: 'background 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#2A3036' : '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? '#252A2F' : '#f1f5f9'; }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Profile Pill with Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div
              id="admin-profile-header-pill"
              onClick={() => setShowProfileDropdown(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.35rem 0.75rem',
                background: isDark ? (showProfileDropdown ? '#2A3036' : '#20252A') : (showProfileDropdown ? '#e2e8f0' : '#f1f5f9'),
                borderRadius: '20px',
                border: `1px solid ${isDark ? '#343A40' : '#e2e8f0'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}>
                SA
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                  {user?.name || 'System Admin'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                  {user?.email || 'admin@ruleminer.ai'}
                </div>
              </div>
              <ChevronDown
                size={14}
                color={isDark ? '#8A939D' : '#64748b'}
                style={{ transform: showProfileDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </div>

            {/* Top Right Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                background: 'var(--admin-card)',
                borderRadius: '10px',
                border: '1px solid var(--admin-card-border)',
                boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid var(--admin-card-border)',
                  background: isDark ? '#1F2428' : '#f8fafc'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {user?.name || 'System Admin'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    {user?.email || 'admin@ruleminer.ai'}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      background: 'rgba(37, 99, 235, 0.15)',
                      color: '#60a5fa',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      letterSpacing: '0.05em'
                    }}>
                      SYSTEM ADMIN
                    </span>
                  </div>
                </div>

                <div style={{ padding: '0.5rem' }}>
                  <NavLink
                    to="/admin/profile"
                    onClick={() => setShowProfileDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      color: 'var(--admin-text-primary)',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#2A3036' : '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <User size={16} color={isDark ? '#8A939D' : '#475569'} />
                    <span>My Profile</span>
                  </NavLink>

                  <NavLink
                    to="/admin/settings"
                    onClick={() => setShowProfileDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      color: 'var(--admin-text-primary)',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#2A3036' : '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Settings size={16} color={isDark ? '#8A939D' : '#475569'} />
                    <span>System Settings</span>
                  </NavLink>
                </div>

                <div style={{ padding: '0.5rem', borderTop: '1px solid var(--admin-card-border)' }}>
                  <div
                    id="admin-logout-header-btn"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onLogout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={16} color="#ef4444" />
                    <span>Logout</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Backdrop Overlay (Dimming layer when sidebar is open) ────────── */}
      {sidebarOpen && (
        <div
          id="admin-sidebar-backdrop"
          className="admin-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Collapsible Overlay Sidebar (Pops out strictly below header) ─── */}
      <aside
        id="admin-collapsible-sidebar"
        className={`admin-sidebar admin-sidebar-overlay ${sidebarOpen ? 'admin-sidebar-open' : 'admin-sidebar-closed'}`}
        aria-hidden={!sidebarOpen}
        style={{
          background: 'var(--admin-sidebar)',
          borderRight: '1px solid var(--admin-card-border)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Navigation Content (NO duplicate logo; starts immediately with Dashboard) */}
        <nav style={{
          flex: 1,
          padding: '1rem 0.85rem',
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Main: Dashboard (Home icon) */}
          <NavLink
            to="/admin"
            end
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '0.85rem',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: location.pathname === '/admin' ? 600 : 500,
              color: location.pathname === '/admin' ? '#ffffff' : '#94a3b8',
              background: location.pathname === '/admin' ? '#2563eb' : 'transparent',
              boxShadow: location.pathname === '/admin' ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <Home size={18} color={location.pathname === '/admin' ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>Dashboard</span>
          </NavLink>

          {/* Navigation Sections */}
          {navSections.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: idx === navSections.length - 1 ? 0 : '0.85rem' }}>
              <div style={{
                fontSize: '0.67rem',
                fontWeight: 700,
                color: '#60a5fa',
                letterSpacing: '0.08em',
                padding: '0.15rem 0.85rem',
                marginBottom: '0.25rem',
                textTransform: 'uppercase'
              }}>
                {sec.group}
              </div>
              {sec.items.map((item, itemIdx) => {
                const Icon = item.icon;

                if (item.action === 'logout') {
                  return (
                    <div
                      key={itemIdx}
                      id="admin-sidebar-logout-btn"
                      onClick={() => {
                        setSidebarOpen(false);
                        onLogout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.52rem 0.85rem',
                        borderRadius: '8px',
                        marginBottom: '2px',
                        fontSize: '0.86rem',
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
                      <Icon size={18} color="#94a3b8" style={{ flexShrink: 0, transition: 'color 0.15s' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    </div>
                  );
                }

                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.52rem 0.85rem',
                      borderRadius: '8px',
                      marginBottom: '2px',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
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
                    <Icon size={18} color={isActive ? '#ffffff' : '#94a3b8'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content Area (Full screen width in both states) ─────────── */}
      <main
        id="admin-main-content"
        style={{
          flex: 1,
          width: '100%',
          marginLeft: 0,
          paddingTop: '64px',
          boxSizing: 'border-box',
          minHeight: '100vh',
          transition: 'background 0.2s ease, color 0.2s ease'
        }}
      >
        <div style={{ padding: '2rem', width: '100%', boxSizing: 'border-box' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
