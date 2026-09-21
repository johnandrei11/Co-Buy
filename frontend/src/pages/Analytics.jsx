import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  RotateCcw,
  Sliders,
  Calendar,
  Sparkles,
  Filter,
  Loader2
} from 'lucide-react';

import AnalyticsSetupState from '../components/analytics/AnalyticsSetupState';
import SampleFileModal from '../components/analytics/SampleFileModal';
import ItemFrequencies from '../components/analytics/ItemFrequencies';
import RecommendationsView from '../components/analytics/RecommendationsView';
import CategoryFilterBar from '../components/analytics/CategoryFilterBar';
import MiningParametersModal from '../components/analytics/MiningParametersModal';
import MiningEngineModal from '../components/analytics/MiningEngineModal';
import '../components/analytics/analytics.css';

const API_BASE = 'http://localhost:5000/api';

const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || localStorage.getItem('activeDatasetId');
  const activeDatasetName = localStorage.getItem('activeDatasetName');

  const [file, setFile] = useState(() => {
    const savedName = sessionStorage.getItem('analytics_file_name');
    return savedName ? { name: savedName } : null;
  });
  const [uploadStatus, setUploadStatus] = useState(() => {
    const savedName = sessionStorage.getItem('analytics_file_name');
    return savedName ? 'success' : 'idle';
  });
  const [uploadError, setUploadError] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isEmptyUpload, setIsEmptyUpload] = useState(() => {
    const saved = sessionStorage.getItem('analytics_is_empty_upload');
    return saved === 'true';
  });
  const [miningStatus, setMiningStatus] = useState(() => {
    const saved = sessionStorage.getItem('analytics_results');
    return saved ? 'success' : 'idle';
  });
  const [activeSubTab, setActiveSubTab] = useState(() => {
    return sessionStorage.getItem('analytics_subtab') || 'recommendations';
  });
  const [duplicateNotice, setDuplicateNotice] = useState(null);

  const [params, setParams] = useState(() => {
    const saved = sessionStorage.getItem('analytics_params');
    return saved ? JSON.parse(saved) : {
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    };
  });

  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('analytics_results');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      const activeId = new URLSearchParams(window.location.search).get('dataset_id') || localStorage.getItem('activeDatasetId');
      if (activeId && parsed && parsed.dataset_id && String(parsed.dataset_id) !== String(activeId)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [forceSetupView, setForceSetupView] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const userName = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'John Andreil');

  const hasResults = Boolean(results && (results.rules?.length > 0 || results.frequent_itemsets?.length > 0 || results.metrics));

  useEffect(() => {
    sessionStorage.setItem('analytics_params', JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    sessionStorage.setItem('analytics_subtab', activeSubTab);
  }, [activeSubTab]);


  // Real-time states
  const [stats, setStats] = useState({
    active: false,
    total_transactions: 0,
    unique_items_count: 0,
    top_items: [],
    all_items: [],
    recommended_algorithm: 'None'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedRules, setExpandedRules] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showCartDesc, setShowCartDesc] = useState(() => {
    const saved = sessionStorage.getItem('show_cart_desc');
    return saved === 'true';
  });
  const [showAnalysisDesc, setShowAnalysisDesc] = useState(() => {
    const saved = sessionStorage.getItem('show_analysis_desc');
    return saved === 'true';
  });
  const [showMiningModal, setShowMiningModal] = useState(false);
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(['All']);
  const [selectedCartProducts, setSelectedCartProducts] = useState([]);
  const [coBoughtResults, setCoBoughtResults] = useState([]);
  const [loadingCoBought, setLoadingCoBought] = useState(false);
  const [recommendationSearchTerm, setRecommendationSearchTerm] = useState('');

  // Dynamically derived unique categories from the uploaded dataset
  const categoryOptions = React.useMemo(() => {
    const cats = new Set();
    if (Array.isArray(stats?.categories)) {
      stats.categories.forEach(c => {
        if (c && typeof c === 'string' && c.trim() && c.trim().toLowerCase() !== 'uncategorized') {
          cats.add(c.trim());
        }
      });
    }
    if (Array.isArray(results?.categories)) {
      results.categories.forEach(c => {
        if (c && typeof c === 'string' && c.trim() && c.trim().toLowerCase() !== 'uncategorized') {
          cats.add(c.trim());
        }
      });
    }
    if (Array.isArray(stats?.all_items)) {
      stats.all_items.forEach(it => {
        if (it?.category && typeof it.category === 'string' && it.category.trim() && it.category.trim().toLowerCase() !== 'uncategorized') {
          cats.add(it.category.trim());
        }
      });
    }
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [stats?.categories, results?.categories, stats?.all_items]);

  useEffect(() => {
    if (selectedCategories && selectedCategories.length > 0 && !selectedCategories.includes('All')) {
      const valid = selectedCategories.filter(c =>
        categoryOptions.some(opt => opt.toLowerCase() === c.toLowerCase())
      );
      if (valid.length === 0) {
        setSelectedCategories(['All']);
      } else if (valid.length !== selectedCategories.length) {
        setSelectedCategories(valid);
      }
    }
  }, [categoryOptions]);

  const productCategoriesMap = React.useMemo(() => {
    const map = {};
    if (stats?.product_categories) {
      Object.entries(stats.product_categories).forEach(([k, v]) => {
        if (k && v) map[k.toLowerCase()] = v;
      });
    }
    if (results?.product_categories) {
      Object.entries(results.product_categories).forEach(([k, v]) => {
        if (k && v) map[k.toLowerCase()] = v;
      });
    }
    if (Array.isArray(stats?.all_items)) {
      stats.all_items.forEach(it => {
        if (it?.name && it?.category) {
          map[it.name.toLowerCase()] = it.category;
        }
      });
    }
    return map;
  }, [stats?.product_categories, results?.product_categories, stats?.all_items]);

  const toggleRuleExpand = (idx) => {
    setExpandedRules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleGroupCollapse = (size) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [size]: prev[size] === false ? true : false
    }));
  };

  const [cleaningStats, setCleaningStats] = useState(() => {
    const saved = sessionStorage.getItem('analytics_cleaning_stats');
    return saved ? JSON.parse(saved) : null;
  });

  // ── Consolidation configuration ───────────────────────────────────────────
  /** Min confidence gap (fraction) between rank-1 and rank-2 to choose 'single' mode. */
  const CONSOLIDATION_GAP_THRESHOLD = 0.15;
  /** Min confidence for a rank-3+ rule to be included in a flexible tie group. */
  const CONSOLIDATION_NOTABLE_FLOOR = 0.40;
  /** Min antecedent transaction count to consider a rule reliably established. */
  const RELIABILITY_MIN_TX_COUNT = 20;

  // ── Store-type + tie-mode aware suggestion templates (3-D map) ───────────
  // Keyed by [market_type][action_category][tie_mode]
  // single(anchor, paired)  — one clear winning pairing
  // flexible(anchor, list)  — list = comma-joined alternatives, customer picks one
  const ACTION_TEMPLATES = {
    'Coffee Shop': {
      placement: {
        single: (anchor, paired) => `Feature ${paired} alongside ${anchor} on the counter or menu board.`,
        flexible: (anchor, itemList) => `${anchor} pairs closely with several items — display ${itemList} nearby so customers can pick one.`,
      },
      cross_promo: {
        single: (anchor, paired) => `Offer a discount when ${anchor} and ${paired} are ordered together.`,
        flexible: (anchor, itemList) => `Offer a 'pick-your-pastry' discount when ${anchor} is ordered with any of: ${itemList}.`,
      },
      bundle: {
        single: (anchor, paired) => `Create a combo meal pairing ${anchor} with ${paired}.`,
        flexible: (anchor, itemList) => `Offer a combo where customers choose one of ${itemList} to pair with ${anchor}.`,
      },
    },
    'Convenience Store': {
      placement: {
        single: (anchor, paired) => `Place ${anchor} and ${paired} on the same aisle or end-cap.`,
        flexible: (anchor, itemList) => `Place ${anchor} near ${itemList} so customers can grab whichever fits.`,
      },
      cross_promo: {
        single: (anchor, paired) => `Run a 'grab both and save' register discount for ${anchor} + ${paired}.`,
        flexible: (anchor, itemList) => `Run a discount when ${anchor} is bought with any of: ${itemList}.`,
      },
      bundle: {
        single: (anchor, paired) => `Bundle ${anchor} and ${paired} into a value pack at checkout.`,
        flexible: (anchor, itemList) => `Offer a mix-and-match value pack: ${anchor} plus a choice of ${itemList}.`,
      },
    },
    'Pet Food': {
      placement: {
        single: (anchor, paired) => `Group ${anchor} and ${paired} into the same store section.`,
        flexible: (anchor, itemList) => `Group ${anchor} with ${itemList} in the same section so customers can compare options.`,
      },
      cross_promo: {
        single: (anchor, paired) => `Offer a loyalty discount when ${anchor} and ${paired} are purchased together.`,
        flexible: (anchor, itemList) => `Offer a loyalty discount when ${anchor} is purchased with any of: ${itemList}.`,
      },
      bundle: {
        single: (anchor, paired) => `Create a starter kit combining ${anchor} and ${paired}.`,
        flexible: (anchor, itemList) => `Offer a starter kit where customers pick one of ${itemList} to go with ${anchor}.`,
      },
    },
  };

  const GENERIC_TEMPLATES = {
    placement: { single: () => 'Consider placing these items near each other.' },
    cross_promo: { single: () => 'Run a cross-promotional discount to encourage joint purchases.' },
    bundle: { single: () => 'Create a bundled offer or end-cap display combining these items.' },
  };

  /**
   * Returns the store-type + tie-mode aware suggested action text.
   * @param {'placement'|'cross_promo'|'bundle'} category
   * @param {string} marketType  - From results.metrics.adaptive_thresholds.market_type
   * @param {string} anchor      - Antecedent item name(s) joined string
   * @param {{ tieMode: string, consequents: string[], tieItems: string[] }} suggestion
   */
  const getSuggestedAction = (category, marketType, anchor, suggestion) => {
    const { tieMode, consequents, tieItems } = suggestion;
    const paired = consequents.join(', ');
    const itemList = tieItems.join(', ');
    const storeTemplates = ACTION_TEMPLATES[marketType];
    if (storeTemplates && storeTemplates[category] && storeTemplates[category][tieMode]) {
      return tieMode === 'flexible'
        ? storeTemplates[category][tieMode](anchor, itemList)
        : storeTemplates[category][tieMode](anchor, paired);
    }
    // Fallback: generic single-mode text
    return GENERIC_TEMPLATES[category]?.single?.(anchor, paired) || 'Consider placing these items near each other.';
  };

  const handleExportCSV = () => {
    if (!results) return;

    let csvContent = "";

    // 1. Session & Parameters Summary
    let actualAlgo = results.metrics?.algorithm || results.algorithm || params.algorithm || 'Auto';
    if (actualAlgo.toLowerCase().includes('apriori')) {
      actualAlgo = 'Apriori';
    } else if (actualAlgo.toLowerCase().includes('fp-growth') || actualAlgo.toLowerCase().includes('fpgrowth')) {
      actualAlgo = 'FP-Growth';
    }

    csvContent += "=== SUMMARY STATISTICS & PARAMETERS ===\n";
    csvContent += `Total Purchases,${stats.total_transactions || 0}\n`;
    csvContent += `Different Items Sold Count,${stats.unique_items_count || 0}\n`;
    csvContent += `Algorithm Used,${actualAlgo}\n`;
    csvContent += `Min How Common This Is Threshold,${params.min_support}\n`;
    csvContent += `Min How Likely Threshold,${params.min_confidence}\n`;
    csvContent += `Min How Strong the Link Is Threshold,${params.min_lift}\n\n`;

    // 2. Frequent Itemsets Section
    csvContent += "=== COMMON ITEM COMBOS ===\n";
    csvContent += "Common Item Combos,Qty,N-Item Size,How Common This Is\n";
    if (results.frequent_itemsets && results.frequent_itemsets.length > 0) {
      results.frequent_itemsets.forEach(set => {
        const itemsStr = `"${set.items.join(', ')}"`;
        const qty = Math.round(set.support * (stats.total_transactions || 0));
        const size = `${set.items.length}-item set`;
        const supportPct = `${(set.support * 100).toFixed(2)}%`;
        csvContent += `${itemsStr},${qty},${size},${supportPct}\n`;
      });
    } else {
      csvContent += "No common item combos found,,,\n";
    }
    csvContent += "\n";

    // 3. Association Rules / Recommendations Section
    csvContent += "=== BUYING PATTERNS (RECOMMENDATIONS) ===\n";
    csvContent += "Frequently Bought Together,Buying Pattern,How Likely,How Strong the Link Is,Suggested Action\n";
    const exportRules = consolidateRules();
    if (exportRules && exportRules.length > 0) {
      exportRules.forEach(suggestion => {
        const allItems = [...suggestion.antecedents, ...suggestion.tieItems];
        const fbt = `"${allItems.join(' + ')}"`;
        const patternStr = suggestion.tieMode === 'flexible'
          ? `"${suggestion.antecedents.join(', ')} -> ${suggestion.tieItems.join(' or ')}"`
          : `"${suggestion.antecedents.join(', ')} -> ${suggestion.consequents.join(', ')}"`;
        const confidencePct = `${(suggestion.confidence * 100).toFixed(1)}%`;
        const liftValue = suggestion.lift.toFixed(2);
        const isHighConfidence = suggestion.confidence >= 0.8;
        const isMediumConfidence = suggestion.confidence >= 0.5 && suggestion.confidence < 0.8;
        const csvMarketType = results?.metrics?.adaptive_thresholds?.market_type || 'Default/unknown';
        const anchor = suggestion.antecedents.join(', ');
        const csvCategory = isHighConfidence ? 'bundle' : isMediumConfidence ? 'cross_promo' : 'placement';
        const note = "";
        csvContent += `${fbt},${patternStr},${confidencePct},${liftValue},"${action}${note}"\n`;
      });
    } else {
      csvContent += "No buying patterns were found,,,,,\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shopping_pattern_complete_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchStats = async (overrideDatasetId = null) => {
    setLoadingStats(true);
    try {
      const targetId = overrideDatasetId || datasetId;
      const url = targetId ? `${API_BASE}/stats?dataset_id=${targetId}` : `${API_BASE}/stats`;
      const response = await axios.get(url);
      setStats(response.data);

      if (response.data && response.data.active && (response.data.is_empty || response.data.total_transactions === 0)) {
        setIsEmptyUpload(true);
      } else if (response.data && response.data.total_transactions > 0) {
        setIsEmptyUpload(false);
        sessionStorage.removeItem('analytics_is_empty_upload');
      } else if (response.data && !response.data.active) {
        setIsEmptyUpload(false);
        sessionStorage.removeItem('analytics_is_empty_upload');
      }

      if (targetId) {
        try {
          const historyRes = await axios.get(`${API_BASE}/datasets`);
          const datasets = historyRes.data.datasets || [];
          if (datasets.length === 0 || !datasets.some(ds => String(ds.id) === String(targetId))) {
            localStorage.removeItem('activeDatasetId');
            localStorage.removeItem('activeDatasetName');
          }
        } catch (e) {
          // ignore background dataset check failure
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      localStorage.removeItem('activeDatasetId');
      localStorage.removeItem('activeDatasetName');
      setIsEmptyUpload(false);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCoBoughtTogether = async (productSelection, overrideDatasetId = null) => {
    const products = Array.isArray(productSelection)
      ? productSelection.filter(Boolean)
      : (productSelection ? [productSelection] : []);

    if (products.length === 0) {
      setCoBoughtResults([]);
      return;
    }
    setLoadingCoBought(true);
    try {
      const targetId = overrideDatasetId || datasetId;
      const params = new URLSearchParams();
      products.forEach(p => params.append('product', p));
      if (targetId) {
        params.append('dataset_id', targetId);
      }
      const response = await axios.get(`${API_BASE}/frequently_bought_together?${params.toString()}`);
      if (response.data && Array.isArray(response.data.frequently_bought_together)) {
        setCoBoughtResults(response.data.frequently_bought_together);
      } else {
        setCoBoughtResults([]);
      }
    } catch (err) {
      console.error('Error fetching co-bought items:', err);
      setCoBoughtResults([]);
    } finally {
      setLoadingCoBought(false);
    }
  };

  const handleToggleCartProduct = (productName) => {
    if (!productName) return;
    setSelectedCartProducts(prev => {
      const exists = prev.some(p => p.toLowerCase() === productName.toLowerCase());
      const next = exists
        ? prev.filter(p => p.toLowerCase() !== productName.toLowerCase())
        : [...prev, productName];
      fetchCoBoughtTogether(next);
      return next;
    });
  };

  const handleRemoveCartProduct = (productName) => {
    setSelectedCartProducts(prev => {
      const next = prev.filter(p => p.toLowerCase() !== productName.toLowerCase());
      fetchCoBoughtTogether(next);
      return next;
    });
  };

  const handleClearCartProducts = () => {
    setSelectedCartProducts([]);
    setCoBoughtResults([]);
  };

  // Backward compatibility alias
  const handleSelectProduct = (productName) => {
    handleToggleCartProduct(productName);
  };

  useEffect(() => {
    fetchStats();
    if (selectedCartProducts.length > 0) {
      fetchCoBoughtTogether(selectedCartProducts, datasetId);
    }
  }, [datasetId]);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null && s !== undefined) {
      setRecommendationSearchTerm(s);
    }
    const p = searchParams.get('product');
    if (p) {
      setSelectedCartProducts([p]);
      fetchCoBoughtTogether([p], datasetId);
    }
  }, [searchParams, datasetId]);

  // Auto-run mining whenever a dataset is active but results are missing or out of sync
  useEffect(() => {
    const currentDsId = datasetId || localStorage.getItem('activeDatasetId');
    if (currentDsId) {
      setForceSetupView(false);
      const dsName = localStorage.getItem('activeDatasetName') || sessionStorage.getItem('analytics_file_name');
      if (dsName) {
        setFile({ name: dsName });
        setUploadStatus('success');
      }
      const hasMinedForThisDataset = results && String(results.dataset_id) === String(currentDsId);
      if (!hasMinedForThisDataset && miningStatus !== 'mining') {
        runMining({ dataset_id: currentDsId });
      }
    }
  }, [datasetId, results?.dataset_id]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';

    setFile(selectedFile);
    setUploadStatus('uploading');
    setUploadError(null);
    setDuplicateNotice(null);
    sessionStorage.setItem('analytics_file_name', selectedFile.name);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      if (response.data.dataset_id) {
        localStorage.setItem('activeDatasetId', response.data.dataset_id);
        localStorage.setItem('activeDatasetName', selectedFile.name);
      }
      if (response.data.duplicate_detected) {
        setDuplicateNotice(response.data.message);
      } else {
        setDuplicateNotice(null);
      }
      if (response.data.is_empty || response.data.transaction_count === 0) {
        setIsEmptyUpload(true);
        sessionStorage.setItem('analytics_is_empty_upload', 'true');
      } else {
        setIsEmptyUpload(false);
        sessionStorage.removeItem('analytics_is_empty_upload');
      }
      if (response.data.cleaning_stats) {
        setCleaningStats(response.data.cleaning_stats);
        sessionStorage.setItem('analytics_cleaning_stats', JSON.stringify(response.data.cleaning_stats));
      } else {
        setCleaningStats(null);
        sessionStorage.removeItem('analytics_cleaning_stats');
      }
      await fetchStats(response.data.dataset_id);
      setUploadStatus('success');
      setForceSetupView(false);
      if (!response.data.is_empty && response.data.transaction_count > 0) {
        await runMining({ dataset_id: response.data.dataset_id });
      }
    } catch (err) {
      setUploadStatus('error');
      const errDetail = err.response?.data?.error || 'Failed to upload file. Please check file format and try again.';
      setUploadError(errDetail);
      sessionStorage.removeItem('analytics_file_name');
      sessionStorage.removeItem('analytics_cleaning_stats');
      sessionStorage.removeItem('analytics_is_empty_upload');
      setIsEmptyUpload(false);
      console.error(err);
    }
  };




  const handleClearSession = async () => {
    try {
      await axios.post(`${API_BASE}/clear`);
      setFile(null);
      setUploadStatus('idle');
      setUploadError(null);
      setDuplicateNotice(null);
      setIsEmptyUpload(false);
      setResults(null);
      setMiningStatus('idle');
      setCleaningStats(null);
      setSelectedCategory('All');
      setSelectedCartProducts([]);
      setCoBoughtResults([]);
      setForceSetupView(false);
      sessionStorage.removeItem('analytics_file_name');
      sessionStorage.removeItem('analytics_cleaning_stats');
      sessionStorage.removeItem('analytics_results');
      sessionStorage.removeItem('analytics_is_empty_upload');
      localStorage.removeItem('activeDatasetId');
      localStorage.removeItem('activeDatasetName');
      setSearchParams({}, { replace: true });
      setStats({
        active: false,
        total_transactions: 0,
        unique_items_count: 0,
        top_items: [],
        all_items: [],
        recommended_algorithm: 'None'
      });
    } catch (err) {
      console.error('Error clearing session:', err);
    }
  };

  const runMining = async (overrideParams = null) => {
    setMiningStatus('mining');
    try {
      const activeParams = { ...params, ...(overrideParams || {}) };
      const targetDatasetId = activeParams.dataset_id || datasetId || localStorage.getItem('activeDatasetId');
      const payload = {
        ...activeParams,
        min_support: parseFloat(activeParams.min_support) || 0.05,
        min_confidence: parseFloat(activeParams.min_confidence) || 0.5,
        min_lift: parseFloat(activeParams.min_lift) || 1.0,
        dataset_id: targetDatasetId
      };
      const response = await axios.post(`${API_BASE}/mine`, payload);
      const minedData = {
        ...response.data,
        dataset_id: response.data.dataset_id || targetDatasetId
      };
      setResults(minedData);
      sessionStorage.setItem('analytics_results', JSON.stringify(minedData));
      if (targetDatasetId) {
        localStorage.setItem('activeDatasetId', String(targetDatasetId));
        const dsName = localStorage.getItem('activeDatasetName') || (file && file.name) || response.data.dataset_name || `Dataset #${targetDatasetId}`;
        localStorage.setItem('activeDatasetName', dsName);
        sessionStorage.setItem('analytics_file_name', dsName);
        setFile({ name: dsName });
        setUploadStatus('success');
      }
      setMiningStatus('success');
      setForceSetupView(false);
    } catch (err) {
      setMiningStatus('error');
      console.error('Error running mining:', err);
    }
  };

  // Step 1a: De-mirror — for each {A,B} pair keep only the higher-confidence direction
  const getFilteredRules = () => {
    if (!results || !results.rules) return [];
    const seen = new Map();
    results.rules.forEach(rule => {
      const key = [...rule.antecedents, ...rule.consequents].sort().join(',');
      const existing = seen.get(key);
      if (!existing || rule.confidence > existing.confidence) {
        seen.set(key, rule);
      }
    });
    return Array.from(seen.values());
  };

  /**
   * Step 1b-d: Consolidate rules by anchor item.
   * Groups de-mirrored rules by antecedent, ranks within each group, and determines
   * tieMode ('single' | 'flexible') based on the confidence gap between the top two.
   * Returns a flat array of suggestion objects ready for rendering.
   */
  const consolidateRules = () => {
    const deMirrored = getFilteredRules();
    if (!deMirrored.length) return [];
    const marketType = results?.metrics?.adaptive_thresholds?.market_type || 'Default/unknown';

    // Group by anchor string
    const anchorGroups = {};
    deMirrored.forEach(rule => {
      const anchorKey = rule.antecedents.join(', ');
      if (!anchorGroups[anchorKey]) anchorGroups[anchorKey] = [];
      anchorGroups[anchorKey].push(rule);
    });

    const consolidated = [];
    Object.entries(anchorGroups).forEach(([, rules]) => {
      // Rank by confidence DESC, lift as tiebreaker
      rules.sort((a, b) => b.confidence - a.confidence || b.lift - a.lift);

      const top = rules[0];
      let tieMode = 'single';
      let tieItems = [top.consequents.join(', ')];
      let allTiedRules = [top];

      if (rules.length >= 2) {
        const gap = top.confidence - rules[1].confidence;
        if (gap <= CONSOLIDATION_GAP_THRESHOLD) {
          tieMode = 'flexible';
          allTiedRules = [rules[0], rules[1]];
          tieItems = [rules[0].consequents.join(', '), rules[1].consequents.join(', ')];
          // Include rank-3 only if it clears the notable floor
          if (rules.length >= 3 && rules[2].confidence >= CONSOLIDATION_NOTABLE_FLOOR) {
            allTiedRules.push(rules[2]);
            tieItems.push(rules[2].consequents.join(', '));
          }
        }
      }

      consolidated.push({
        antecedents: top.antecedents,
        consequents: top.consequents,
        tieItems,
        confidence: top.confidence,
        lift: top.lift,
        support: top.support,
        tieMode,
        allTiedRules,
        // ── Enrichment fields from backend (passed through from top rule) ──
        ant_tx_count: top.ant_tx_count,
        rule_tx_count: top.rule_tx_count,
        consequent_baseline_rate: top.consequent_baseline_rate,
        avg_rule_basket: top.avg_rule_basket,
        monthly_estimate: top.monthly_estimate,
        has_revenue_data: top.has_revenue_data,
      });
    });

    // Final sort: highest confidence first, then lift as tiebreaker
    consolidated.sort((a, b) => b.confidence - a.confidence || b.lift - a.lift);
    return consolidated;
  };

  // Raw recommendations (never mutated)
  const consolidatedRules = consolidateRules();

  // Scoped Category Filter: Recommendations — 'If They Buy…' — filter according to the category of the product(s) in the 'If They Buy…' side
  const categoryFilteredRules = React.useMemo(() => {
    if (
      !selectedCategories ||
      selectedCategories.includes('All') ||
      selectedCategories.length === categoryOptions.length
    ) {
      return consolidatedRules;
    }
    if (selectedCategories.length === 0) {
      return [];
    }
    const catSet = new Set(selectedCategories.map(c => c.toLowerCase()));
    return consolidatedRules.filter(rule => {
      return (rule.antecedents || []).some(ant => {
        const antCat = productCategoriesMap[ant.toLowerCase()] || '';
        return catSet.has(antCat.toLowerCase());
      });
    });
  }, [consolidatedRules, selectedCategories, categoryOptions.length, productCategoriesMap]);

  const filteredConsolidatedRules = categoryFilteredRules.filter(rule => {
    if (!recommendationSearchTerm.trim()) return true;
    const term = recommendationSearchTerm.trim().toLowerCase();
    const antMatch = (rule.antecedents || []).some(a => a.toLowerCase().includes(term));
    const consMatch = (rule.consequents || []).some(c => c.toLowerCase().includes(term));
    const tieMatch = (rule.tieItems || []).some(t => t.toLowerCase().includes(term));
    return antMatch || consMatch || tieMatch;
  });

  // Raw combos (never mutated)
  const getGroupedItemsets = () => {
    if (!results || !results.frequent_itemsets) return [];

    const groups = {};
    results.frequent_itemsets.forEach(set => {
      const size = set.items.length;
      if (!groups[size]) {
        groups[size] = [];
      }
      groups[size].push(set);
    });

    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(size => {
        const sortedItems = [...groups[size]].sort((a, b) => b.support - a.support);
        return {
          size,
          label: size === 1 ? 'Single Products (1-Item Sets)' :
            size === 2 ? 'Product Pairs (2-Item Sets)' :
              size === 3 ? 'Product Trios (3-Item Sets)' :
                `Product Groups of ${size} (${size}-Item Sets)`,
          items: sortedItems
        };
      })
      .filter(group => group.items.length > 0);
  };

  const groupedSets = getGroupedItemsets();

  // Scoped Category Filter: Common Item Combos — First Product — filter according to the category of the first/primary product
  // (Do not force second, third, or later products into that category)
  const categoryFilteredGroupedSets = React.useMemo(() => {
    if (
      !selectedCategories ||
      selectedCategories.includes('All') ||
      selectedCategories.length === categoryOptions.length
    ) {
      return groupedSets;
    }
    if (selectedCategories.length === 0) {
      return [];
    }
    const catSet = new Set(selectedCategories.map(c => c.toLowerCase()));
    return groupedSets.map(group => {
      const matchingItems = group.items.filter(item => {
        const firstItem = item.items && item.items[0];
        if (!firstItem) return false;
        const firstCat = productCategoriesMap[firstItem.toLowerCase()] || '';
        return catSet.has(firstCat.toLowerCase());
      });
      return { ...group, items: matchingItems };
    }).filter(group => group.items.length > 0);
  }, [groupedSets, selectedCategories, categoryOptions.length, productCategoriesMap]);

  const filteredGroupedSets = categoryFilteredGroupedSets.map(group => {
    if (!recommendationSearchTerm.trim()) return group;
    const term = recommendationSearchTerm.trim().toLowerCase();
    const matchingItems = group.items.filter(item =>
      (item.items || []).some(it => it.toLowerCase().includes(term))
    );
    return { ...group, items: matchingItems };
  }).filter(group => group.items.length > 0);

  const hasActiveSource = Boolean((file || datasetId) && (stats.active || stats.total_transactions > 0 || uploadStatus === 'uploading'));

  if (miningStatus === 'mining') {
    return (
      <div className="cobuy-analytics-container fade-in">
        <div className="cobuy-analytics-loading-card">
          <div className="cobuy-analytics-loading-icon">
            <Loader2 size={42} className="spin" style={{ color: '#4f46e5' }} />
          </div>
          <h2 className="cobuy-analytics-loading-title">
            Analyzing {activeDatasetName || file?.name || (datasetId ? `Dataset #${datasetId}` : 'Sales Data')}...
          </h2>
          <p className="cobuy-analytics-loading-subtitle">
            Running association rule mining, extracting frequent product combos, and calculating metrics.
          </p>
          <div className="cobuy-analytics-loading-bar">
            <div className="cobuy-analytics-loading-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasResults || forceSetupView) {
    return (
      <div className="cobuy-analytics-container fade-in">
        {hasResults && forceSetupView && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
            <button
              type="button"
              className="cobuy-new-analysis-btn"
              onClick={() => setForceSetupView(false)}
            >
              ← Back to Results
            </button>
          </div>
        )}
        <AnalyticsSetupState
          file={file}
          uploadStatus={uploadStatus}
          uploadError={uploadError}
          stats={stats}
          onFileUpload={handleFileUpload}
          onClearFile={() => {
            setFile(null);
            setUploadStatus('idle');
            setUploadError(null);
            sessionStorage.removeItem('analytics_file_name');
          }}
          isAnalyzing={miningStatus === 'mining'}
          onRunAnalysis={() => runMining()}
          onOpenParamsModal={() => setShowParamsModal(true)}
          onOpenSampleModal={() => setShowSampleModal(true)}
        />
        <SampleFileModal
          isOpen={showSampleModal}
          onClose={() => setShowSampleModal(false)}
        />
        <MiningParametersModal
          isOpen={showParamsModal}
          onClose={() => setShowParamsModal(false)}
          params={params}
          onSaveAndRun={(newParams) => {
            setParams(newParams);
            sessionStorage.setItem('analytics_params', JSON.stringify(newParams));
            runMining(newParams);
          }}
        />
      </div>
    );
  }

  return (
    <div className="cobuy-analytics-container fade-in">
      {/* ── 1. Top-Level Results Header (Matches Reference Screen A) ── */}
      <div className="cobuy-results-hero">
        <div className="cobuy-results-hero-left">
          <div className="cobuy-results-hero-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="cobuy-results-hero-title">
              Good to see you, {userName}
            </h1>
            <p className="cobuy-results-hero-subtitle">
              Here is a quick overview of your sales insights and product performance.
            </p>
          </div>
        </div>

        <div className="cobuy-results-hero-right">
          <div className="cobuy-dataset-pill" title="Active dataset producing these insights">
            <Calendar size={14} style={{ color: 'var(--primary-color)' }} />
            <span>{activeDatasetName || file?.name || (datasetId ? `Dataset #${datasetId}` : 'Store Sales Data')}</span>
          </div>

          <button
            type="button"
            className="cobuy-new-analysis-btn"
            onClick={() => setForceSetupView(true)}
            title="Upload or analyze another dataset"
          >
            <RotateCcw size={13} />
            <span>New Analysis</span>
          </button>

          <button
            type="button"
            className="cobuy-new-analysis-btn"
            onClick={() => setShowParamsModal(true)}
            title="Adjust algorithm thresholds"
            style={{ background: 'var(--inner-box-bg)', color: 'var(--text-muted)' }}
          >
            <Sliders size={13} />
            <span>Parameters</span>
          </button>
        </div>
      </div>

      {/* System Warning / Alert Banners */}
      {duplicateNotice && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
          <div><strong>Notice:</strong> {duplicateNotice}</div>
        </div>
      )}

      {hasActiveSource && isEmptyUpload && stats.total_transactions === 0 && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
          <div><strong>Warning:</strong> Uploaded file contains 0 valid transactions.</div>
        </div>
      )}

      {/* ── Category Filter Bar (Popout Panel UI) ──────────────────── */}
      {categoryOptions.length > 0 && (
        <CategoryFilterBar
          categoryOptions={categoryOptions}
          selectedCategories={selectedCategories}
          onChangeSelectedCategories={setSelectedCategories}
          productCategoriesMap={productCategoriesMap}
          stats={stats}
          totalProductsCount={stats?.unique_items_count || stats?.all_items?.length || 0}
        />
      )}

      {/* ── 2. Middle Section: 3-Column Grid ── */}
      <ItemFrequencies
        stats={stats}
        results={results}
        selectedCategories={selectedCategories}
        selectedCategory={selectedCategories[0] || 'All'}
        selectedProducts={selectedCartProducts}
        onToggleProduct={handleToggleCartProduct}
        onRemoveProduct={handleRemoveCartProduct}
        onClearProducts={handleClearCartProducts}
        coBoughtResults={coBoughtResults}
        loadingCoBought={loadingCoBought}
      />

      {/* ── 3. Bottom Section: Full-Width Recommendations Table ── */}
      <RecommendationsView
        results={results}
        rules={filteredConsolidatedRules}
        groupedSets={filteredGroupedSets}
        activeSubTab={activeSubTab}
        onSubTabChange={(tab) => setActiveSubTab(tab)}
        recommendationSearchTerm={recommendationSearchTerm}
        onSearchChange={(term) => setRecommendationSearchTerm(term)}
        marketType={results?.metrics?.adaptive_thresholds?.market_type || 'Default/unknown'}
        getSuggestedAction={getSuggestedAction}
        stats={stats}
        onExportCSV={handleExportCSV}
        onShowCalculations={() => setShowMiningModal(true)}
        onOpenParamsModal={() => setShowParamsModal(true)}
        miningStatus={miningStatus}
      />

      {/* ── 4. Mining Parameters Modal ── */}
      <MiningParametersModal
        isOpen={showParamsModal}
        onClose={() => setShowParamsModal(false)}
        params={params}
        onSaveAndRun={(newParams) => {
          setParams(newParams);
          sessionStorage.setItem('analytics_params', JSON.stringify(newParams));
          runMining(newParams);
        }}
      />

      {/* ── 5. Mining Engine Computation Modal ── */}
      <MiningEngineModal
        isOpen={showMiningModal}
        onClose={() => setShowMiningModal(false)}
        stats={stats}
        results={results}
        consolidatedRules={consolidatedRules}
        activeDatasetName={activeDatasetName}
        fileName={file?.name}
      />


    </div>
  );
};

export default Analytics;
