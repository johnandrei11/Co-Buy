import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import { NAV_LINKS, scrollToSection } from './LandingNav';

const LandingFooter = ({ isAuthenticated = false }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div className="lp-footer__about">
            <Logo size="md" showSubtitle />
            <p>
              A buying pattern mining system that helps small retail businesses explore historical
              transaction data and understand which products are purchased together.
            </p>
          </div>

          <nav aria-label="Footer">
            <h4>Explore</h4>
            <ul className="lp-footer__links">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(l.id);
                    }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h4>Account</h4>
            <ul className="lp-footer__links">
              {isAuthenticated ? (
                <li><Link to="/dashboard">Go to Dashboard</Link></li>
              ) : (
                <>
                  <li><Link to="/login" id="footer-sign-in">Sign In</Link></li>
                  <li><Link to="/register" id="footer-create-account">Create Account</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <span>© {year} CoBuy. All rights reserved.</span>
          <span>Buying Pattern Mining System</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
