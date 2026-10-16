import React, { useState } from 'react';
import { User, Mail, Phone, Globe, Edit3, Camera, Check, X, ShieldCheck } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingRow } from '../ui/SettingRow';
import { ActionButton } from '../ui/ActionButton';

export const ProfileSettings = ({ user, onUpdateUser }) => {
  const [profileData, setProfileData] = useState(() => {
    // Try to load any previously saved local profile adjustments
    const localProfile = localStorage.getItem('cobuy_user_profile_overrides');
    const parsed = localProfile ? JSON.parse(localProfile) : {};
    return {
      name: user?.name || parsed.name || '',
      email: user?.email || '',
      phone: parsed.phone || '', // 'Not set' if empty
      timeZone: parsed.timeZone || '' // 'Not set' if empty
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profileData);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayName = profileData.name || user?.name || 'User';
  const displayEmail = profileData.email || user?.email || 'user@example.com';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'CB';

  const handleStartEdit = () => {
    setEditForm(profileData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Simulate async update
    await new Promise((resolve) => setTimeout(resolve, 300));
    setProfileData(editForm);
    localStorage.setItem('cobuy_user_profile_overrides', JSON.stringify(editForm));
    if (onUpdateUser) {
      onUpdateUser({ ...user, name: editForm.name });
    }
    setSaving(false);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SettingCard
        icon={User}
        title="Profile"
        description="Manage your personal information and account details."
        action={
          <ActionButton
            icon={Edit3}
            variant="secondary"
            size="sm"
            onClick={handleStartEdit}
            aria-label="Edit Profile"
          >
            Edit
          </ActionButton>
        }
      >
        {saveSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#10b981',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '1.25rem'
          }}>
            <Check size={16} /> Profile details saved successfully.
          </div>
        )}

        {/* User Identity Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '1.25rem',
          background: 'var(--inner-box-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              {initials}
            </div>
            <button
              type="button"
              aria-label="Upload avatar"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => alert('Avatar upload is managed by organization admin.')}
            >
              <Camera size={13} />
            </button>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {displayName}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.5rem 0' }}>
              {displayEmail}
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--primary-color)',
              border: '1px solid rgba(59, 130, 246, 0.25)'
            }}>
              <ShieldCheck size={12} />
              {user?.role ? user.role.replace('_', ' ') : 'STORE ADMIN'}
            </span>
          </div>
        </div>

        {/* Read-only / Current Values Rows */}
        <SettingRow icon={User} label="Full Name">
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>
            {displayName || <em style={{ color: 'var(--text-dim)' }}>Not set</em>}
          </span>
        </SettingRow>

        <SettingRow icon={Mail} label="Email Address">
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>
            {displayEmail}
          </span>
        </SettingRow>

        <SettingRow icon={Phone} label="Phone Number" description="Used for urgent account recovery notifications.">
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: profileData.phone ? 'var(--text-main)' : 'var(--text-dim)' }}>
            {profileData.phone || 'Not set'}
          </span>
        </SettingRow>

        <SettingRow icon={Globe} label="Time Zone" description="Determines timestamps on transaction batch runs.">
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: profileData.timeZone ? 'var(--text-main)' : 'var(--text-dim)' }}>
            {profileData.timeZone || 'Not set'}
          </span>
        </SettingRow>
      </SettingCard>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            background: 'var(--card-bg)',
            borderRadius: '14px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Edit Profile Information
              </h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="input"
                  value={editForm.email}
                  disabled
                  title="Email cannot be changed directly"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', opacity: 0.7, cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '3px', display: 'block' }}>
                  Primary account identifier (read-only).
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+1 (555) 000-0000"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Time Zone
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. (UTC-08:00) Pacific Time"
                  value={editForm.timeZone}
                  onChange={(e) => setEditForm({ ...editForm, timeZone: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <ActionButton variant="secondary" onClick={handleCancelEdit}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" variant="primary" loading={saving}>
                  Save Changes
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
