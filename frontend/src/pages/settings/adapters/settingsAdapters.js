// Settings state/store adapters for persistence and clean API separation

export const notificationPreferencesAdapter = {
  getPreferences: () => {
    try {
      const saved = localStorage.getItem('cobuy_notification_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse notification preferences:', e);
    }
    return {
      emailNotifications: true,
      inAppNotifications: true,
      projectUpdates: false,
      systemAnnouncements: true
    };
  },

  savePreferences: async (prefs) => {
    // Simulated async persistence (allows UI to show loading/saved states)
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      localStorage.setItem('cobuy_notification_preferences', JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent('notification-preferences-updated', { detail: prefs }));
      return { success: true, preferences: prefs };
    } catch (e) {
      throw new Error('Failed to save notification preferences to local storage.');
    }
  }
};

export const appearancePreferencesAdapter = {
  getPreferences: () => {
    try {
      const saved = localStorage.getItem('cobuy_appearance_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse appearance preferences:', e);
    }
    return {
      colorScheme: 'blue', // 'blue' | 'purple' | 'green'
      compactMode: false,
      fontSize: 'normal'   // 'small' | 'normal' | 'large'
    };
  },

  applyPreferencesToDOM: (prefs) => {
    const root = document.documentElement;
    // Accent color
    root.setAttribute('data-accent', prefs.colorScheme || 'blue');
    // Compact mode
    if (prefs.compactMode) {
      root.setAttribute('data-compact', 'true');
    } else {
      root.removeAttribute('data-compact');
    }
    // Font size
    root.setAttribute('data-font-size', prefs.fontSize || 'normal');
  },

  savePreferences: (prefs) => {
    try {
      localStorage.setItem('cobuy_appearance_preferences', JSON.stringify(prefs));
      appearancePreferencesAdapter.applyPreferencesToDOM(prefs);
      window.dispatchEvent(new CustomEvent('appearance-preferences-updated', { detail: prefs }));
      return { success: true, preferences: prefs };
    } catch (e) {
      throw new Error('Failed to save appearance preferences.');
    }
  }
};

export const generalPreferencesAdapter = {
  getPreferences: () => {
    try {
      const saved = localStorage.getItem('cobuy_general_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse general preferences:', e);
    }
    return {
      defaultProjectView: 'Overview', // 'Overview' | 'Analytics' | 'Evaluation' | 'History'
      language: 'English (US)'
    };
  },

  savePreferences: (prefs) => {
    try {
      localStorage.setItem('cobuy_general_preferences', JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent('general-preferences-updated', { detail: prefs }));
      return { success: true, preferences: prefs };
    } catch (e) {
      throw new Error('Failed to save general preferences.');
    }
  }
};
