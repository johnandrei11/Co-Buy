import React, { useState } from 'react';
import {
  Layers,
  HelpCircle,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';



// Helper to highlight the matching search text anywhere in product names
export const renderHighlightedPrefix = (text, query) => {
  if (!text || !query || !query.trim()) return text;
  const q = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  if (!lowerText.includes(lowerQ)) return text;

  const parts = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQ, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(text.substring(lastIndex, idx));
    }
    parts.push(
      <mark key={idx} className="cobuy-search-highlight">
        {text.substring(idx, idx + q.length)}
      </mark>
    );
    lastIndex = idx + q.length;
    idx = lowerText.indexOf(lowerQ, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts}</>;
};

const ItemFrequencies = ({
  stats,
  results,
  selectedProduct,
  onSelectProduct,
  coBoughtResults = [],
  loadingCoBought = false,
  onClearSelectedProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCartDesc, setShowCartDesc] = useState(() => {
    return sessionStorage.getItem('show_cart_desc') === 'true';
  });

  const toggleCartDesc = () => {
    const next = !showCartDesc;
    setShowCartDesc(next);
    sessionStorage.setItem('show_cart_desc', next ? 'true' : 'false');
  };

  // Filter products in What's In Customers' Carts by substring anywhere in the name
  const allItems = stats.all_items || [];
  const trimmedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = allItems.filter(item =>
    !trimmedSearch || item.name.toLowerCase().includes(trimmedSearch)
  );

  return (
    <div className="cobuy-grid-3">
      {/* ── CARD 1: What's In Customers' Carts ──────────────────────── */}
      <div className="cobuy-white-card">
        <div className="cobuy-card-header">
          <h3 className="cobuy-card-title">
            <Layers size={17} style={{ color: '#4f46e5' }} />
            What's In Customers' Carts
            <button
              onClick={toggleCartDesc}
              style={{
                background: 'none',
                border: 'none',
                color: showCartDesc ? '#4f46e5' : '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: '0.2rem'
              }}
              title="Toggle explanation"
            >
              <HelpCircle size={15} />
            </button>
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            {allItems.length > 0 ? `${allItems.length} items` : ''}
          </span>
        </div>

        {showCartDesc && (
          <div className="cobuy-card-desc">
            Shows how often each product is present in shopping carts. Click any row to reveal co-purchased items.
          </div>
        )}

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cobuy-card-search"
          />
        </div>

        {/* Scrollable Products List */}
        <div className="cobuy-card-body">
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              {allItems.length === 0 ? 'No cart data loaded yet.' : 'No matching products.'}
            </div>
          ) : (
            <table className="cobuy-list-table">
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedProduct === item.name;
                  const pct = ((item.support || 0) * 100).toFixed(1);
                  return (
                    <tr
                      key={item.name}
                      onClick={() => onSelectProduct(item.name)}
                      className={isSelected ? 'selected-row' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="col-rank">
                        <span className="cobuy-rank-pill">{idx + 1}</span>
                      </td>
                      <td className="col-name" style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        {renderHighlightedPrefix(item.name, searchTerm)}
                      </td>
                      <td className="col-metric" style={{ color: isSelected ? 'var(--primary-hover)' : 'var(--primary-color)' }}>
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CARD 2: Frequently Bought Together ─────────────────────── */}
      <div className="cobuy-white-card accent-border">
        <div className="cobuy-card-header">
          <h3 className="cobuy-card-title" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <ShoppingCart size={17} style={{ color: '#6366f1', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedProduct ? `Frequently Bought Together with ${selectedProduct}` : 'Frequently Bought Together...'}
            </span>
          </h3>
          {selectedProduct && (
            <button
              onClick={onClearSelectedProduct}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              title="Clear selection"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="cobuy-card-body">
          {loadingCoBought ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} className="spin" /> Calculating co-occurrences...
            </div>
          ) : !selectedProduct ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <ShoppingCart size={28} style={{ color: '#a5b4fc', marginBottom: '0.6rem' }} />
              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Select a Product
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, maxWidth: '200px', lineHeight: '1.4' }}>
                Click any item in What's In Customers' Carts to view products commonly bought alongside it.
              </p>
            </div>
          ) : coBoughtResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No frequently co-purchased items found for "{selectedProduct}".
            </div>
          ) : (
            <table className="cobuy-list-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="col-rank" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top No.</th>
                  <th className="col-name" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Name</th>
                  <th className="col-metric" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Times Bought Together</th>
                </tr>
              </thead>
              <tbody>
                {coBoughtResults.map((item, idx) => {
                  const isFirst = idx === 0;
                  const productName = item.product_name || item.name || '—';
                  const count = item.count || item.quantity || 0;
                  return (
                    <tr key={productName} className={isFirst ? 'top-accent-row' : ''}>
                      <td className="col-rank">{idx + 1}</td>
                      <td className="col-name" style={{ fontWeight: isFirst ? '700' : '600' }}>
                        {productName}
                      </td>
                      <td className="col-metric" style={{ color: isFirst ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                        {count > 0 ? `${count.toLocaleString()} times` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CARD 3: Top 10 Sellers ──────────────────────────────────── */}
      <div className="cobuy-white-card">
        <div className="cobuy-card-header">
          <h3 className="cobuy-card-title">
            <TrendingUp size={17} style={{ color: '#4f46e5' }} />
            Top 10 Sellers
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            By Total Volume
          </span>
        </div>

        <div className="cobuy-card-body">
          {(!stats.top_items || stats.top_items.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No sales data available. Run the algorithm to view top sellers.
            </div>
          ) : (
            <table className="cobuy-list-table">
              <tbody>
                {stats.top_items.slice(0, 10).map((item, idx) => {
                  const isFirst = idx === 0;
                  const rankLabel = isFirst ? '#1' : `${idx + 1}.`;
                  return (
                    <tr
                      key={item.name}
                      className={isFirst ? 'selected-row' : ''}
                    >
                      <td className="col-rank">
                        <span className={`cobuy-rank-pill ${isFirst ? 'is-first' : ''}`}>{idx + 1}</span>
                      </td>
                      <td className="col-name" style={{ color: isFirst ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        {item.name}
                      </td>
                      <td className="col-metric" style={{ color: isFirst ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                        {(item.count || item.quantity || item.value || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemFrequencies;
