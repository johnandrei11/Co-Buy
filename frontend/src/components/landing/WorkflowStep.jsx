import React from 'react';
import Reveal from './Reveal';

const WorkflowStep = ({ step, icon: Icon, title, description, delay = 0 }) => (
  <Reveal className="lp-step" role="listitem" delay={delay}>
    <div className="lp-step__badge" aria-hidden="true">
      <Icon size={26} strokeWidth={2} />
      <span className="lp-step__num">{step}</span>
    </div>
    <div className="lp-step__card">
      <small>Step {step}</small>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </Reveal>
);

export default WorkflowStep;
