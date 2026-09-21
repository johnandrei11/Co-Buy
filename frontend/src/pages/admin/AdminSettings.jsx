import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings,
  Save,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Shield,
  Database,
  Cpu,
  Globe,
  Palette,
  Sun,
  Moon,
  Check,
  Info
} from 'lucide-react';
import { useAdminTheme } from '../../context/AdminThemeContext';

const API_BASE = 'http://localhost:5000/api';

export default function AdminSettings() {
  const { theme: currentTheme, setTheme: setCurrentTheme, isDark } = useAdminTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    general: {
      system_name: 'CoBuy Rule Mining System',
      system_description: 'Intelligent Market Basket Analysis & Association Mining Platform',
      business_approval_required: 'true',
      default_language: 'English',
      timezone: 'UTC+08:00'
    },
    appearance: {
      theme: currentTheme || 'light'
    },
    analysis: {
      default_algorithm: 'auto',
      default_min_support: '0.01',
      default_min_confidence: '0.20',
      default_min_lift: '1.0'
    },
    data: {
      max_dataset_size_mb: '50',
      allowed_file_types: '.csv, .xlsx, .xls',
      data_retention_days: '365'
    },
    security: {
      session_timeout_minutes: '120',
      min_password_length: '6',
      require_special_char: 'false'
    }
  });

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/settings`);
      if (res.data.settings) {
        setSettings(prev => ({
          general: { ...prev.general, ...(res.data.settings.general || {}) },
          appearance: { ...prev.appearance, ...(res.data.settings.appearance || { theme: currentTheme }) },
          analysis: { ...prev.analysis, ...(res.data.settings.analysis || {}) },
          data: { ...prev.data, ...(res.data.settings.data || {}) },
          security: { ...prev.security, ...(res.data.settings.security || {}) }
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.response?.data?.error || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleThemeSelect = (newTheme) => {
    setCurrentTheme(newTheme);
    handleChange('appearance', 'theme', newTheme);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.put(`${API_BASE}/admin/settings`, settings);
      setSuccessMsg('System configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.error || 'Failed to persist settings.');
    } finally {
      setSaving(false);
    }
  };

  const approvedPalette = [
    { name: 'Main Background', hex: '#17191C', usage: 'Overall Admin page background' },
    { name: 'Header', hex: '#1F2428', usage: 'Permanent top header' },
    { name: 'Sidebar', hex: '#0B1F3A', usage: 'Collapsible navigation panel' },
    { name: 'Cards', hex: '#20252A', usage: 'Dashboard cards, panels, tables and containers' },
    { name: 'Card Borders', hex: '#343A40', usage: 'Subtle separation between components' },
    { name: 'Primary Text', hex: '#F5F7FA', usage: 'Main headings and important text' },
    { name: 'Secondary Text', hex: '#B8C0C8', usage: 'Supporting text and descriptions' },
    { name: 'Muted Text', hex: '#8A939D', usage: 'Low-priority metadata' },
    { name: 'Inputs', hex: '#252A2F', usage: 'Input / select backgrounds' },
    { name: 'Input Borders', hex: '#3A424A', usage: 'Form control borders' },
    { name: 'Hover', hex: '#2A3036', usage: 'Hover state for controls and navigation' }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Global System Configuration
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Control appearance, platform defaults, algorithm mining parameters, retention rules, and registration approvals.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.55rem 1.25rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}
        >
          {saving ? <RefreshCw size={16} className="spinning-icon" /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: isDark ? 'rgba(21, 128, 61, 0.15)' : '#f0fdf4',
          border: `1px solid ${isDark ? '#15803d' : '#bbf7d0'}`,
          borderRadius: '8px',
          color: isDark ? '#4ade80' : '#15803d',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: isDark ? 'rgba(185, 28, 28, 0.15)' : '#fef2f2',
          border: `1px solid ${isDark ? '#b91c1c' : '#fecaca'}`,
          borderRadius: '8px',
          color: isDark ? '#f87171' : '#b91c1c',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* Main Settings Card */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        border: '1px solid var(--admin-card-border)',
        boxShadow: 'var(--admin-shadow)',
        overflow: 'hidden',
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--admin-card-border)',
          background: isDark ? '#1F2428' : '#f8fafc',
          padding: '0 1rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 'general', label: 'General & Onboarding', icon: Globe },
            { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
            { id: 'analysis', label: 'Mining & Algorithms', icon: Cpu },
            { id: 'data', label: 'Data Retention & Limits', icon: Database },
            { id: 'security', label: 'Security & Auth', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.85rem 1.25rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#3b82f6' : 'var(--admin-text-muted)',
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s'
                }}
              >
                <Icon size={16} color={isActive ? '#3b82f6' : 'var(--admin-text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ padding: '2rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              <RefreshCw size={24} className="spinning-icon" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
              <div>Loading settings...</div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {/* ── Appearance Tab (PDF Pages 5-7 Specification) ─────────── */}
              {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 0.5rem' }}>
                      System Interface Appearance
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                      Choose between the approved CoBuy Light and Dark themes. The selection is remembered across future sessions.
                    </p>
                  </div>

                  {/* Visual Theme Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {/* Light Mode Card */}
                    <div
                      id="theme-card-light"
                      onClick={() => handleThemeSelect('light')}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: '#ffffff',
                        border: `2px solid ${!isDark ? '#2563eb' : '#e2e8f0'}`,
                        boxShadow: !isDark ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                            <Sun size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Light Theme</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Clean crisp background & dark navy sidebar</div>
                          </div>
                        </div>
                        {!isDark && (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} />
                          </div>
                        )}
                      </div>

                      {/* Mini Preview Box */}
                      <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                        <div style={{ width: '40px', height: '50px', background: '#0f172a', borderRadius: '4px' }}></div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ height: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div>
                          <div style={{ height: '30px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Dark Mode Card */}
                    <div
                      id="theme-card-dark"
                      onClick={() => handleThemeSelect('dark')}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: '#20252A',
                        border: `2px solid ${isDark ? '#2563eb' : '#343A40'}`,
                        boxShadow: isDark ? '0 0 0 2px rgba(37, 99, 235, 0.4)' : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#252A2F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                            <Moon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F5F7FA' }}>Dark Theme</div>
                            <div style={{ fontSize: '0.72rem', color: '#B8C0C8' }}>Approved palette (#17191C, #20252A, #0B1F3A)</div>
                          </div>
                        </div>
                        {isDark && (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} />
                          </div>
                        )}
                      </div>

                      {/* Mini Preview Box */}
                      <div style={{ padding: '0.75rem', background: '#17191C', borderRadius: '8px', border: '1px solid #343A40', display: 'flex', gap: '8px' }}>
                        <div style={{ width: '40px', height: '50px', background: '#0B1F3A', borderRadius: '4px' }}></div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ height: '14px', background: '#20252A', border: '1px solid #343A40', borderRadius: '4px' }}></div>
                          <div style={{ height: '30px', background: '#20252A', border: '1px solid #343A40', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approved Dark Mode Palette Reference (PDF Section 2) */}
                  <div style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid var(--admin-card-border)',
                    background: isDark ? '#1F2428' : '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <Info size={18} color="#3b82f6" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                        Approved CoBuy Dark Mode Palette Specifications
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--admin-card-border)', textAlign: 'left', color: 'var(--admin-text-muted)' }}>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>UI ELEMENT</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>HEX VALUE</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>SWATCH</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>USAGE DESCRIPTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedPalette.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                              <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{item.name}</td>
                              <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{item.hex}</td>
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <div style={{
                                  width: '28px',
                                  height: '18px',
                                  borderRadius: '4px',
                                  background: item.hex,
                                  border: '1px solid rgba(255,255,255,0.2)'
                                }} />
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--admin-text-secondary)' }}>{item.usage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── General Tab ─────────────────────────────────────────── */}
              {activeTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                      Platform Display Name
                    </label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.general.system_name}
                      onChange={(e) => handleChange('general', 'system_name', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                      System Description
                    </label>
                    <textarea
                      rows={2}
                      className="admin-input"
                      value={settings.general.system_description}
                      onChange={(e) => handleChange('general', 'system_description', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Merchant Registration Workflow
                      </label>
                      <select
                        className="admin-input"
                        value={settings.general.business_approval_required}
                        onChange={(e) => handleChange('general', 'business_approval_required', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      >
                        <option value="true">Require Admin Approval Before Access</option>
                        <option value="false">Automatic Immediate Activation</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        System Timezone
                      </label>
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.general.timezone}
                        onChange={(e) => handleChange('general', 'timezone', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Analysis Tab ────────────────────────────────────────── */}
              {activeTab === 'analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                      Default Rule Mining Algorithm
                    </label>
                    <select
                      className="admin-input"
                      value={settings.analysis.default_algorithm}
                      onChange={(e) => handleChange('analysis', 'default_algorithm', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="auto">Auto-Select (Optimized Dynamic Engine)</option>
                      <option value="fpgrowth">FP-Growth (High-Speed Pattern Tree)</option>
                      <option value="apriori">Apriori (Classical Candidate Generation)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Default Min Support (0.001 - 0.5)
                      </label>
                      <input
                        type="number"
                        step="0.005"
                        className="admin-input"
                        value={settings.analysis.default_min_support}
                        onChange={(e) => handleChange('analysis', 'default_min_support', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Default Min Confidence (0.05 - 1.0)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        className="admin-input"
                        value={settings.analysis.default_min_confidence}
                        onChange={(e) => handleChange('analysis', 'default_min_confidence', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Default Min Lift
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="admin-input"
                        value={settings.analysis.default_min_lift}
                        onChange={(e) => handleChange('analysis', 'default_min_lift', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Data Tab ────────────────────────────────────────────── */}
              {activeTab === 'data' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Max Dataset Upload Size (MB)
                      </label>
                      <input
                        type="number"
                        className="admin-input"
                        value={settings.data.max_dataset_size_mb}
                        onChange={(e) => handleChange('data', 'max_dataset_size_mb', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Platform Data Retention (Days)
                      </label>
                      <input
                        type="number"
                        className="admin-input"
                        value={settings.data.data_retention_days}
                        onChange={(e) => handleChange('data', 'data_retention_days', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                      Allowed File Extensions
                    </label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.data.allowed_file_types}
                      onChange={(e) => handleChange('data', 'allowed_file_types', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              {/* ── Security Tab ────────────────────────────────────────── */}
              {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Session Timeout (Minutes)
                      </label>
                      <input
                        type="number"
                        className="admin-input"
                        value={settings.security.session_timeout_minutes}
                        onChange={(e) => handleChange('security', 'session_timeout_minutes', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
                        Minimum Password Length
                      </label>
                      <input
                        type="number"
                        className="admin-input"
                        value={settings.security.min_password_length}
                        onChange={(e) => handleChange('security', 'min_password_length', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Save Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '1.25rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.6rem 1.5rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  {saving ? <RefreshCw size={16} className="spinning-icon" /> : <Save size={16} />}
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
