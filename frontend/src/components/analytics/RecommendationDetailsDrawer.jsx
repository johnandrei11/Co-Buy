import React, { useEffect } from 'react';
import {
  X,
  Link2,
  FileText,
  ExternalLink,
  SquarePen
} from 'lucide-react';

const CATEGORY_MAP = {
  GROW: {
    label: 'Grow • Bundle Opportunity',
    dotColor: '#10b981',
    pillBg: 'rgba(16, 185, 129, 0.12)',
    pillBorder: 'rgba(16, 185, 129, 0.35)',
    pillColor: '#34d399'
  },
  SELL_MORE: {
    label: 'Sell More • Cross-Selling',
    dotColor: '#3b82f6',
    pillBg: 'rgba(59, 130, 246, 0.12)',
    pillBorder: 'rgba(59, 130, 246, 0.35)',
    pillColor: '#60a5fa'
  },
  WATCH: {
    label: 'Watch • Emerging Combos',
    dotColor: '#a855f7',
    pillBg: 'rgba(168, 85, 247, 0.12)',
    pillBorder: 'rgba(168, 85, 247, 0.35)',
    pillColor: '#c084fc'
  },
  OPTIMIZE: {
    label: 'Optimize • Product Placement',
    dotColor: '#f59e0b',
    pillBg: 'rgba(245, 158, 11, 0.12)',
    pillBorder: 'rgba(245, 158, 11, 0.35)',
    pillColor: '#fbbf24'
  },
  REVIEW: {
    label: 'Review • Product Attention',
    dotColor: '#ef4444',
    pillBg: 'rgba(239, 68, 68, 0.12)',
    pillBorder: 'rgba(239, 68, 68, 0.35)',
    pillColor: '#f87171'
  }
};

/**
 * Format a human-readable fraction from confidence (e.g. 33% -> "1 in 3")
 */
const getConfidenceFraction = (conf) => {
  if (conf == null || isNaN(conf) || conf <= 0) return '1 in 3';
  const val = conf > 1 ? conf / 100 : conf;
  if (val >= 0.90) return '9 in 10';
  if (val >= 0.75) return '4 in 5';
  if (val >= 0.63) return '2 in 3';
  if (val >= 0.45) return '1 in 2';
  if (val >= 0.30) return '1 in 3';
  if (val >= 0.22) return '1 in 4';
  if (val >= 0.18) return '1 in 5';
  if (val >= 0.12) return '1 in 7';
  if (val >= 0.08) return '1 in 10';
  const denom = Math.max(2, Math.round(1 / val));
  return `1 in ${denom}`;
};

/**
 * Format a human-readable fraction from support (e.g. 5.8% -> "1 in 17")
 */
const getSupportFraction = (supp) => {
  if (supp == null || isNaN(supp) || supp <= 0) return '1 in 17';
  const val = supp > 1 ? supp / 100 : supp;
  const denom = Math.max(2, Math.round(1 / val));
  return `1 in ${denom}`;
};

/**
 * Extract a concise product anchor keyword for the habit metric (e.g. "Flavored Fries" -> "Fries")
 */
const getShortAnchorName = (name) => {
  if (!name) return 'Fries';
  const clean = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const words = clean.split(' ').filter(Boolean);
  if (words.length > 1 && words[0].toLowerCase() === 'flavored') {
    return words.slice(1).join(' ');
  }
  if (clean.length <= 15) return clean;
  return words.slice(0, 2).join(' ');
};

/**
 * Format timestamp into clean date string (e.g. "Feb 01, 2026")
 */
const formatDate = (dateVal) => {
  if (!dateVal) return 'Feb 01, 2026';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateVal;
  }
};

