import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Play, RotateCcw, Loader2, Sparkles, Check } from 'lucide-react';

const MiningParametersModal = ({
  isOpen,
  onClose,
  params,
  onSaveAndRun,
  isRecomputing = false
}) => {
  const [localParams, setLocalParams] = useState(params);
  const debounceTimerRef = useRef(null);

  // Sync state if external params change
  useEffect(() => {
    if (params) {
      setLocalParams(params);
    }
  }, [params]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const triggerDebouncedUpdate = (updatedParams) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (onSaveAndRun) {
        onSaveAndRun(updatedParams, { isReactive: true });
      }
    }, 300);
  };

  const handleChange = (key, value) => {
    const updated = {
      ...localParams,
      [key]: value
    };
    setLocalParams(updated);
    triggerDebouncedUpdate(updated);
  };

  const handleResetDefaults = () => {
    const defaults = {
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    };
    setLocalParams(defaults);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (onSaveAndRun) {
      onSaveAndRun(defaults, { isReactive: true });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (onSaveAndRun) {
      onSaveAndRun(localParams, { isReactive: false });
    }
    onClose();
  };

  const formatSupportDisplay = (val) => {
    const num = parseFloat(val || 0.05);
    const pct = num * 100;
    return pct < 1.0 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
  };

  return (
    <div className="cobuy-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cobuy-modal-card fade-in" style={{ maxWidth: '520px' }}>
        <div className="cobuy-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={20} style={{ color: '#4f46e5' }} />
            <h3 className="cobuy-modal-title" style={{ margin: 0 }}>
              Mining Algorithm Parameters
            </h3>
          </div>
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

        {/* Real-Time Reactivity Feedback Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isRecomputing ? '#eef2ff' : '#f8fafc',
          border: `1px solid ${isRecomputing ? '#c7d2fe' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '0.45rem 0.85rem',
          margin: '0.75rem 0 1rem 0',
          fontSize: '0.78rem',
          color: isRecomputing ? '#4338ca' : '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            {isRecomputing ? (
              <>
                <Loader2 size={13} className="spin" />
                <span>Re-executing mining pipeline (300ms debounce)...</span>
              </>
            ) : (
              <>
                <Check size={13} style={{ color: '#10b981' }} />
                <span>Reactive Parameter Binding Active</span>
              </>
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Real-time</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Minimum Support (Commonness) */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Commonness (Support)</label>
              <span className="cobuy-field-value" style={{ fontWeight: '700', color: '#4f46e5' }}>
                {formatSupportDisplay(localParams.min_support)}
              </span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.5"
              step="0.001"
              value={localParams.min_support ?? 0.05}
              onChange={(e) => handleChange('min_support', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
              <span>0.1%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              Filters itemsets by frequency across total customer orders. Lower values surface rarer pairings.
            </p>
          </div>

          {/* Minimum Confidence (Likelihood) */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Likelihood (Confidence)</label>
              <span className="cobuy-field-value" style={{ fontWeight: '700', color: '#4f46e5' }}>
                {(parseFloat(localParams.min_confidence || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.01"
              value={localParams.min_confidence ?? 0.5}
              onChange={(e) => handleChange('min_confidence', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
              <span>5%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              Directional conditional probability P(B|A) that purchasing Item A leads to buying Item B.
            </p>
          </div>

          {/* Minimum Lift (Pairing Strength) */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Minimum Pairing Strength (Lift)</label>
              <span className="cobuy-field-value" style={{ fontWeight: '700', color: '#4f46e5' }}>
                {parseFloat(localParams.min_lift || 1.0).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={localParams.min_lift ?? 1.0}
              onChange={(e) => handleChange('min_lift', parseFloat(e.target.value))}
              className="cobuy-range-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
              <span>1.0x (Baseline)</span>
              <span>5.0x</span>
              <span>10.0x (Strong)</span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              Measures rule strength over random co-occurrence independence (1.0x = random baseline).
            </p>
          </div>

          {/* Algorithm Engine Selection — Only Auto, FP-Growth, and Apriori (ECLAT removed) */}
          <div className="cobuy-modal-field">
            <div className="cobuy-field-header">
              <label className="cobuy-field-label">Algorithm Engine</label>
            </div>
            <select
              value={localParams.algorithm || 'auto'}
              onChange={(e) => handleChange('algorithm', e.target.value)}
              className="cobuy-select"
            >
              <option value="auto">Auto-Select (Dynamic scale &amp; sparsity optimization)</option>
              <option value="fpgrowth">FP-Growth (Frequent pattern tree compression)</option>
              <option value="apriori">Apriori (Classic level-wise candidate generation)</option>
            </select>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              Auto uses FP-Growth for dense transaction datasets and Apriori for sparse transaction spaces.
            </p>
          </div>

          <div className="cobuy-modal-actions" style={{ marginTop: '1.25rem' }}>
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
              {isRecomputing ? <Loader2 size={15} className="spin" /> : <Play size={15} />} Apply &amp; Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MiningParametersModal;
