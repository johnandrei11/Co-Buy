import React, { useState, useEffect } from 'react';
import {
  Leaf,
  X,
  Lightbulb,
  BarChart2,
  Target,
  Tag,
  MapPin,
  Zap,
  TrendingUp,
  ShieldCheck,
  Layers,
  Calendar
} from 'lucide-react';

const CATEGORY_MAP = {
  GROW: {
    icon: Leaf,
    label: 'Grow • Bundle Opportunity',
    bg: '#064E3B',
    border: '#34D399',
    color: '#34D399'
  },
  SELL_MORE: {
    icon: TrendingUp,
    label: 'Sell More • Cross-Selling',
    bg: '#172554',
    border: '#60A5FA',
    color: '#60A5FA'
  },
  WATCH: {
    icon: Zap,
    label: 'Watch • Emerging Combos',
    bg: '#3B0764',
    border: '#C084FC',
    color: '#C084FC'
  },
  OPTIMIZE: {
    icon: Target,
    label: 'Optimize • Product Placement',
    bg: '#451A03',
    border: '#FBBF24',
    color: '#FBBF24'
  },
  REVIEW: {
    icon: Lightbulb,
    label: 'Review • Product Attention',
    bg: '#4C0519',
    border: '#F87171',
    color: '#F87171'
  }
};

