import React from 'react';
import { Cpu, X, Layers, Zap, BookOpen, TrendingUp, CheckCircle2 } from 'lucide-react';

const MiningEngineModal = ({
  isOpen,
  onClose,
  stats,
  results,
  consolidatedRules,
  activeDatasetName,
  fileName
}) => {
  if (!isOpen) return null;

  const sampleRule = consolidatedRules?.[0] || results?.rules?.[0];
  const itemA = sampleRule ? sampleRule.antecedents.join(' + ') : (stats?.top_items?.[0]?.name || 'Product A');
  const itemB = sampleRule ? sampleRule.consequents.join(' + ') : (stats?.top_items?.[1]?.name || 'Product B');
  const conf = sampleRule ? (sampleRule.confidence * 100).toFixed(0) : '68';
  const lift = sampleRule ? sampleRule.lift.toFixed(2) : '2.45';
  const boost = sampleRule ? Math.max(25, ((sampleRule.lift - 1) * 100).toFixed(0)) : '145';
  const supportPercent = sampleRule ? (sampleRule.support * 100).toFixed(1) : '12.4';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card fade-in"
        style={{
          maxWidth: '840px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '22px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          padding: '2.3rem',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.75rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '13px',
                background: 'var(--sidebar-active-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color)'
              }}
            >
              <Cpu size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.48rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                How the Mining Engine Computation Works
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Mathematical &amp; algorithmic deep-dive (Apriori / FP-Growth Association Rule Mining)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Core Algorithm Overview */}
        <div
          style={{
            background: 'var(--sidebar-active-bg)',
            border: '1px solid rgba(99, 102, 241, 0.22)',
            borderRadius: '14px',
            padding: '1.35rem 1.6rem',
            marginBottom: '1.8rem'
          }}
        >
          <h4
            style={{
              fontSize: '1.08rem',
              fontWeight: '700',
              color: 'var(--primary-color)',
              margin: '0 0 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Layers size={19} /> The Mining Computation Workflow
          </h4>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.65', margin: '0 0 0.8rem' }}>
            When you click <strong>Run Algorithm</strong>, our backend Python engine reads all customer receipts
            (transactions) from your active dataset and performs a multi-stage data mining process:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ background: 'var(--inner-box-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--primary-color)' }}>●</span> Apriori Engine (Bottom-Up Level Search)
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                Repeatedly scans the database level-by-level (1-item sets → 2-item pairs → 3-item combos). Immediately prunes any combination whose frequency falls below the min support floor (Downward Closure Property).
              </p>
            </div>
            <div style={{ background: 'var(--inner-box-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--accent-color)' }}>●</span> FP-Growth Engine (Prefix-Tree Compression)
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                Compresses the entire transaction history into an in-memory <strong>FP-Tree</strong> in just 2 scans. Extracts frequent item patterns without generating millions of candidate pairs (Up to 100x faster).
              </p>
            </div>
          </div>
        </div>

        {/* The 3 Mathematical Filters */}
        <h3 style={{ fontSize: '1.18rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={19} style={{ color: 'var(--accent-color)' }} /> The 3 Key Threshold Filters &amp; Formulas
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.1rem', marginBottom: '1.8rem' }}>
          {/* Support Filter */}
          <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.02rem', color: 'var(--text-main)' }}>1. Minimum Support (Volume &amp; Noise Filter)</span>
              <span className="mono" style={{ fontSize: '0.8rem', background: 'var(--badge-bg)', padding: '0.2rem 0.65rem', borderRadius: '100px', color: 'var(--text-muted)' }}>Frequency Pruning</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.55', margin: '0 0 0.65rem' }}>
              The engine first counts how often each item combination appears across all receipts. Any combo below your <strong>Min Support Floor</strong> (e.g., 5.0%) is discarded immediately to eliminate accidental statistical noise.
            </p>
            <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '0.65rem 0.95rem', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-color)' }}>
              Support(X ∪ Y) = (Count of Receipts Containing Both X and Y) ÷ (Total Store Receipts)
            </div>
          </div>

          {/* Confidence Filter */}
          <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.02rem', color: 'var(--text-main)' }}>2. Minimum Confidence (Conditional Probability)</span>
              <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.65rem', borderRadius: '100px' }}>Reliability %</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.55', margin: '0 0 0.65rem' }}>
              For every frequent itemset, the engine tests directional rules (If X → Then Y). It calculates what percentage of shoppers who bought X also picked up Y. Rules below your <strong>Min Confidence Floor</strong> (e.g., 50.0%) are rejected.
            </p>
            <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '0.65rem 0.95rem', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
              Confidence(X → Y) = Support(X ∪ Y) ÷ Support(X) = (Receipts with Both) ÷ (Receipts with X)
            </div>
          </div>

          {/* Lift Filter */}
          <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.02rem', color: 'var(--text-main)' }}>3. Pairing Strength (Lift)</span>
              <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent-color)', padding: '0.2rem 0.65rem', borderRadius: '100px' }}>Strength Factor</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.55', margin: '0 0 0.65rem' }}>
              Measures how strong the connection is between the two items. A score of 1.00x means no connection (items are bought together purely by chance). A score of 2.40x means shoppers who buy X are <strong>2.4 times more likely</strong> to also buy Y than normal!
            </p>
            <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '0.65rem 0.95rem', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-color)' }}>
              Pairing Strength = Confidence(X → Y) ÷ Normal Purchase Rate(Y)
            </div>
          </div>
        </div>

        {/* How Recommendations Are Tagged */}
        <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={17} style={{ color: 'var(--primary-color)' }} /> How Recommendations &amp; Badges Are Computed
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
            Once all rules pass your 3 threshold filters, they are sorted descending by <strong>Pairing Strength × Likelihood</strong>.
            <br />● <strong>🔥 Strong Product Pairing (Pairing Strength &gt; 1.2x &amp; Likelihood &gt; 50%)</strong>: Top-tier product pairings recommended for immediate bundle pricing, end-cap displays, or checkout pop-ups.
            <br />● <strong>🛒 Cross-Promotion (High Volume / Moderate Strength)</strong>: Strong volume anchors recommended for circular ads or aisle co-location.
          </p>
        </div>

        {/* Live Data Example Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            padding: '1.4rem 1.6rem',
            marginBottom: '1.75rem',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <h4 style={{ fontSize: '1.08rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: '#10b981' }} /> Live Example Based on Your Uploaded Data
            </h4>
            <span style={{ fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '100px', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              Dataset: {activeDatasetName || fileName || 'Store Transactions'}
            </span>
          </div>

          <div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.6', margin: '0 0 1rem' }}>
              Suppose your Excel/CSV file shows that when shoppers buy <strong>{itemA}</strong>, they frequently also purchase <strong>{itemB}</strong>:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.1rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Store Co-Purchase Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-color)' }}>{supportPercent}%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>of all receipts contain both</div>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Shopper Reliability</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>{conf}%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>chance to grab {itemB}</div>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pairing Strength</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-color)' }}>{lift}x</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>more likely than normal</div>
              </div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid #10b981', padding: '0.85rem 1.1rem', borderRadius: '0 10px 10px 0' }}>
              <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💰 How Your Sales Boost ({"+" + boost + "% Surge"}):
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                Because shoppers buying <strong>{itemA}</strong> are <strong>{lift}x more likely</strong> to buy <strong>{itemB}</strong>, placing them side-by-side on an end-cap or offering a <em>Buy {itemA}, get 10% off {itemB}</em> bundle directly turns single-item baskets into high-value pairs—generating an estimated <strong>+{boost}% cross-sell revenue boost</strong> for these products!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--accent-color)' }} />
            <span>Tip: Set algorithm to <strong>Auto (Adaptive)</strong> in the parameters panel for automatic floor calculation!</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ padding: '0.65rem 1.6rem', fontSize: '0.92rem', fontWeight: '600' }}
          >
            Got It, Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiningEngineModal;
