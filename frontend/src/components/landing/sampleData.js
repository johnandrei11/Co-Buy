/**
 * Illustrative sample data for the PUBLIC marketing page only.
 *
 * These numbers are NOT computed from any user's dataset and are NOT research
 * findings. They describe a small, internally-consistent toy café dataset so
 * that Support / Confidence / Lift values shown on the landing page are
 * mathematically coherent:
 *
 *   support(A→B)    = P(A ∧ B)
 *   confidence(A→B) = P(A ∧ B) / P(A)
 *   lift(A→B)       = confidence(A→B) / P(B)
 */
import { Coffee, Cookie, Croissant, Wheat, Milk, Leaf, Package, Droplet } from 'lucide-react';

export const SAMPLE_ITEMS = {
  coffee: { label: 'Coffee', support: 0.4, icon: Coffee, color: '#7c5cff', bg: '#f1edff' },
  cookies: { label: 'Cookies', support: 0.25, icon: Cookie, color: '#f59e0b', bg: '#fff6e5' },
  pastries: { label: 'Pastries', support: 0.22, icon: Croissant, color: '#ec4899', bg: '#fdeef6' },
  tea: { label: 'Tea', support: 0.14, icon: Leaf, color: '#10b981', bg: '#e9fbf3' },
  bread: { label: 'Bread', support: 0.3, icon: Wheat, color: '#d97706', bg: '#fdf3e2' },
  butter: { label: 'Butter', support: 0.15, icon: Droplet, color: '#eab308', bg: '#fefae4' },
  milk: { label: 'Milk', support: 0.28, icon: Milk, color: '#0ea5e9', bg: '#e8f6fe' },
  cereal: { label: 'Cereal', support: 0.12, icon: Package, color: '#5b5ef4', bg: '#eef0ff' },
};

const rule = (id, from, to, both) => {
  const confidence = both / SAMPLE_ITEMS[from].support;
  const lift = confidence / SAMPLE_ITEMS[to].support;
  return { id, from, to, support: both, confidence, lift };
};

export const SAMPLE_RULES = [
  rule('coffee-cookies', 'coffee', 'cookies', 0.18),
  rule('coffee-pastries', 'coffee', 'pastries', 0.15),
  rule('bread-butter', 'bread', 'butter', 0.1),
  rule('milk-cereal', 'milk', 'cereal', 0.07),
  rule('tea-cookies', 'tea', 'cookies', 0.05),
];

export const fmtPct = (v) => `${Math.round(v * 100)}%`;
export const fmtLift = (v) => v.toFixed(2);

export const getRule = (id) => SAMPLE_RULES.find((r) => r.id === id);
