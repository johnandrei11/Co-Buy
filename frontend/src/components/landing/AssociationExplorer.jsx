import React, { useMemo, useState } from 'react';
import { ArrowRight, Network, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { SAMPLE_ITEMS, SAMPLE_RULES, fmtPct, fmtLift, getRule } from './sampleData';

/* Node layout for the illustrative graph (viewBox 520 × 430). */
const NODE_POS = {
  tea: { x: 260, y: 52 },
  cookies: { x: 430, y: 118 },
  coffee: { x: 262, y: 205 },
  pastries: { x: 436, y: 300 },
  bread: { x: 82, y: 96 },
  butter: { x: 92, y: 270 },
  milk: { x: 232, y: 358 },
  cereal: { x: 392, y: 392 },
};
const radiusFor = (k) => 14 + SAMPLE_ITEMS[k].support * 60;

const METRICS = [
  {
    key: 'support',
    name: 'Support',
    color: '#5b5ef4',
    format: fmtPct,
    width: (r) => Math.min(100, r.support * 100 * 2.5),
    explain: (r, A, B) => `${A} and ${B} appear together in ${fmtPct(r.support)} of all transactions.`,
  },
  {
    key: 'confidence',
    name: 'Confidence',
    color: '#7c5cff',
    format: fmtPct,
    width: (r) => r.confidence * 100,
    explain: (r, A, B) => `When ${A} is purchased, ${B} is also purchased ${fmtPct(r.confidence)} of the time.`,
  },
  {
    key: 'lift',
    name: 'Lift',
    color: '#10b981',
    format: fmtLift,
    width: (r) => Math.min(100, (r.lift / 2.5) * 100),
    explain: (r, A, B) =>
      `${B} is ${fmtLift(r.lift)}× more likely to be bought with ${A} than on its own. Values above 1 suggest a positive relationship.`,
  },
];

/** Shortened line between two circles so arrowheads sit on the node edge. */
const edgePath = (a, b, ra, rb) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * (ra + 2),
    y1: a.y + uy * (ra + 2),
    x2: b.x - ux * (rb + 8),
    y2: b.y - uy * (rb + 8),
  };
};

