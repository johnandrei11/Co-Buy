import React from 'react';
import Reveal from './Reveal';

const FeatureCard = ({ index, icon: Icon, title, description, tags = [], color, delay = 0 }) => (
  <Reveal delay={delay} style={{ height: '100%' }}>
    <article
      className="lp-feature"
      style={{ '--_c': color }}
    >
      <span className="lp-feature__num" aria-hidden="true">{String(index).padStart(2, '0')}</span>
      <div className="lp-feature__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {tags.length > 0 && (
        <div className="lp-feature__tags">
          {tags.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
    </article>
  </Reveal>
);

export default FeatureCard;
