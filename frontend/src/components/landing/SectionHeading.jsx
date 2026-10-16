import React from 'react';
import Reveal from './Reveal';

const SectionHeading = ({ kicker, title, lead, align = 'center', id }) => (
  <Reveal className={`lp-section-head ${align === 'left' ? 'lp-section-head--left' : ''}`}>
    {kicker && <span className="lp-kicker">{kicker}</span>}
    <h2 className="lp-section-title" id={id}>{title}</h2>
    {lead && <p className="lp-section-lead">{lead}</p>}
  </Reveal>
);

export default SectionHeading;
