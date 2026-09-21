import React, { useState } from 'react';
import { Palette, Rows, Type, Check } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';
import { Select } from '../ui/Select';
import { appearancePreferencesAdapter } from '../adapters/settingsAdapters';

export const AppearanceSettings = () => {
  const [appearance, setAppearance] = useState(() => appearancePreferencesAdapter.getPreferences());
  const [feedback, setFeedback] = useState(false);

  const showSaved = () => {
    setFeedback(true);
    setTimeout(() => setFeedback(false), 2000);
  };

  const handleColorSchemeChange = (scheme) => {
    const updated = { ...appearance, colorScheme: scheme };
    setAppearance(updated);
    appearancePreferencesAdapter.savePreferences(updated);
    showSaved();
  };

  const handleCompactModeChange = (val) => {
    const updated = { ...appearance, compactMode: val };
    setAppearance(updated);
    appearancePreferencesAdapter.savePreferences(updated);
    showSaved();
  };

  const handleFontSizeChange = (val) => {
    const updated = { ...appearance, fontSize: val };
    setAppearance(updated);
    appearancePreferencesAdapter.savePreferences(updated);
    showSaved();
  };

  const colorOptions = [
    { id: 'blue', label: 'Blue', color: '#3b82f6' },
    { id: 'purple', label: 'Purple', color: '#8b5cf6' },
    { id: 'green', label: 'Green', color: '#10b981' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Aa Small' },
    { value: 'normal', label: 'Aa Normal' },
    { value: 'large', label: 'Aa Large' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SettingCard
        icon={Palette}
        title="Appearance"
        description="Customize the visual styling, accent color scheme, density, and font scaling."
        action={
          feedback && (
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
              <Check size={14} /> Applied
            </div>
          )
        }
      >
        <SettingRow
          icon={Palette}
          label="Color Scheme"
          description="Choose a primary brand accent color used for buttons, active indicators, and charts."
        >
          <div
            role="radiogroup"
            aria-label="Accent Color Scheme"
            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
          >
            {colorOptions.map((opt) => {
              const isSelected = appearance.colorScheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${opt.label} accent`}
                  onClick={() => handleColorSchemeChange(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isSelected
                      ? `2px solid ${opt.color}`
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: opt.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 8px ${opt.color}66`
                    }}
                  />
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--text-main)' : 'var(--text-muted)'
                  }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow
          icon={Rows}
          label="Compact Mode"
          description="Tighten spacing across cards, data tables, and navigation links to fit more on screen."
        >
          <Toggle
            id="toggle-compact-mode"
            label="Compact Mode"
            checked={appearance.compactMode}
            onChange={handleCompactModeChange}
          />
        </SettingRow>

        <SettingRow
          icon={Type}
          label="Font Size"
          description="Adjust application text scaling and reading size."
        >
          <Select
            id="setting-font-size-select"
            aria-label="Font Size"
            icon={Type}
            value={appearance.fontSize}
            options={fontSizeOptions}
            onChange={handleFontSizeChange}
          />
        </SettingRow>
      </SettingCard>
    </div>
  );
};
