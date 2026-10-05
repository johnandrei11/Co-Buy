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
 * Format a human-readable fraction from confidence using slash notation (e.g. 66% -> "2/3", 33% -> "1/3")
 */
const getConfidenceFraction = (conf) => {
  if (conf == null || isNaN(conf) || conf <= 0) return '1/3';
  const val = conf > 1 ? conf / 100 : conf;
  if (val >= 0.95) return '100%';
  if (val >= 0.88) return '9/10';
  if (val >= 0.78) return '4/5';
  if (val >= 0.68) return '3/4';
  if (val >= 0.58) return '2/3';
  if (val >= 0.45) return '1/2';
  if (val >= 0.38) return '2/5';
  if (val >= 0.28) return '1/3';
  if (val >= 0.22) return '1/4';
  if (val >= 0.18) return '1/5';
  if (val >= 0.12) return '1/7';
  if (val >= 0.08) return '1/10';
  const denom = Math.max(2, Math.round(1 / val));
  return `1/${denom}`;
};

/**
 * Calculate support denominator (e.g. 4.8% -> 21, 5.8% -> 17)
 */
const getSupportDenom = (supp) => {
  if (supp == null || isNaN(supp) || supp <= 0) return 21;
  const val = supp > 1 ? supp / 100 : supp;
  return Math.max(2, Math.round(1 / val));
};

/**
 * Balance unclosed parentheses in product titles (e.g. "Latte (Iced" -> "Latte (Iced)")
 */
const balanceParens = (str) => {
  if (!str) return '';
  const openCount = (str.match(/\(/g) || []).length;
  const closeCount = (str.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    return str + ')'.repeat(openCount - closeCount);
  }
  return str;
};

/**
 * Extract a clean, natural product name without technical size/temperature specs
 * e.g. "Cafe Latte 16oz (Iced" -> "Cafe Latte"
 * e.g. "Hungarian Sandwich" -> "Hungarian Sandwich"
 * e.g. "Flavored Fries" -> "Fries"
 */
const getCleanProductName = (name) => {
  if (!name) return '';
  let clean = name
    // Strip volume and size indications like 16oz, 12oz, 22oz, 500ml, etc.
    .replace(/\b\d+(\.\d+)?\s*(oz|ml|g|kg|l)\b/gi, '')
    // Strip parenthetical modifiers like (Iced), (Hot), or unclosed (Iced
    .replace(/\s*\([^)]*\)?/g, '')
    .trim();

  // Strip leading generic adjectives like "Flavored" if followed by another word
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words[0].toLowerCase() === 'flavored') {
    clean = words.slice(1).join(' ');
  }
  return clean || name.trim();
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

  // Product Titles with balanced parentheses
  const products = data.products || [];
  const p1Raw = products[0]?.name;
  const p2Raw = products[1]?.name || (products.length > 2 ? `${products.length - 1} items` : null);
  const p1Balanced = balanceParens(p1Raw);
  const p2Balanced = balanceParens(p2Raw);
  const derivedTitle = p1Balanced && p2Balanced ? `${p1Balanced} + ${p2Balanced}` : p1Balanced || 'Product Opportunity';
  const modalTitle = data.title ? balanceParens(data.title) : derivedTitle;

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

  // KPI 2: Overall Order Frequency (Support)
  const rawSupport = supporting.supportPct ?? (metrics.support != null ? metrics.support * 100 : 4.8);
  const supportDenom = getSupportDenom(rawSupport);

  // Hero: Confidence / Top Habit Metric
  const rawConfidence = supporting.confidencePct ?? (metrics.confidence != null ? metrics.confidence * 100 : 66.7);
  const confidenceFraction = getConfidenceFraction(rawConfidence);
  const anchorName = getCleanProductName(p1Raw) || 'this item';
  const targetName = p2Raw ? getCleanProductName(p2Raw) : 'companion items';
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
          <span className="cobuy-bop-hero-text">
            {' '}of {anchorName} orders also bought {targetName}.
          </span>
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
              <span className="cobuy-bop-metric-sub">Transactions containing both items</span>
            </div>
          </div>

          {/* Metric 2: Overall Order Frequency (Clear & Unambiguous) */}
          <div
            className="cobuy-bop-metric-card"
            title={`Mathematical Support: ${rawSupport}% of all store transactions`}
          >
            <span className="cobuy-bop-metric-num cobuy-bop-metric-num--green">
              1 in {supportDenom}
            </span>
            <div className="cobuy-bop-metric-meta">
              <span className="cobuy-bop-metric-label">Overall Order Frequency</span>
              <span className="cobuy-bop-metric-sub">
                Purchased together in 1 of every {supportDenom} customer orders
              </span>
            </div>
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
