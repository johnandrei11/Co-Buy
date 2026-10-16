import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsLayout, SETTINGS_SECTIONS } from './settings/SettingsLayout';
import { GeneralSettings } from './settings/views/GeneralSettings';
import { ProfileSettings } from './settings/views/ProfileSettings';
import { SecurityPrivacySettings } from './settings/views/SecurityPrivacySettings';
import { NotificationSettings } from './settings/views/NotificationSettings';
import { AppearanceSettings } from './settings/views/AppearanceSettings';
import { appearancePreferencesAdapter } from './settings/adapters/settingsAdapters';

const Settings = ({ user: propUser, theme: propTheme, onThemeChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') || searchParams.get('section');

  const [activeSection, setActiveSection] = useState(() => {
    if (currentTabParam && SETTINGS_SECTIONS.some((s) => s.id === currentTabParam)) {
      return currentTabParam;
    }
    return 'general';
  });

  const [user, setUser] = useState(() => {
    if (propUser) return propUser;
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    }
  }, [propUser]);

  // Synchronize query param if present
  useEffect(() => {
    if (currentTabParam && SETTINGS_SECTIONS.some((s) => s.id === currentTabParam)) {
      setActiveSection(currentTabParam);
    }
  }, [currentTabParam]);

  // Initialize and apply saved appearance preferences to DOM on mount
  useEffect(() => {
    const prefs = appearancePreferencesAdapter.getPreferences();
    appearancePreferencesAdapter.applyPreferencesToDOM(prefs);
  }, []);

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId });
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings user={user} onUpdateUser={setUser} />;
      case 'security':
        return <SecurityPrivacySettings user={user} />;
      case 'notifications':
        return <NotificationSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'general':
      default:
        return (
          <GeneralSettings
            user={user}
            theme={propTheme}
            onThemeChange={onThemeChange}
          />
        );
    }
  };

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {renderActiveSection()}
    </SettingsLayout>
  );
};

export default Settings;
