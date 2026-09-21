import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminThemeContext = createContext();

export function AdminThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('admin_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  };

  const isDark = theme === 'dark';

  const tokens = {
    isDark,
    bg: isDark ? '#17191C' : '#f8fafc',
    header: isDark ? '#1F2428' : '#ffffff',
    sidebar: isDark ? '#0B1F3A' : '#0f172a',
    card: isDark ? '#20252A' : '#ffffff',
    cardBorder: isDark ? '#343A40' : '#e2e8f0',
    textPrimary: isDark ? '#F5F7FA' : '#0f172a',
    textSecondary: isDark ? '#B8C0C8' : '#475569',
    textMuted: isDark ? '#8A939D' : '#64748b',
    input: isDark ? '#252A2F' : '#f8fafc',
    inputBorder: isDark ? '#3A424A' : '#cbd5e1',
    hover: isDark ? '#2A3036' : '#f1f5f9',
    chartGrid: isDark ? '#343A40' : '#f1f5f9',
    chartTooltipBg: isDark ? '#20252A' : '#ffffff'
  };

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, tokens }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
}
