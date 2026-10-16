import React, { useState } from 'react';
import { X, Sliders, Play, Check, RotateCcw } from 'lucide-react';

const MiningParametersModal = ({
  isOpen,
  onClose,
  params,
  onSaveAndRun
}) => {
  const [localParams, setLocalParams] = useState(params);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setLocalParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetDefaults = () => {
    setLocalParams({
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveAndRun(localParams);
    onClose();
  };

  return (
    <div className="cobuy-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cobuy-modal-card fade-in">
        <div className="cobuy-modal-header">
          <h3 className="cobuy-modal-title">
            <Sliders size={20} style={{ color: '#4f46e5' }} />
            Mining Algorithm Parameters
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              display: 'flex',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Minimum Support */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Commonness (Support)</label>
              <span className="cobuy-field-value">
                {(parseFloat(localParams.min_support || 0.05) * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.5"
              step="0.005"
              value={localParams.min_support}
              onChange={(e) => handleChange('min_support', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Minimum percentage of all customer orders that must contain this product combination.
            </p>
          </div>

          {/* Minimum Confidence */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Likelihood (Confidence)</label>
              <span className="cobuy-field-value">
                {(parseFloat(localParams.min_confidence || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={localParams.min_confidence}
              onChange={(e) => handleChange('min_confidence', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              How often customers who buy the first item also purchase the second item.
            </p>
          </div>

          {/* Minimum Lift */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Pairing Strength (Lift)</label>
              <span className="cobuy-field-value">
                {parseFloat(localParams.min_lift || 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={localParams.min_lift}
              onChange={(e) => handleChange('min_lift', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              How much more likely customers buy these together than normal (1.0x means no special connection).
            </p>
          </div>

          {/* Algorithm Selection */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Mining Algorithm</label>
            </div>
            <select
              value={localParams.algorithm}
              onChange={(e) => handleChange('algorithm', e.target.value)}
              className="cobuy-select"
            >
              <option value="auto">Auto (Adaptive recommendation based on dataset scale)</option>
              <option value="fpgrowth">FP-Growth (Fast frequent pattern tree)</option>
              <option value="apriori">Apriori (Classic level-wise candidate generation)</option>
              <option value="eclat">ECLAT (Equivalence Class Clustering & Lattice)</option>
            </select>
          </div>



          <div className="cobuy-modal-actions">
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button
              type="submit"
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Play size={15} /> Apply & Mine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MiningParametersModal;