const RecommendationDetailsDrawer = ({
  recommendation,
  item,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('advisory');

  // Support both 'item' and 'recommendation' props
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
  const rawCategory = data.category || 'GROW';
  const categoryConfig = CATEGORY_MAP[rawCategory.toUpperCase()] || CATEGORY_MAP.GROW;
  const CategoryIcon = categoryConfig.icon;

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
  const timestampText = data.generatedAt
    ? `Generated on Auto-Run • ${data.generatedAt}`
    : analysisPeriod.end
    ? `Generated on Auto-Run • ${analysisPeriod.end}`
    : 'Generated on Auto-Run • Sep 18, 2026';

  // ── 2. Business Context (Why CoBuy Created This) ──
  const details = data.details || {};
  const explanation = data.explanation || details.rationale || data.summary ||
    "It's a classic on-the-go combo pair that naturally boosts average order value without adding customer decision friction.";

  // ── 3. Observed Purchasing Dynamics (KPIs) ──
  const metrics = data.metrics || {};
  const supporting = details.supportingData || {};

  // KPI 1: Volume
  const rawTxCount = metrics.coTransactions ?? supporting.transactionCount ?? 56;
  const volumeValue = typeof rawTxCount === 'number' ? rawTxCount.toLocaleString() : rawTxCount;

  // KPI 2: Share of Total Baskets
  const basketShare = metrics.basketShare ??
    (supporting.supportPct != null ? `${supporting.supportPct}%` : '3.5%');

  // KPI 3: Conversion / Cross-Sell Ratio (Humanized to avoid confusing "~1 in 1")
  const confidence = supporting.confidencePct ?? metrics.confidence;
  const formatConversionRatio = (conf) => {
    if (conf == null || isNaN(conf) || conf <= 0) return '~1 in 10';
    const c = Math.round(conf);
    if (c >= 95) return '100%';
    if (c >= 85) return '~9 in 10';
    if (c >= 75) return '~4 in 5';
    if (c >= 63) return '~2 in 3';
    if (c >= 45) return '~1 in 2';
    if (c >= 30) return '~1 in 3';
    if (c >= 22) return '~1 in 4';
    if (c >= 18) return '~1 in 5';
    if (c >= 12) return '~1 in 7';
    if (c >= 8) return '~1 in 10';
    if (c >= 4) return '~1 in 20';
    const denom = Math.max(2, Math.round(100 / Math.max(c, 1)));
    return `~1 in ${denom}`;
  };

  const rawRatio = metrics.crossSellRatio ?? supporting.crossSellRatio;
  // If rawRatio happens to be "~1 in 1" or "1 in 1", normalize it
  const crossSellRatio = (rawRatio && rawRatio !== '~1 in 1' && rawRatio !== '1 in 1')
    ? rawRatio
    : formatConversionRatio(confidence);

  // Tailored Ratio Label
  const anchorName = p1 || 'Brownie';
  const targetName = p2 || 'Croissant';
  const ratioLabel = `Orders with ${anchorName} include ${targetName}`;

  // ── 4. Action Considerations ──
  const customActions = data.actions || [];
  const considerations = details.considerations || [];

  const actionA = customActions[0] || {
    badge: 'PRICING TEST',
    headline: 'Test a bundled price point',
    description: considerations[0] || 'Offer a 5–8% overall discount on the combined pair to encourage impulse add-ons at POS.'
  };

  const actionB = customActions[1] || {
    badge: 'POS MERCHANDISING',
    headline: 'Primary promotional placement',
    description: considerations[1] || `Feature ${derivedTitle} together as a recommended pair on digital checkout screens.`
  };

  return (
    <div className="cobuy-view-details-overlay" onClick={onClose}>
      <div
        className="cobuy-view-details-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-details-modal-title"
      >
        {/* ── Section 1: Modal Header Row ── */}
        <div className="cobuy-vdm-header">
          <div className="cobuy-vdm-header-left">
            <div
              className="cobuy-vdm-category-pill"
              style={{
                background: categoryConfig.bg,
                borderColor: categoryConfig.border,
                color: categoryConfig.color
              }}
            >
              <CategoryIcon size={13} style={{ color: categoryConfig.color }} />
              <span>{categoryPillLabel}</span>
            </div>

            <h2 id="view-details-modal-title" className="cobuy-vdm-title">
              {modalTitle}
            </h2>

            <p className="cobuy-vdm-timestamp">
              {timestampText}
            </p>
          </div>

          <button
            type="button"
            className="cobuy-vdm-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Section 2: Tab Bar ── */}
        <div className="cobuy-vdm-tab-bar">
          <button
            type="button"
            className={`cobuy-vdm-tab-btn ${activeTab === 'advisory' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('advisory')}
          >
            Business Advisory
          </button>
          <button
            type="button"
            className={`cobuy-vdm-tab-btn ${activeTab === 'analytics' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Supporting Analytics
          </button>
        </div>

        {/* ── Modal Body: Business Advisory Tab (Expected Visual Output) ── */}
        {activeTab === 'advisory' ? (
          <div className="cobuy-vdm-body">
            {/* Section 2 Callout: Why CoBuy Created This */}
            <div className="cobuy-vdm-section">
              <div className="cobuy-vdm-section-title cobuy-vdm-section-title--cyan">
                <Lightbulb size={14} className="cobuy-vdm-sec-icon" />
                <span>WHY COBUY CREATED THIS</span>
              </div>
              <div className="cobuy-vdm-inset-box">
                <p className="cobuy-vdm-rationale-text">
                  {explanation}
                </p>
              </div>
            </div>

            {/* Section 3: Observed Purchasing Dynamics (3-Card Horizontal KPI Grid) */}
            <div className="cobuy-vdm-section">
              <div className="cobuy-vdm-section-title cobuy-vdm-section-title--cyan">
                <BarChart2 size={14} className="cobuy-vdm-sec-icon" />
                <span>OBSERVED PURCHASING DYNAMICS</span>
              </div>
              <div className="cobuy-vdm-kpi-grid">
                {/* KPI Card 1: Volume */}
                <div className="cobuy-vdm-kpi-card">
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--white">
                    {volumeValue}
                  </div>
                  <div className="cobuy-vdm-kpi-label">
                    Total Co-Transactions
                  </div>
                </div>

                {/* KPI Card 2: Basket Share */}
                <div className="cobuy-vdm-kpi-card">
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--green">
                    {basketShare}
                  </div>
                  <div className="cobuy-vdm-kpi-label">
                    Share of Total Baskets
                  </div>
                </div>

                {/* KPI Card 3: Conversion Ratio */}
                <div
                  className="cobuy-vdm-kpi-card"
                  title={`Confidence: ${supporting.confidencePct ?? 0}% attachment rate`}
                >
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--cyan">
                    {crossSellRatio}
                  </div>
                  <div className="cobuy-vdm-kpi-label">
                    {ratioLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Action Considerations (Stacked Cards) */}
            <div className="cobuy-vdm-section">
              <div className="cobuy-vdm-section-title cobuy-vdm-section-title--green">
                <Target size={14} className="cobuy-vdm-sec-icon" />
                <span>ACTION CONSIDERATIONS</span>
              </div>

              <div className="cobuy-vdm-actions-stack">
                {/* Action Card A */}
                <div className="cobuy-vdm-action-card">
                  <div className="cobuy-vdm-action-top">
                    <span className="cobuy-vdm-action-badge">
                      <Tag size={12} />
                      <span>{actionA.type || actionA.badge || 'PRICING TEST'}</span>
                    </span>
                    <h4 className="cobuy-vdm-action-headline">
                      {actionA.headline}
                    </h4>
                  </div>
                  <p className="cobuy-vdm-action-desc">
                    {actionA.description}
                  </p>
                </div>

                {/* Action Card B */}
                <div className="cobuy-vdm-action-card">
                  <div className="cobuy-vdm-action-top">
                    <span className="cobuy-vdm-action-badge">
                      <MapPin size={12} />
                      <span>{actionB.type || actionB.badge || 'POS MERCHANDISING'}</span>
                    </span>
                    <h4 className="cobuy-vdm-action-headline">
                      {actionB.headline}
                    </h4>
                  </div>
                  <p className="cobuy-vdm-action-desc">
                    {actionB.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Supporting Analytics Tab Content ── */
          <div className="cobuy-vdm-body">
            <div className="cobuy-vdm-section">
              <div className="cobuy-vdm-section-title cobuy-vdm-section-title--cyan">
                <ShieldCheck size={14} className="cobuy-vdm-sec-icon" />
                <span>MATHEMATICAL ASSOCIATION PARAMETERS</span>
              </div>
              <div className="cobuy-vdm-kpi-grid">
                <div className="cobuy-vdm-kpi-card">
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--white">
                    {supporting.supportPct || '0.0'}%
                  </div>
                  <div className="cobuy-vdm-kpi-label">Support Ratio</div>
                </div>
                <div className="cobuy-vdm-kpi-card">
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--cyan">
                    {supporting.confidencePct || '0.0'}%
                  </div>
                  <div className="cobuy-vdm-kpi-label">Confidence</div>
                </div>
                <div className="cobuy-vdm-kpi-card">
                  <div className="cobuy-vdm-kpi-val cobuy-vdm-kpi-val--green">
                    {supporting.liftRatio || '1.0'}x
                  </div>
                  <div className="cobuy-vdm-kpi-label">Lift Ratio</div>
                </div>
              </div>
            </div>

            <div className="cobuy-vdm-section">
              <div className="cobuy-vdm-section-title cobuy-vdm-section-title--green">
                <Layers size={14} className="cobuy-vdm-sec-icon" />
                <span>ALGORITHMIC EXECUTION SUMMARY</span>
              </div>
              <div className="cobuy-vdm-inset-box">
                <div className="cobuy-vdm-stat-row">
                  <span className="cobuy-vdm-stat-k">Analytical Trigger</span>
                  <span className="cobuy-vdm-stat-v">{data.insightType || 'BASKET_BUILDER'}</span>
                </div>
                <div className="cobuy-vdm-stat-row">
                  <span className="cobuy-vdm-stat-k">Classification Tier</span>
                  <span className="cobuy-vdm-stat-v">{rawCategory} Strategic Bucket</span>
                </div>
                <div className="cobuy-vdm-stat-row">
                  <span className="cobuy-vdm-stat-k">Analysis Window</span>
                  <span className="cobuy-vdm-stat-v">{analysisPeriod.start || 'N/A'} – {analysisPeriod.end || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 4: Modal Footer ── */}
        <div className="cobuy-vdm-footer">
          <div className="cobuy-vdm-footer-brand">
            <Zap size={14} className="cobuy-vdm-zap-icon" />
            <span>CoBuy Business Advisory Engine</span>
          </div>

          <button
            type="button"
            className="cobuy-vdm-done-btn"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationDetailsDrawer;
export { RecommendationDetailsDrawer as ViewDetailsModal };
