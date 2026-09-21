import React, { useState, useEffect } from 'react';
import { Sliders, Store, Eye, Sun, Moon, Monitor, Globe, Check } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingRow } from '../ui/SettingRow';
import { Select } from '../ui/Select';
import { SegmentedControl } from '../ui/SegmentedControl';
import { generalPreferencesAdapter } from '../adapters/settingsAdapters';

export const GeneralSettings = ({ user, theme, onThemeChange }) => {
  const [generalPrefs, setGeneralPrefs] = useState(() => generalPreferencesAdapter.getPreferences());
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Active workspace from user account
  const currentWorkspace = user?.store_name || 'Default Workspace';
  const workspaceOptions = [
    { value: currentWorkspace, label: currentWorkspace }
  ];

  const projectViewOptions = [
    { value: 'Overview', label: 'Overview' },
    { value: 'Analytics', label: 'Analytics' },
    { value: 'Evaluation', label: 'Evaluation' },
    { value: 'History', label: 'History' }
  ];

  const languageOptions = [
    { value: 'English (US)', label: 'English (US)' },
    { value: 'English (UK)', label: 'English (UK)' }
  ];

  // Theme resolution: check if theme preference is 'system'
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('theme_preference') || (theme === 'light' ? 'light' : 'dark');
  });

  const showFeedback = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleWorkspaceChange = (val) => {
    // Single workspace supported by current user scope
    showFeedback();
  };

  const handleDefaultProjectViewChange = (val) => {
    const updated = { ...generalPrefs, defaultProjectView: val };
    setGeneralPrefs(updated);
    generalPreferencesAdapter.savePreferences(updated);
    showFeedback();
  };

  const handleLanguageChange = (val) => {
    const updated = { ...generalPrefs, language: val };
    setGeneralPrefs(updated);
    generalPreferencesAdapter.savePreferences(updated);
    showFeedback();
  };

  const handleThemeModeChange = (mode) => {
    setThemePreference(mode);
    localStorage.setItem('theme_preference', mode);

    let effectiveTheme = mode;
    if (mode === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem('theme', effectiveTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: effectiveTheme }));
    if (onThemeChange) {
      onThemeChange(effectiveTheme);
    }
    showFeedback();
  };

  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e) => {
        const nextTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
        if (onThemeChange) onThemeChange(nextTheme);
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [themePreference, onThemeChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SettingCard
        icon={Sliders}
        title="General"
        description="Configure your workspace, default settings and application preferences."
        action={
          savedFeedback && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <Check size={14} /> Saved
            </div>
          )
        }
      >
        <SettingRow
          icon={Store}
          label="Workspace"
          description="The active workspace store currently linked to your session."
        >
          <Select
            id="setting-workspace-select"
            aria-label="Workspace"
            icon={Store}
            value={currentWorkspace}
            options={workspaceOptions}
            onChange={handleWorkspaceChange}
          />
        </SettingRow>

        <SettingRow
          icon={Eye}
          label="Default Project View"
          description="The initial dashboard view displayed upon opening a project."
        >
          <Select
            id="setting-default-project-view"
            aria-label="Default Project View"
            icon={Eye}
            value={generalPrefs.defaultProjectView}
            options={projectViewOptions}
            onChange={handleDefaultProjectViewChange}
          />
        </SettingRow>

        <SettingRow
          icon={Sun}
          label="Interface Theme"
          description="Choose between bright light mode, living dark mode, or follow your operating system."
        >
          <SegmentedControl
            ariaLabel="Interface Theme"
            value={themePreference}
            onChange={handleThemeModeChange}
            options={[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor }
            ]}
          />
        </SettingRow>

        <SettingRow
          icon={Globe}
          label="Language"
          description="Application display language for navigation and reports."
        >
          <Select
            id="setting-language-select"
            aria-label="Language"
            icon={Globe}
            value={generalPrefs.language}
            options={languageOptions}
            onChange={handleLanguageChange}
          />
        </SettingRow>
      </SettingCard>
    </div>
  );
};