const RecommendationDetailsDrawer = ({
  recommendation,
  item,
  isOpen,
  onClose
}) => {
  const data = item || recommendation;

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  // ── 1. Category & Header Meta ──
  const rawCategory = (data.category || 'GROW').toUpperCase();
  const categoryConfig = CATEGORY_MAP[rawCategory] || CATEGORY_MAP.GROW;

  const categoryPillLabel = data.type
    ? `${data.category || 'Grow'} • ${data.type}`
    : categoryConfig.label;

  // Product Title
  const products = data.products || [];
  const p1 = products[0]?.name;
  const p2 = products[1]?.name || (products.length > 2 ? `${products.length - 1} items` : null);
  const derivedTitle = p1 && p2 ? `${p1} + ${p2}` : p1 || 'Product Opportunity';
  const modalTitle = data.title || derivedTitle;

  // Timestamp
  const analysisPeriod = data.analysisPeriod || {};
  const rawDate = data.generatedAt || analysisPeriod.end || new Date().toISOString();
  const dateText = formatDate(rawDate);

  // Subtitle / Plain-Language Summary
  const subtitleText = data.summary || data.context || 'Customers often buy these together.';

  // ── 2. Observed Purchasing Dynamics (KPIs) ──
  const details = data.details || {};
  const supporting = details.supportingData || {};
  const metrics = data.metrics || {};

  // KPI 1: Total Co-Transactions
  const rawTxCount = metrics.coTransactions ?? supporting.transactionCount ?? 259;
  const volumeValue = typeof rawTxCount === 'number' ? rawTxCount.toLocaleString() : rawTxCount;

  // KPI 2: Overall Basket Ratio (Support)
  const rawSupport = supporting.supportPct ?? (metrics.support != null ? metrics.support * 100 : 5.8);
  const supportFraction = getSupportFraction(rawSupport);

  // Hero: Confidence / Top Habit Metric
  const rawConfidence = supporting.confidencePct ?? (metrics.confidence != null ? metrics.confidence * 100 : 33.3);
  const confidenceFraction = getConfidenceFraction(rawConfidence);
  const anchorShortName = getShortAnchorName(p1);
  const liftRatio = supporting.liftRatio ?? (metrics.lift != null ? Number(metrics.lift).toFixed(1) : '2.8');

  // ── 3. Action Considerations ──
  const customActions = data.actions || [];
  const considerations = details.considerations || [];

  const actionA = customActions[0] || {
    badge: 'Pricing Test',
    headline: 'CREATE BUNDLED PRICE',
    description: considerations[0] || 'Offer a lower price when bought together.'
  };

  const actionB = customActions[1] || {
    badge: 'POS Merchandising',
    headline: 'RUN IN-STORE PROMOS',
    description: considerations[1] || 'Promote on screens and menu boards.'
  };

  return (
    <div className="cobuy-bop-overlay" onClick={onClose}>
      <div
        className="cobuy-bop-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cobuy-bop-title"
      >
        {/* ── Top Header Row: Category Badge & Date + Close ── */}
        <div className="cobuy-bop-header-row">
          <div
            className="cobuy-bop-pill"
            style={{
              background: categoryConfig.pillBg,
              borderColor: categoryConfig.pillBorder,
              color: categoryConfig.pillColor
            }}
          >
            <span
              className="cobuy-bop-dot"
              style={{
                background: categoryConfig.dotColor,
                boxShadow: `0 0 6px ${categoryConfig.dotColor}`
              }}
            />
            <span>{categoryPillLabel}</span>
          </div>

          <div className="cobuy-bop-header-right">
            <span className="cobuy-bop-date">{dateText}</span>
            <button
              type="button"
              className="cobuy-bop-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Headline & Plain-Language Summary ── */}
        <h2 id="cobuy-bop-title" className="cobuy-bop-title">
          {modalTitle}
        </h2>

        <p className="cobuy-bop-subtitle">
          {subtitleText}
        </p>

        {/* ── Hero Insight Card (Top Metric - Amber Highlight) ── */}
        <div
          className="cobuy-bop-hero-card"
          title={`Confidence: ${rawConfidence}% | Lift Ratio: ${liftRatio}x`}
        >
          <span className="cobuy-bop-hero-highlight">{confidenceFraction}</span>
          <span className="cobuy-bop-hero-text"> of {anchorShortName} orders also bought this</span>
        </div>

        {/* ── Secondary Metrics Stack ── */}
        <div className="cobuy-bop-metrics-stack">
          {/* Metric 1: Co-Transactions */}
          <div
            className="cobuy-bop-metric-card"
            title={`Total co-transactions in dataset: ${volumeValue}`}
          >
            <span className="cobuy-bop-metric-num cobuy-bop-metric-num--blue">
              {volumeValue}
            </span>
            <div className="cobuy-bop-metric-meta">
              <span className="cobuy-bop-metric-label">Total Co-Transactions</span>
              <span className="cobuy-bop-metric-sub">Transactions</span>
            </div>
          </div>

          {/* Metric 2: All Orders Frequency */}
          <div
            className="cobuy-bop-metric-card"
            title={`Support: ${rawSupport}% of all store transactions`}
          >
            <span className="cobuy-bop-metric-num cobuy-bop-metric-num--green">
              {supportFraction}
            </span>
            <span className="cobuy-bop-metric-label cobuy-bop-metric-label--green">
              Included in all orders
            </span>
          </div>
        </div>

        {/* ── Action Considerations Section ── */}
        <div className="cobuy-bop-actions-section">
          <h3 className="cobuy-bop-actions-title">Action Considerations</h3>

          <div className="cobuy-bop-actions-stack">
            {/* Action Card 1: Pricing Test */}
            <div className="cobuy-bop-action-card">
              <div className="cobuy-bop-action-top">
                <div className="cobuy-bop-action-badge-group">
                  <div className="cobuy-bop-action-icon cobuy-bop-action-icon--blue">
                    <Link2 size={13} />
                  </div>
                  <span className="cobuy-bop-action-badge cobuy-bop-action-badge--blue">
                    {actionA.badge || 'Pricing Test'}
                  </span>
                </div>
                <ExternalLink size={14} className="cobuy-bop-action-ext-icon" />
              </div>

              <h4 className="cobuy-bop-action-headline">
                {(actionA.headline || 'CREATE BUNDLED PRICE').toUpperCase()}
              </h4>
              <p className="cobuy-bop-action-desc">
                {actionA.description}
              </p>
            </div>

            {/* Action Card 2: POS Merchandising */}
            <div className="cobuy-bop-action-card">
              <div className="cobuy-bop-action-top">
                <div className="cobuy-bop-action-badge-group">
                  <div className="cobuy-bop-action-icon cobuy-bop-action-icon--green">
                    <FileText size={13} />
                  </div>
                  <span className="cobuy-bop-action-badge cobuy-bop-action-badge--green">
                    {actionB.badge || 'POS Merchandising'}
                  </span>
                </div>
                <SquarePen size={14} className="cobuy-bop-action-ext-icon" />
              </div>

              <h4 className="cobuy-bop-action-headline">
                {(actionB.headline || 'RUN IN-STORE PROMOS').toUpperCase()}
              </h4>
              <p className="cobuy-bop-action-desc">
                {actionB.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationDetailsDrawer;
export { RecommendationDetailsDrawer as ViewDetailsModal };
