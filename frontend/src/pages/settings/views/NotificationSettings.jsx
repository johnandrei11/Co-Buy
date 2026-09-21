import React, { useState, useEffect } from 'react';
import { Bell, Mail, AppWindow, FolderSync, Megaphone, Check, Loader2 } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';
import { notificationPreferencesAdapter } from '../adapters/settingsAdapters';

export const NotificationSettings = () => {
  const [preferences, setPreferences] = useState(() => notificationPreferencesAdapter.getPreferences());
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = async (key, val) => {
    const updated = {
      ...preferences,
      [key]: val
    };
    setPreferences(updated);
    setIsSaving(true);
    setError('');

    try {
      await notificationPreferencesAdapter.savePreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      setError('Failed to persist preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SettingCard
        icon={Bell}
        title="Notifications"
        description="Choose how and when CoBuy delivers notifications and updates to you."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSaving && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
              </span>
            )}
            {savedSuccess && !isSaving && (
              <span style={{
                fontSize: '0.8rem',
                color: '#10b981',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <Check size={13} /> Preferences Saved
              </span>
            )}
          </div>
        }
      >
        {error && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            {error}
          </div>
        )}

        <SettingRow
          icon={Mail}
          label="Email Notifications"
          description="Receive daily activity digests, invitation updates, and critical store events via email."
        >
          <Toggle
            id="toggle-email-notifications"
            label="Email Notifications"
            checked={preferences.emailNotifications}
            onChange={(val) => handleToggle('emailNotifications', val)}
          />
        </SettingRow>

        <SettingRow
          icon={AppWindow}
          label="In-App Notifications"
          description="Display alert popovers and badge counters inside the top navigation bell."
        >
          <Toggle
            id="toggle-inapp-notifications"
            label="In-App Notifications"
            checked={preferences.inAppNotifications}
            onChange={(val) => handleToggle('inAppNotifications', val)}
          />
        </SettingRow>

        <SettingRow
          icon={FolderSync}
          label="Project Updates"
          description="Notify when new transaction datasets are uploaded, cleaned, or mining tasks finish."
        >
          <Toggle
            id="toggle-project-updates"
            label="Project Updates"
            checked={preferences.projectUpdates}
            onChange={(val) => handleToggle('projectUpdates', val)}
          />
        </SettingRow>

        <SettingRow
          icon={Megaphone}
          label="System Announcements"
          description="Important updates regarding algorithm enhancements, platform maintenance, and release notes."
        >
          <Toggle
            id="toggle-system-announcements"
            label="System Announcements"
            checked={preferences.systemAnnouncements}
            onChange={(val) => handleToggle('systemAnnouncements', val)}
          />
        </SettingRow>
      </SettingCard>
    </div>
  );
};
