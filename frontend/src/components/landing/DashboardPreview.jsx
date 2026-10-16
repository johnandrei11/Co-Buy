import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, History, Settings, Lock, Receipt, Boxes, GitBranch,
  ArrowRight, Check, Info, Sparkles
} from 'lucide-react';
import { SAMPLE_ITEMS, SAMPLE_RULES, fmtPct, fmtLift, getRule } from './sampleData';

/* Top items by share of transactions (derived from the same toy dataset). */
const TOP_ITEMS = ['coffee', 'bread', 'milk', 'cookies', 'pastries'];

const ALGORITHMS = {
  apriori: {
    label: 'Apriori',
    points: [
      'Builds candidate itemsets level by level',
      'Scans the dataset once per level',
      'Straightforward and easy to explain',
    ],
  },
  fpgrowth: {
    label: 'FP-Growth',
    points: [
      'Compresses transactions into an FP-tree',
      'Typically needs only two dataset scans',
      'Skips explicit candidate generation',
    ],
  },
};

/** Compact, static association graph for the hero window. */
const MiniGraph = () => {
  const nodes = [
    { k: 'coffee', x: 92, y: 66, r: 19 },
    { k: 'cookies', x: 172, y: 30, r: 14 },
    { k: 'pastries', x: 176, y: 104, r: 13 },
    { k: 'tea', x: 30, y: 30, r: 11 },
    { k: 'milk', x: 26, y: 104, r: 12 },
  ];
  const pos = Object.fromEntries(nodes.map((n) => [n.k, n]));
  const edges = [
    ['coffee', 'cookies', true],
    ['coffee', 'pastries', true],
    ['tea', 'cookies', false],
    ['coffee', 'tea', false],
    ['coffee', 'milk', false],
  ];
  return (
    <svg viewBox="0 0 206 134" role="img" aria-label="Illustrative product association graph centred on Coffee">
      {edges.map(([a, b, strong]) => (
        <line
          key={`${a}-${b}`}
          x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
          stroke={strong ? '#4f46e5' : '#cbd5e1'}
          strokeWidth={strong ? 2.6 : 1.4}
          strokeDasharray={strong ? '0' : '3 3'}
          strokeLinecap="round"
        />
      ))}
      {nodes.map((n) => {
        const item = SAMPLE_ITEMS[n.k];
        const Icon = item.icon;
        return (
          <g key={n.k}>
            {n.k === 'coffee' && (
              <circle cx={n.x} cy={n.y} r={n.r + 7} fill={item.color} opacity="0.12">
                <animate attributeName="r" values={`${n.r + 4};${n.r + 10};${n.r + 4}`} dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={n.r} fill={item.bg} stroke={item.color} strokeWidth="1.5" />
            <Icon x={n.x - n.r * 0.45} y={n.y - n.r * 0.45} width={n.r * 0.9} height={n.r * 0.9} color={item.color} strokeWidth={2.2} />
          </g>
        );
      })}
    </svg>
  );
};

const RecRow = ({ ruleId, title }) => {
  const r = getRule(ruleId);
  const A = SAMPLE_ITEMS[r.from];
  const B = SAMPLE_ITEMS[r.to];
  return (
    <div className="dp-rec">
      <div className="dp-rec__icons" aria-hidden="true">
        <span style={{ background: A.bg, color: A.color }}><A.icon size={13} /></span>
        <span style={{ background: B.bg, color: B.color }}><B.icon size={13} /></span>
      </div>
      <div className="dp-rec__text">
        <b>{title}</b>
        <small>{A.label} → {B.label}</small>
      </div>
      <span className="dp-rec__lift">×{fmtLift(r.lift)}</span>
    </div>
  );
};

const DashboardPreview = () => {
  const [algo, setAlgo] = useState('fpgrowth');
  const focus = SAMPLE_RULES[0]; // Coffee → Cookies

  return (
    <div className="dp">
      <div className="dp-studio-bloom" aria-hidden="true" />
      <figure className="dp-window" aria-label="Illustrative preview of the CoBuy analytics dashboard using sample data">
        <div className="dp-bar">
          <div className="dp-dots" aria-hidden="true"><i /><i /><i /></div>
          <div className="dp-url"><Lock size={10} /> cobuy · analytics</div>
          <span className="lp-sample-tag">Sample data</span>
        </div>

        <div className="dp-body">
          <aside className="dp-side" aria-hidden="true">
            <div className="dp-side__logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(165,160,255,0.3)" stroke="#a5a0ff" />
                <polyline points="2 12 12 17 22 12" stroke="#a5a0ff" />
                <polyline points="2 17 12 22 22 17" stroke="#a5a0ff" />
              </svg>
            </div>
            <span className="dp-side__item"><LayoutDashboard size={16} /></span>
            <span className="dp-side__item is-active"><BarChart3 size={16} /></span>
            <span className="dp-side__item"><History size={16} /></span>
            <span className="dp-side__item"><Settings size={16} /></span>
          </aside>

          <div className="dp-main">
            <div className="dp-head">
              <div>
                <small>Example café dataset</small>
                <h3>Transaction Overview</h3>
              </div>
            </div>

            <div className="dp-kpis">
              <div className="dp-kpi">
                <span><Receipt size={11} /> Transactions</span>
                <strong>2,450</strong>
              </div>
              <div className="dp-kpi">
                <span><Boxes size={11} /> Unique items</span>
                <strong>38</strong>
              </div>
              <div className="dp-kpi">
                <span><GitBranch size={11} /> Rules found</span>
                <strong>64</strong>
              </div>
            </div>

            <div className="dp-row">
              <div className="dp-card">
                <div className="dp-card__title">Top items <small>% of baskets</small></div>
                <div className="dp-bars">
                  {TOP_ITEMS.map((k) => (
                    <div className="dp-bars__row" key={k}>
                      <span>{SAMPLE_ITEMS[k].label}</span>
                      <div className="dp-bars__track">
                        <div className="dp-bars__fill" style={{ width: `${(SAMPLE_ITEMS[k].support / 0.4) * 100}%` }} />
                      </div>
                      <b>{fmtPct(SAMPLE_ITEMS[k].support)}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dp-card dp-graph">
                <div className="dp-card__title">Product associations <small>by lift</small></div>
                <MiniGraph />
              </div>
            </div>

            <div className="dp-metrics">
              <div className="dp-metric" style={{ '--_c': '#5b5ef4' }}>
                <span>Support</span>
                <strong>{fmtPct(focus.support)}</strong>
                <div className="dp-metric__bar"><i style={{ width: `${focus.support * 100 * 2.5}%` }} /></div>
              </div>
              <div className="dp-metric" style={{ '--_c': '#7c5cff' }}>
                <span>Confidence</span>
                <strong>{fmtPct(focus.confidence)}</strong>
                <div className="dp-metric__bar"><i style={{ width: `${focus.confidence * 100}%` }} /></div>
              </div>
              <div className="dp-metric" style={{ '--_c': '#10b981' }}>
                <span>Lift</span>
                <strong>{fmtLift(focus.lift)}</strong>
                <div className="dp-metric__bar"><i style={{ width: `${(focus.lift / 2.5) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
      </figure>

      {/* Floating: recommendation cards */}
      <motion.div
        className="dp-float dp-float--recs"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="dp-float__head">
          <strong><Sparkles size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Suggested actions</strong>
          <span className="lp-sample-tag">Example</span>
        </div>
        <RecRow ruleId="coffee-cookies" title="Bundle as a combo" />
        <RecRow ruleId="bread-butter" title="Place side by side" />
      </motion.div>

      {/* Floating: Apriori vs FP-Growth */}
      <motion.div
        className="dp-float dp-float--algo"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="dp-float__head">
          <strong>Mining algorithm</strong>
        </div>
        <div className="dp-algo__toggle" role="group" aria-label="Compare mining algorithms">
          {Object.entries(ALGORITHMS).map(([key, a]) => (
            <button key={key} type="button" aria-pressed={algo === key} onClick={() => setAlgo(key)}>
              {a.label}
            </button>
          ))}
        </div>
        <ul className="dp-algo__list">
          {ALGORITHMS[algo].points.map((p) => (
            <li key={p}><Check size={11} /> {p}</li>
          ))}
        </ul>
        <div className="dp-algo__foot">Same thresholds → same frequent itemsets.</div>
      </motion.div>

      <p className="dp-caption">
        <Info size={13} /> Illustrative interface preview with sample data — not real results.
      </p>
    </div>
  );
};

export default DashboardPreview;
