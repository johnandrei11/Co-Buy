import React from 'react';
import { motion } from 'framer-motion';

/**
 * Fades/slides children in once they scroll into view.
 * Motion is automatically reduced for users with prefers-reduced-motion
 * via the <MotionConfig reducedMotion="user"> wrapper on the landing page.
 */
const Reveal = ({ children, delay = 0, y = 24, as = 'div', className, ...rest }) => {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Comp>
  );
};

export default Reveal;
