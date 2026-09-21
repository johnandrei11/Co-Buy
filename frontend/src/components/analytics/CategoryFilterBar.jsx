import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, X, ChevronDown, ChevronUp, Check, RotateCcw, Info } from 'lucide-react';

/**
 * CategoryFilterBar
 * Compact Category Filter with a popout panel containing checkboxes and search.
 * 
 * Initial state:
 * - Only the Category label and [ All Categories (N) ⌄ ] trigger button are visible.
 * 
 * When clicked:
 * - A clean popout panel appears displaying:
 *   - Search categories input
 *   - [☑] All Categories (N)
 *   - Checkbox list of all dynamically discovered categories from the uploaded dataset
 *   - Merchants can check/uncheck specific categories to filter.
 */
const CategoryFilterBar = ({
  categoryOptions = [],
  selectedCategories = ['All'],
  onChangeSelectedCategories,
  productCategoriesMap = {},
  stats = {},
  totalProductsCount = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoutRef = useRef(null);
  const triggerRef = useRef(null);

  // Close popout on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoutRef.current &&
        !popoutRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Dynamically compute unique product count for each category from the uploaded dataset
  const categoryCounts = React.useMemo(() => {
    const counts = {};
    const uniqueProductsAll = new Set();

    if (Array.isArray(stats?.all_items) && stats.all_items.length > 0) {
      stats.all_items.forEach(it => {
        if (it?.name) {
          uniqueProductsAll.add(it.name.toLowerCase());
          const cat = (it.category && typeof it.category === 'string' && it.category.trim() && it.category.trim().toLowerCase() !== 'uncategorized')
            ? it.category.trim()
            : (productCategoriesMap[it.name.toLowerCase()] || '');
          if (cat) {
            const key = cat.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      });
    } else if (productCategoriesMap && Object.keys(productCategoriesMap).length > 0) {
      Object.entries(productCategoriesMap).forEach(([pName, cat]) => {
        if (cat && typeof cat === 'string' && cat.trim() && cat.trim().toLowerCase() !== 'uncategorized') {
          uniqueProductsAll.add(pName.toLowerCase());
          const key = cat.trim().toLowerCase();
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    }

    const total = uniqueProductsAll.size || stats?.unique_items_count || (stats?.all_items?.length || 0);
    return { counts, total };
  }, [stats?.all_items, stats?.unique_items_count, productCategoriesMap]);

  const allCount = totalProductsCount > 0 ? totalProductsCount : categoryCounts.total;

  // Determine if "All Categories" is selected
  const isAllSelected = Array.isArray(selectedCategories) && (
    selectedCategories.includes('All') ||
    (categoryOptions.length > 0 && selectedCategories.length === categoryOptions.length)
  );

  // Check if an individual category is selected
  const isCatSelected = (cat) => {
    if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) {
      return false;
    }
    if (selectedCategories.includes('All')) {
      return true;
    }
    return selectedCategories.some(c => c.toLowerCase() === cat.toLowerCase());
  };

  // Toggle "All Categories"
  const handleToggleAll = () => {
    if (isAllSelected) {
      // Uncheck All Categories -> unchecks all checkboxes
      onChangeSelectedCategories([]);
    } else {
      // Check All Categories -> checks all checkboxes
      onChangeSelectedCategories(['All']);
    }
  };

  // Toggle an individual category
  const handleToggleCategory = (cat) => {
    if (selectedCategories.includes('All')) {
      // If all were selected, clicking one category focuses on just that category
      onChangeSelectedCategories([cat]);
      return;
    }

    const exists = selectedCategories.some(c => c.toLowerCase() === cat.toLowerCase());
    let next;
    if (exists) {
      next = selectedCategories.filter(c => c.toLowerCase() !== cat.toLowerCase());
    } else {
      next = [...selectedCategories, cat];
      if (categoryOptions.length > 0 && next.length === categoryOptions.length) {
        next = ['All'];
      }
    }
    onChangeSelectedCategories(next);
  };

  // Dynamic search filtering within the popout list
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categoryOptions;
    const q = searchQuery.trim().toLowerCase();
    return categoryOptions.filter(cat => cat.toLowerCase().includes(q));
  }, [categoryOptions, searchQuery]);

  // Compute trigger button label
  const triggerLabel = React.useMemo(() => {
    if (isAllSelected) {
      return `All Categories (${allCount})`;
    }
    if (!selectedCategories || selectedCategories.length === 0) {
      return `Select Categories (${categoryOptions.length})`;
    }
    if (selectedCategories.length === 1) {
      const single = selectedCategories[0];
      const count = categoryCounts.counts[single.toLowerCase()] || 0;
      return `${single} (${count})`;
    }
    return `${selectedCategories.length} Categories Selected`;
  }, [isAllSelected, selectedCategories, allCount, categoryCounts.counts, categoryOptions.length]);

  if (!categoryOptions || categoryOptions.length === 0) {
    return null;
  }

  return (
    <div className="cobuy-category-filter-card fade-in">
      <div className="cobuy-cat-filter-top">
        {/* Left: Category Label and Popout Trigger */}
        <div className="cobuy-cat-filter-left-group">
          <div className="cobuy-cat-filter-header">
            <div className="cobuy-cat-filter-badge-icon">
              <Filter size={15} />
            </div>
            <span className="cobuy-cat-filter-title">Category:</span>
          </div>

          {/* Trigger Button */}
          <div className="cobuy-cat-popout-container">
            <button
              ref={triggerRef}
              type="button"
              className={`cobuy-cat-trigger-btn ${isOpen ? 'is-open' : ''} ${!isAllSelected ? 'is-filtered' : ''}`}
              onClick={() => setIsOpen(prev => !prev)}
              aria-haspopup="true"
              aria-expanded={isOpen}
            >
              <span className="cobuy-cat-trigger-text">{triggerLabel}</span>
              {isOpen ? (
                <ChevronUp size={16} className="cobuy-cat-trigger-icon" />
              ) : (
                <ChevronDown size={16} className="cobuy-cat-trigger-icon" />
              )}
            </button>

            {/* ── Popout Panel ── */}
            {isOpen && (
              <div className="cobuy-cat-popout-panel fade-in" ref={popoutRef}>
                {/* Search categories input inside popout */}
                <div className="cobuy-cat-popout-search">
                  <Search size={14} className="cobuy-cat-popout-search-icon" />
                  <input
                    type="text"
                    className="cobuy-cat-popout-search-input"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="cobuy-cat-popout-search-clear"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Popout Checkbox List */}
                <div className="cobuy-cat-popout-list">
                  {/* All Categories Checkbox Option */}
                  {(!searchQuery.trim() || 'all categories'.includes(searchQuery.trim().toLowerCase())) && (
                    <div
                      className={`cobuy-cat-popout-item all-option ${isAllSelected ? 'selected' : ''}`}
                      onClick={handleToggleAll}
                    >
                      <div className={`cobuy-cat-checkbox ${isAllSelected ? 'checked' : ''}`}>
                        {isAllSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="cobuy-cat-popout-item-name">All Categories</span>
                      <span className="cobuy-cat-popout-item-count">({allCount})</span>
                    </div>
                  )}

                  <div className="cobuy-cat-popout-divider" />

                  {/* Individual Categories with Checkboxes */}
                  {filteredCategories.map((cat) => {
                    const checked = isCatSelected(cat);
                    const count = categoryCounts.counts[cat.toLowerCase()] || 0;

                    return (
                      <div
                        key={cat}
                        className={`cobuy-cat-popout-item ${checked ? 'selected' : ''}`}
                        onClick={() => handleToggleCategory(cat)}
                      >
                        <div className={`cobuy-cat-checkbox ${checked ? 'checked' : ''}`}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="cobuy-cat-popout-item-name">{cat}</span>
                        <span className="cobuy-cat-popout-item-count">({count})</span>
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 && searchQuery.trim() && (
                    <div className="cobuy-cat-popout-empty">
                      No matching categories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Informative Scoped Badge & Reset Button */}
        <div className="cobuy-cat-filter-actions">
          <div
            className="cobuy-cat-scope-tag"
            title="Scoped filter: Applies to Customers' Carts, Top Sellers, Recommendations antecedents, and Combos primary product. Frequently Bought Together remains cross-category."
          >
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Scoped View</span>
          </div>

          {!isAllSelected && (
            <button
              type="button"
              className="cobuy-cat-reset-btn"
              onClick={() => onChangeSelectedCategories(['All'])}
              title="Reset to All Categories"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CategoryFilterBar);
