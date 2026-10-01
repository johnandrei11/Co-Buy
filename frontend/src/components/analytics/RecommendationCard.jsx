import React from 'react';
import {
  Tag,
  ArrowRight,
  TrendingUp,
  BarChart2
} from 'lucide-react';

const CATEGORY_ACCENTS = {
  GROW: {
    accent: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    badgeText: '#34d399'
  },
  SELL_MORE: {
    accent: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    badgeText: '#60a5fa'
  },
  WATCH: {
    accent: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeBorder: 'rgba(168, 85, 247, 0.3)',
    badgeText: '#c084fc'
  },
  OPTIMIZE: {
    accent: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
    badgeText: '#fbbf24'
  },
  REVIEW: {
    accent: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeBorder: 'rgba(239, 68, 68, 0.3)',
    badgeText: '#f87171'
  }
};

const RecommendationCard = ({
  recommendation,
  onViewDetails
}) => {
  if (!recommendation) return null;

  const category = recommendation.category || 'GROW';
  const accentTheme = CATEGORY_ACCENTS[category] || CATEGORY_ACCENTS.GROW;
  const products = recommendation.products || [];
  const p1 = products[0]?.name || 'Item A';
  const p2 = products[1]?.name || (products.length > 2 ? `${products.length - 1} items` : 'Item B');
  const jointTitle = products.length > 1 
    ? `${p1} + ${products.slice(1).map(p => p.name).join(' + ')}`
    : p1;

  // Clean badge label and icon
  const rawBadge = recommendation.potentialBadge || 'High Potential';
  const badgeLabel = rawBadge.replace(/^[^\w]+/, '').trim() || 'High Potential';

  // Details & Metrics
  const details = recommendation.details || {};
  const txCount = details.supportingData?.transactionCount || 0;

  // Headline & Narrative
  const headline = recommendation.context || details.framingTitle || 'Pattern Opportunity';
  
  // Condensed 2-line summary (combining summary and suggested action if concise)
  const summary = recommendation.summary || '';
  const suggestedAction = recommendation.suggestedAction || '';
  const condensedSummary = summary && suggestedAction
    ? `${summary} ${suggestedAction}`
    : (summary || suggestedAction || details.rationale || '');

  // Strategy Tag
  const rawTag = recommendation.contextTag || 'Core basket driver';
  const cleanTag = rawTag.replace(/^[^\w]+/, '').trim();

  return (
    <div className="cobuy-rec-3zone-card">
      <div className="cobuy-rec-3zone-grid">
        {/* ── ZONE 1: Product Identity & Volume (~25% Width) ── */}
        <div className="cobuy-rec-zone cobuy-rec-zone--identity">
          <div className="cobuy-rec-zone1-top">
            <span
              className={`cobuy-rec-pill-badge cobuy-rec-pill-badge--${category.toLowerCase()}`}
              style={{
                background: accentTheme.badgeBg,
                borderColor: accentTheme.badgeBorder,
                color: accentTheme.badgeText
              }}
            >
              <span className="cobuy-rec-pill-indicator">▲</span>
              <span>{badgeLabel}</span>
            </span>
          </div>

          <h3 className="cobuy-rec-product-title" title={jointTitle}>
            {jointTitle}
          </h3>

          <div className="cobuy-rec-volume-badge">
            <span className="cobuy-rec-volume-icon-box">
              <BarChart2 size={12} className="cobuy-rec-volume-icon" />
            </span>
            <span>Appears in <strong>{txCount.toLocaleString()}</strong> trans.</span>
          </div>
        </div>

        {/* ── ZONE 2: Action Takeaway & Strategy (~55% Width) ── */}
        <div className="cobuy-rec-zone cobuy-rec-zone--strategy">
          <h4 className="cobuy-rec-headline">
            {headline}
          </h4>

          <p className="cobuy-rec-condensed-summary" title={condensedSummary}>
            {condensedSummary}
          </p>

          {cleanTag && (
            <div className="cobuy-rec-strategy-tag">
              <Tag size={12} className="cobuy-rec-tag-icon" />
              <span>{cleanTag}</span>
            </div>
          )}
        </div>

        {/* ── ZONE 3: Primary Action CTA (~20% Width) ── */}
        <div className="cobuy-rec-zone cobuy-rec-zone--cta">
          <button
            type="button"
            className="cobuy-rec-cta-btn"
            onClick={() => onViewDetails(recommendation)}
            title="View detailed recommendation analytics"
          >
            <span>View details</span>
            <ArrowRight size={14} className="cobuy-rec-cta-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
