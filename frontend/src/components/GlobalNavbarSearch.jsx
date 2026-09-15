import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Search, X, Package, ArrowRight } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const GlobalNavbarSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch available products from user's active datasets
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/products`);
      if (res.data && Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      }
    } catch (err) {
      // If unauthenticated or no dataset, fail quietly
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleDatasetUpdate = () => {
      fetchProducts();
    };

    window.addEventListener('dataset-activated', handleDatasetUpdate);
    window.addEventListener('dataset-updated', handleDatasetUpdate);
    return () => {
      window.removeEventListener('dataset-activated', handleDatasetUpdate);
      window.removeEventListener('dataset-updated', handleDatasetUpdate);
    };
  }, []);

  // Sync with search parameter if on analytics page
  useEffect(() => {
    if (location.pathname === '/analytics') {
      const sp = new URLSearchParams(location.search);
      const s = sp.get('search');
      if (s && s !== query) {
        setQuery(s);
      }
    }
  }, [location]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Substring filtering anywhere in the product name (case-insensitive)
  const trimmed = query.trim().toLowerCase();
  const filteredProducts = trimmed
    ? products.filter((p) => p.name.toLowerCase().includes(trimmed)).slice(0, 10)
    : [];

  const handleSelectProduct = (productName) => {
    setQuery(productName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    // Dynamic navigation to analytics without full-page reload
    navigate(`/analytics?search=${encodeURIComponent(productName)}&product=${encodeURIComponent(productName)}`);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredProducts.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        setIsOpen(false);
        navigate(`/analytics?search=${encodeURIComponent(query.trim())}`);
        if (inputRef.current) inputRef.current.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        handleSelectProduct(filteredProducts[highlightedIndex].name);
      } else if (query.trim()) {
        setIsOpen(false);
        navigate(`/analytics?search=${encodeURIComponent(query.trim())}`);
        if (inputRef.current) inputRef.current.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (inputRef.current) inputRef.current.blur();
    }
  };

  // Highlights all matching occurrences anywhere within the string
  const renderHighlight = (text, queryText) => {
    if (!text || !queryText || !queryText.trim()) return text;
    const q = queryText.trim();
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

  return (
    <div className="cobuy-top-search-wrapper" ref={wrapperRef}>
      <Search size={15} className="cobuy-top-search-icon" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search anything..."
        className="cobuy-top-search-input"
        value={query}
        onFocus={() => {
          if (products.length === 0) fetchProducts();
          if (query.trim()) setIsOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck="false"
      />

      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setIsOpen(false);
            setHighlightedIndex(-1);
            if (inputRef.current) inputRef.current.focus();
          }}
          className="cobuy-top-search-clear"
          title="Clear search"
        >
          <X size={13} />
        </button>
      )}

      {/* Progressive Prefix Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="cobuy-top-search-dropdown fade-in">
          <div className="cobuy-top-search-header">
            <span>Matching Products ({filteredProducts.length})</span>
            <span className="cobuy-top-search-hint">Use ↑ ↓ to navigate, ↵ to select</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="cobuy-top-search-empty">
              No products found containing "<strong>{query.trim()}</strong>"
            </div>
          ) : (
            <div className="cobuy-top-search-list">
              {filteredProducts.map((product, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={product.name}
                    className={`cobuy-top-search-item ${isHighlighted ? 'active' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectProduct(product.name)}
                  >
                    <div className="cobuy-top-search-item-main">
                      <Package size={14} className="cobuy-top-search-item-icon" />
                      <span className="cobuy-top-search-item-text">
                        {renderHighlight(product.name, query)}
                      </span>
                    </div>
                    <div className="cobuy-top-search-item-meta">
                      {product.count ? (
                        <span>{product.count.toLocaleString()} orders</span>
                      ) : (
                        <span>Product</span>
                      )}
                      <ArrowRight size={12} className="cobuy-top-search-item-arrow" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalNavbarSearch;
