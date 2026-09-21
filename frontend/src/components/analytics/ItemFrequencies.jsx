import React, { useState } from 'react';
import {
  Layers,
  HelpCircle,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight
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
  selectedCategories = ['All'],
  selectedCategory = 'All',
  selectedProducts = [],
  selectedProduct = null, // backward compatibility
  onToggleProduct,
  onSelectProduct,
  onRemoveProduct,
  onClearProducts,
  onClearSelectedProduct,
  coBoughtResults = [],
  loadingCoBought = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCartDesc, setShowCartDesc] = useState(() => {
    return sessionStorage.getItem('show_cart_desc') === 'true';
  });

  // Associated products pagination state to accommodate large result sets without discarding
  const [assocPage, setAssocPage] = useState(1);
  const assocPageSize = 8;

  const toggleCartDesc = () => {
    const next = !showCartDesc;
    setShowCartDesc(next);
    sessionStorage.setItem('show_cart_desc', next ? 'true' : 'false');
  };

  // Resolve multi-product selection list
  const selectedList = Array.isArray(selectedProducts) && selectedProducts.length > 0
    ? selectedProducts
    : (selectedProduct ? [selectedProduct] : (Array.isArray(selectedProducts) ? selectedProducts : []));

  const handleItemClick = (productName) => {
    if (onToggleProduct) {
      onToggleProduct(productName);
    } else if (onSelectProduct) {
      onSelectProduct(productName);
    }
  };

  const handleRemove = (productName) => {
    if (onRemoveProduct) {
      onRemoveProduct(productName);
    } else if (onToggleProduct) {
      onToggleProduct(productName);
    } else if (onClearSelectedProduct) {
      onClearSelectedProduct();
    }
  };

  const handleClearAll = () => {
    if (onClearProducts) {
      onClearProducts();
    } else if (onClearSelectedProduct) {
      onClearSelectedProduct();
    }
  };

  // Resolve active category filter set
  const activeCategorySet = React.useMemo(() => {
    if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
      if (selectedCategories.includes('All')) {
        return null;
      }
      return new Set(selectedCategories.map(c => c.toLowerCase()));
    }
    if (selectedCategory && selectedCategory !== 'All') {
      return new Set([selectedCategory.toLowerCase()]);
    }
    return null;
  }, [selectedCategories, selectedCategory]);

  // 1. Scoped Category Filter for "What's in Customers' Carts"
  const allItems = stats?.all_items || [];
  const categoryFilteredItems = activeCategorySet
    ? allItems.filter(item => activeCategorySet.has((item.category || '').toLowerCase()))
    : allItems;

  const trimmedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = categoryFilteredItems.filter(item =>
    !trimmedSearch || item.name.toLowerCase().includes(trimmedSearch)
  );

  // 2. Scoped Category Filter for "Top 10 Sellers"
  const topSellersSource = activeCategorySet
    ? allItems.filter(item => activeCategorySet.has((item.category || '').toLowerCase()))
    : (stats?.top_items && stats.top_items.length > 0 ? stats.top_items : allItems);

  const top10Sellers = [...topSellersSource]
    .sort((a, b) => (b.count || b.quantity || b.value || 0) - (a.count || a.quantity || a.value || 0))
    .slice(0, 10);

  // 3. Associated Products pagination (NO 1-product limit, all qualifying items preserved)
  const totalAssoc = coBoughtResults.length;
  const totalAssocPages = Math.max(1, Math.ceil(totalAssoc / assocPageSize));
  const safeAssocPage = Math.min(assocPage, totalAssocPages);
  const startIdx = (safeAssocPage - 1) * assocPageSize;
  const paginatedAssoc = coBoughtResults.slice(startIdx, startIdx + assocPageSize);

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
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            {selectedCategory !== 'All' ? ` (${selectedCategory})` : ''}
          </span>
        </div>

        {showCartDesc && (
          <div className="cobuy-card-desc">
            Shows how often each product is present in shopping carts. Click one or more rows to discover associated products frequently bought together.
          </div>
        )}

        {/* Selected Products Chips Bar */}
        {selectedList.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.35rem',
            padding: '0.45rem 0.6rem',
            background: 'rgba(99, 102, 241, 0.06)',
            borderRadius: '8px',
            marginBottom: '0.65rem',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4f46e5' }}>
              Selected ({selectedList.length}):
            </span>
            {selectedList.map(p => (
              <span
                key={p}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: '#ffffff',
                  color: '#4f46e5',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '6px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.72rem',
                  fontWeight: '600'
                }}
              >
                {p}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(p);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#6366f1',
                    display: 'flex'
                  }}
                  title={`Remove ${p}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0 0.25rem',
                marginLeft: 'auto'
              }}
            >
              Clear All
            </button>
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
                  const isSelected = selectedList.includes(item.name);
                  const pct = ((item.support || 0) * 100).toFixed(1);
                  return (
                    <tr
                      key={item.name}
                      onClick={() => handleItemClick(item.name)}
                      className={isSelected ? 'selected-row' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="col-rank">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '4px',
                            border: isSelected ? '1px solid #4f46e5' : '1px solid var(--border-color)',
                            background: isSelected ? '#4f46e5' : 'var(--card-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="cobuy-rank-pill">{idx + 1}</span>
                        </div>
                      </td>
                      <td className="col-name" style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span>{renderHighlightedPrefix(item.name, searchTerm)}</span>
                          {item.category && item.category !== 'Uncategorized' && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background: 'var(--inner-box-bg)',
                              color: 'var(--text-dim)',
                              fontWeight: '500'
                            }}>
                              {item.category}
                            </span>
                          )}
                        </div>
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

      {/* ── CARD 2: Frequently Bought Together (Associated Products) ── */}
      {/* NOTE: Preserves genuine cross-category association analysis; NOT restricted to selectedCategory */}
      <div className="cobuy-white-card accent-border">
        <div className="cobuy-card-header">
          <h3 className="cobuy-card-title" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <ShoppingCart size={17} style={{ color: '#6366f1', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedList.length === 0
                ? 'Frequently Bought Together...'
                : selectedList.length === 1
                  ? `Bought Together with ${selectedList[0]}`
                  : `Bought Together (${selectedList.length} Selected)`}
            </span>
          </h3>
          {selectedList.length > 0 && (
            <button
              onClick={handleClearAll}
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
              title="Clear all selections"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Display selected set chips in Card 2 */}
        {selectedList.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.35rem 0.55rem',
            background: 'var(--inner-box-bg)',
            borderRadius: '6px',
            marginBottom: '0.65rem'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '600' }}>Cart:</span>
            {selectedList.map(p => (
              <span
                key={p}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: 'var(--text-main)'
                }}
              >
                {p}
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="cobuy-card-body">
          {loadingCoBought ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} className="spin" /> Calculating co-occurrences...
            </div>
          ) : selectedList.length === 0 ? (
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
                Select One or More Products
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, maxWidth: '220px', lineHeight: '1.4' }}>
                Click items in What's In Customers' Carts to reveal all products frequently purchased together.
              </p>
            </div>
          ) : coBoughtResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No frequently co-purchased items found for the selected product(s).
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <span>
                  Showing all <strong>{totalAssoc}</strong> qualifying associated {totalAssoc === 1 ? 'product' : 'products'}
                </span>
                {totalAssocPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setAssocPage(p => Math.max(1, p - 1))}
                      disabled={safeAssocPage === 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px 3px',
                        cursor: safeAssocPage === 1 ? 'default' : 'pointer',
                        color: safeAssocPage === 1 ? 'var(--text-dim)' : 'var(--primary-color)'
                      }}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span>{safeAssocPage} / {totalAssocPages}</span>
                    <button
                      type="button"
                      onClick={() => setAssocPage(p => Math.min(totalAssocPages, p + 1))}
                      disabled={safeAssocPage === totalAssocPages}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px 3px',
                        cursor: safeAssocPage === totalAssocPages ? 'default' : 'pointer',
                        color: safeAssocPage === totalAssocPages ? 'var(--text-dim)' : 'var(--primary-color)'
                      }}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              <table className="cobuy-list-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="col-rank" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top No.</th>
                    <th className="col-name" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Name</th>
                    <th className="col-metric" style={{ fontWeight: '600', fontSize: '0.68rem', color: 'var(--text-dim)', paddingBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Times Bought</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssoc.map((item, idx) => {
                    const globalIndex = startIdx + idx;
                    const isFirst = globalIndex === 0;
                    const productName = item.product_name || item.name || '—';
                    const count = item.count || item.quantity || 0;
                    const category = item.category;
                    return (
                      <tr key={productName} className={isFirst ? 'top-accent-row' : ''}>
                        <td className="col-rank">{globalIndex + 1}</td>
                        <td className="col-name" style={{ fontWeight: isFirst ? '700' : '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span>{productName}</span>
                            {category && category !== 'Uncategorized' && (
                              <span style={{
                                fontSize: '0.66rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                color: '#6366f1',
                                fontWeight: '500'
                              }}>
                                {category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="col-metric" style={{ color: isFirst ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                          {count > 0 ? `${count.toLocaleString()} times` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3: Top 10 Sellers ──────────────────────────────────── */}
      {/* Responds to selectedCategory */}
      <div className="cobuy-white-card">
        <div className="cobuy-card-header">
          <h3 className="cobuy-card-title">
            <TrendingUp size={17} style={{ color: '#4f46e5' }} />
            Top 10 Sellers
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            {selectedCategory !== 'All' ? `In ${selectedCategory}` : 'By Total Volume'}
          </span>
        </div>

        <div className="cobuy-card-body">
          {top10Sellers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No sales data available for this category.
            </div>
          ) : (
            <table className="cobuy-list-table">
              <tbody>
                {top10Sellers.map((item, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <tr
                      key={item.name}
                      className={isFirst ? 'selected-row' : ''}
                    >
                      <td className="col-rank">
                        <span className={`cobuy-rank-pill ${isFirst ? 'is-first' : ''}`}>{idx + 1}</span>
                      </td>
                      <td className="col-name" style={{ color: isFirst ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span>{item.name}</span>
                          {item.category && item.category !== 'Uncategorized' && (
                            <span style={{
                              fontSize: '0.66rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background: 'var(--inner-box-bg)',
                              color: 'var(--text-dim)',
                              fontWeight: '500'
                            }}>
                              {item.category}
                            </span>
                          )}
                        </div>
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
