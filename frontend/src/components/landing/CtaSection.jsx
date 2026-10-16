import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';
import Reveal from './Reveal';

const CtaSection = ({ isAuthenticated = false }) => (
  <section className="lp-cta" aria-labelledby="cta-title">
    <div className="lp-container">
      <Reveal className="lp-cta__card">
        <div className="lp-cta__icon" aria-hidden="true"><Sparkles size={26} /></div>
        <h2 id="cta-title">Ready to Discover Your Customers' Buying Patterns?</h2>
        <p>Start exploring transaction data and uncover useful product associations with CoBuy.</p>
        <div className="lp-cta__actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="lp-btn lp-btn--primary lp-btn--lg" id="cta-go-dashboard">
              <LayoutDashboard size={18} /> Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="lp-btn lp-btn--primary lp-btn--lg" id="cta-get-started">
                Get Started <ArrowRight size={18} className="lp-btn__arrow" />
              </Link>
              <Link to="/login" className="lp-btn lp-btn--glass lp-btn--lg" id="cta-sign-in">
                Sign In
              </Link>
            </>
          )}
        </div>
        {!isAuthenticated && (
          <p className="lp-cta__sub">
            Don't have an account yet? <Link to="/register" id="cta-create-account">Create one</Link>
          </p>
        )}
      </Reveal>
    </div>
  </section>
);

export default CtaSection;