const AssociationExplorer = () => {
  const [selectedId, setSelectedId] = useState(SAMPLE_RULES[0].id);
  const selected = getRule(selectedId);
  const A = SAMPLE_ITEMS[selected.from];
  const B = SAMPLE_ITEMS[selected.to];

  const chartData = useMemo(
    () =>
      SAMPLE_RULES.map((r) => ({
        id: r.id,
        name: `${SAMPLE_ITEMS[r.from].label} → ${SAMPLE_ITEMS[r.to].label}`,
        lift: Number(r.lift.toFixed(2)),
      })),
    []
  );

  const selectByNode = (k) => {
    const match = SAMPLE_RULES.find((r) => r.from === k) || SAMPLE_RULES.find((r) => r.to === k);
    if (match) setSelectedId(match.id);
  };

  const activeNodes = new Set([selected.from, selected.to]);

  return (
    <div className="lp-analytics__shell">
      <div className="lp-analytics__top">
        <h3><Network size={18} /> Association Explorer</h3>
        <span className="lp-sample-tag">Illustrative example · not your data</span>
      </div>

      <div className="lp-analytics__body">
        {/* Rule list */}
        <div className="lp-rules" role="group" aria-label="Example association rules">
          <p className="lp-rules__label">Example rules</p>
          {SAMPLE_RULES.map((r) => {
            const from = SAMPLE_ITEMS[r.from];
            const to = SAMPLE_ITEMS[r.to];
            return (
              <button
                key={r.id}
                type="button"
                id={`rule-${r.id}`}
                className="lp-rule"
                aria-pressed={selectedId === r.id}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="lp-rule__items">
                  {from.label} <ArrowRight size={14} aria-hidden="true" /> {to.label}
                </span>
                <span className="lp-rule__lift">lift {fmtLift(r.lift)}</span>
              </button>
            );
          })}
        </div>

        {/* Graph */}
        <div className="lp-graph">
          <svg viewBox="0 0 520 430" role="img" aria-label={`Illustrative product relationship graph. Highlighted: ${A.label} to ${B.label}.`}>
            <defs>
              <marker id="lpArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#4f46e5" />
              </marker>
              <marker id="lpArrowMuted" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#cbd5e1" />
              </marker>
              <style>{`@keyframes lpFlow { to { stroke-dashoffset: -24; } } .lp-flow { animation: lpFlow 1s linear infinite; }`}</style>
            </defs>

            {SAMPLE_RULES.map((r) => {
              const a = NODE_POS[r.from];
              const b = NODE_POS[r.to];
              const p = edgePath(a, b, radiusFor(r.from), radiusFor(r.to));
              const active = r.id === selectedId;
              return (
                <g key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(r.id)}>
                  {/* wide invisible hit area */}
                  <line {...p} stroke="transparent" strokeWidth="18" />
                  <line
                    {...p}
                    className="lp-graph__edge"
                    stroke={active ? '#4f46e5' : '#cbd5e1'}
                    strokeWidth={active ? 1.5 + r.lift * 1.6 : 1 + r.lift * 0.8}
                    strokeLinecap="round"
                    markerEnd={active ? 'url(#lpArrow)' : 'url(#lpArrowMuted)'}
                  />
                  {active && (
                    <line {...p} className="lp-flow" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.6" strokeDasharray="4 8" strokeLinecap="round" />
                  )}
                </g>
              );
            })}

            {Object.entries(NODE_POS).map(([k, pos]) => {
              const item = SAMPLE_ITEMS[k];
              const r = radiusFor(k);
              const active = activeNodes.has(k);
              const Icon = item.icon;
              return (
                <g
                  key={k}
                  className="lp-graph__node"
                  onClick={() => selectByNode(k)}
                  opacity={active ? 1 : 0.72}
                >
                  {active && <circle cx={pos.x} cy={pos.y} r={r + 9} fill={item.color} opacity="0.14" />}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={active ? item.color : '#ffffff'}
                    stroke={item.color}
                    strokeWidth={active ? 0 : 2}
                  />
                  <Icon
                    x={pos.x - r * 0.42}
                    y={pos.y - r * 0.42}
                    width={r * 0.84}
                    height={r * 0.84}
                    color={active ? '#ffffff' : item.color}
                    strokeWidth={2}
                  />
                  <text x={pos.x} y={pos.y + r + 16} textAnchor="middle" fontSize="13" fill="#0f172a">
                    {item.label}
                  </text>
                  <text x={pos.x} y={pos.y + r + 30} textAnchor="middle" fontSize="10.5" fill="#9aa3bb" fontWeight="600">
                    {fmtPct(item.support)} of baskets
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="lp-graph__legend" aria-hidden="true">
            <span><i style={{ background: '#4f46e5' }} /> Selected rule</span>
            <span><i style={{ background: '#cbd5e1' }} /> Other rules (thicker = higher lift)</span>
            <span>Node size = item frequency</span>
          </div>
        </div>

        {/* Insight panel */}
        <div className="lp-insight" aria-live="polite">
          <div className="lp-insight__rule">
            <small>Selected rule</small>
            <p>{A.label} <ArrowRight size={16} aria-hidden="true" /> {B.label}</p>
            <span className="lp-insight__read">
              Customers who buy {A.label.toLowerCase()} often add {B.label.toLowerCase()} — a candidate for bundling or nearby placement.
            </span>
          </div>
          {METRICS.map((m) => (
            <div className="lp-metric" key={m.key} style={{ '--_c': m.color }}>
              <div className="lp-metric__top">
                <span className="lp-metric__name"><i /> {m.name}</span>
                <span className="lp-metric__value">{m.format(selected[m.key])}</span>
              </div>
              <div className="lp-metric__bar"><i style={{ width: `${m.width(selected)}%` }} /></div>
              <p>{m.explain(selected, A.label, B.label)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-analytics__foot">
        <div>
          <p className="lp-analytics__chart-title">Lift by example rule</p>
          <div className="lp-analytics__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <XAxis type="number" domain={[0, 2.5]} hide />
                <YAxis type="category" dataKey="name" width={124} tick={{ fontSize: 11, fill: '#6b7591' }} axisLine={false} tickLine={false} />
                <ReferenceLine x={1} stroke="#cdd2e6" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ fill: 'rgba(91,94,244,0.06)' }}
                  formatter={(v) => [v, 'Lift']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e7e9f3', fontSize: 12 }}
                />
                <Bar dataKey="lift" radius={[0, 6, 6, 0]} barSize={12} onClick={(d) => d?.id && setSelectedId(d.id)} style={{ cursor: 'pointer' }}>
                  {chartData.map((d) => (
                    <Cell key={d.id} fill={d.id === selectedId ? '#5b5ef4' : '#dfe2f3'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lp-disclaimer">
          <Info size={16} />
          <span>
            These rules and values come from a small <strong>illustrative café example</strong> created for this page.
            They are not findings from your dataset or from any research evaluation. Once you sign in and upload your
            own transactions, CoBuy computes these metrics from your data.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssociationExplorer;
