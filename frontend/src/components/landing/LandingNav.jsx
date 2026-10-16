import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import Logo from '../Logo';

export const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'about', label: 'About' },
];

/** Smoothly scroll to an in-page section (respects reduced-motion preferences). */
export const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
};

const LandingNav = ({ activeId = 'home', isAuthenticated = false }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth > 960 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const handleNav = (e, id) => {
    e.preventDefault();
    setOpen(false);
    scrollToSection(id);
  };

  const authActions = (variant) =>
    isAuthenticated ? (
      <Link to="/dashboard" id={`${variant}-go-dashboard`} className="lp-btn lp-btn--primary">
        <LayoutDashboard size={16} /> Go to Dashboard
      </Link>
    ) : (
      <>
        <Link to="/login" id={`${variant}-sign-in`} className="lp-btn lp-btn--secondary">
          Sign In
        </Link>
        <Link to="/login" id={`${variant}-get-started`} className="lp-btn lp-btn--primary">
          Get Started <ArrowRight size={16} className="lp-btn__arrow" />
        </Link>
      </>
    );

  return (
    <header className={`lp-nav ${scrolled || open ? 'is-scrolled' : ''}`}>
      <div className="lp-container lp-nav__inner">
        <a href="#home" className="lp-nav__brand" aria-label="CoBuy — back to top" onClick={(e) => handleNav(e, 'home')}>
          <Logo size="md" showSubtitle />
        </a>

        <nav className="lp-nav__links" aria-label="Primary">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  id={`nav-link-${l.id}`}
                  className={activeId === l.id ? 'is-active' : ''}
                  aria-current={activeId === l.id ? 'location' : undefined}
                  onClick={(e) => handleNav(e, l.id)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lp-nav__actions">{authActions('nav')}</div>

        <button
          type="button"
          id="nav-mobile-toggle"
          className="lp-nav__toggle"
          aria-expanded={open}
          aria-controls="lp-mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div id="lp-mobile-menu" className={`lp-nav__mobile ${open ? 'is-open' : ''}`}>
        <nav className="lp-nav__mobile-inner" aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`lp-nav__mobile-link ${activeId === l.id ? 'is-active' : ''}`}
              onClick={(e) => handleNav(e, l.id)}
            >
              {l.label}
            </a>
          ))}
          <div className="lp-nav__mobile-actions">{authActions('mobile')}</div>
        </nav>
      </div>
    </header>
  );
};

export default LandingNav;
