import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  RefreshCw
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminProfile({ user, onUpdateUser }) {
  const [name, setName] = useState(user?.name || 'System Admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword && !currentPassword) {
      setError('Current password is required to set a new password.');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/admin/profile`, {
        name,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined
      });
      setSuccessMsg('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onUpdateUser && res.data.user) {
        onUpdateUser(res.data.user);
      }
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
          System Administrator Profile
        </h2>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>
          Manage your administrator account credentials, master access key, and personal details.
        </p>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#15803d',
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
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid var(--admin-card-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Profile Card Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          paddingBottom: '1.75rem',
          borderBottom: '1px solid var(--admin-border-subtle)',
          marginBottom: '1.75rem'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.35rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            SA
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
              {user?.name || 'System Administrator'}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Mail size={14} />
              <span>{user?.email || 'admin@ruleminer.ai'}</span>
              <span>•</span>
              <span style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                SYSTEM ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Update Form */}
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
              Administrator Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>
              Email Address (Read-Only)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'admin@ruleminer.ai'}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--admin-border-subtle)', background: 'var(--admin-subtle-bg)', color: 'var(--admin-text-secondary)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--admin-border-subtle)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={16} color="#2563eb" />
              <span>Change Administrator Password</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
                  Current Password (leave blank if keeping current password)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
              {saving ? <RefreshCw size={16} className="spinning-icon" /> : null}
              <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
