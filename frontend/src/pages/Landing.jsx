import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import {
  ArrowRight, Sparkles, Store, Network, Link2, WifiOff, Database, GitBranch, Activity,
  ShoppingBasket, Upload, Filter, Search, ChartColumn, CircleCheck, Info, Check, Workflow
} from 'lucide-react';

import LandingNav, { NAV_LINKS, scrollToSection } from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import DashboardPreview from '../components/landing/DashboardPreview';
import AssociationExplorer from '../components/landing/AssociationExplorer';
import SectionHeading from '../components/landing/SectionHeading';
import FeatureCard from '../components/landing/FeatureCard';
import WorkflowStep from '../components/landing/WorkflowStep';
import CtaSection from '../components/landing/CtaSection';
import Reveal from '../components/landing/Reveal';
import { HeroAtmosphere, SectionAtmosphere } from '../components/landing/LandingBackgrounds';
import '../components/landing/landing.css';

/* ── Content ─────────────────────────────────────────────────────────────── */
const VALUES = [
  { icon: Store, label: 'Designed for Small Retail Businesses', c: '#5b5ef4', bg: '#eef0ff' },
  { icon: Network, label: 'Association Rule Mining', c: '#7c5cff', bg: '#f3efff' },
  { icon: Link2, label: 'Product Relationship Insights', c: '#0ea5e9', bg: '#e8f6fe' },
  { icon: WifiOff, label: 'Offline-Friendly Data Analysis', c: '#10b981', bg: '#e9fbf3' },
];

const FEATURES = [
  {
    icon: Database,
    title: 'Transaction Data Processing',
    description: 'Upload historical transaction datasets and prepare them for analysis through data cleaning and preprocessing.',
    tags: ['CSV', 'Excel', 'Data cleaning'],
    color: '#4f46e5',
  },
  {
    icon: GitBranch,
    title: 'Smart Pattern Discovery',
    description: 'Use Apriori and FP-Growth to identify frequent itemsets and discover products that are commonly purchased together.',
    tags: ['Apriori', 'FP-Growth'],
    color: '#7c3aed',
  },
  {
    icon: Activity,
    title: 'Association Rule Metrics',
    description: 'Understand product relationships through Support, Confidence, and Lift.',
    tags: ['Support', 'Confidence', 'Lift'],
    color: '#0284c7',
  },
  {
    icon: ShoppingBasket,
    title: 'Visual Product Recommendations',
    description: 'Explore discovered associations through clear visualizations that help retailers consider product bundling, promotions, and product placement.',
    tags: ['Bundling', 'Promotions', 'Placement'],
    color: '#10b981',
  },
];

const STEPS = [
  { icon: Upload, title: 'Upload Data', description: 'Import historical transaction records in supported CSV or Excel formats.' },
  { icon: Filter, title: 'Clean and Prepare', description: 'Transform transaction records into a structured format suitable for mining.' },
  { icon: Search, title: 'Discover Associations', description: 'Run Apriori or FP-Growth to identify frequent itemsets and generate association rules.' },
  { icon: ChartColumn, title: 'Explore Insights', description: 'Review Support, Confidence, Lift, and product relationships to support retail decisions.' },
];

const PURPOSES = [
  'Make association rule mining more accessible.',
  'Help users explore relationships among purchased products.',
  'Present analytical findings in an understandable interface.',
  'Support informed product bundling and promotional planning.',
];

const PIPELINE = [
  { icon: Upload, title: 'Transaction records', sub: 'Historical sales data', tag: 'CSV · XLSX', c: '#5b5ef4' },
  { icon: Filter, title: 'Preprocessing', sub: 'Clean & encode baskets', tag: 'one-hot', c: '#7c5cff' },
  { icon: GitBranch, title: 'Rule mining', sub: 'Frequent itemsets → rules', tag: 'Apriori · FP-Growth', c: '#0ea5e9' },
  { icon: ChartColumn, title: 'Insights', sub: 'Metrics & visualizations', tag: 'S · C · L', c: '#10b981' },
];

const SECTION_IDS = [...NAV_LINKS.map((l) => l.id), 'analytics'];

/* ── Page ────────────────────────────────────────────────────────────────── */
const Landing = ({ isAuthenticated = false }) => {
  const [activeId, setActiveId] = useState('home');

  // SEO: page title + meta description while the landing page is mounted.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'CoBuy — Buying Pattern Mining for Small Retail Businesses';
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    const prevDesc = meta?.getAttribute('content');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      'CoBuy helps small retail businesses discover purchasing patterns, understand product relationships, and make informed decisions using association rule mining (Apriori & FP-Growth).'
    );
    return () => {
      document.title = prevTitle;
      if (created) meta.remove();
      else if (prevDesc != null) meta.setAttribute('content', prevDesc);
    };
  }, []);

  // Honour deep links such as /#features on first load.
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (id) setTimeout(() => scrollToSection(id), 60);
  }, []);

  // Highlight the nav link for the section currently in view.
  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id === 'analytics' ? 'how-it-works' : e.target.id;
            setActiveId(id);
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp-scope lp-root">
        <a href="#main" className="lp-skip-link">Skip to content</a>
        <LandingNav activeId={activeId} isAuthenticated={isAuthenticated} />

        <main id="main">
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section id="home" className="lp-hero" aria-labelledby="hero-title">
            <HeroAtmosphere />

            <div className="lp-container lp-hero__grid">
              <motion.div
                className="lp-hero__copy"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="lp-eyebrow">
                  <span className="lp-eyebrow__dot"><Sparkles size={12} /></span>
                  Smarter insights for small retail businesses
                </span>
                <h1 id="hero-title" className="lp-hero__title">
                  Turn Transaction Data Into <span className="lp-gradient-text">Smarter Product Decisions.</span>
                </h1>
                <p className="lp-hero__lead">
                  CoBuy helps small retail businesses discover purchasing patterns, understand product
                  relationships, and make informed decisions using association rule mining.
                </p>
                <div className="lp-hero__ctas">
                  {isAuthenticated ? (
                    <Link to="/dashboard" className="lp-btn lp-btn--primary lp-btn--lg" id="hero-go-dashboard">
                      Go to Dashboard <ArrowRight size={18} className="lp-btn__arrow" />
                    </Link>
                  ) : (
                    <Link to="/login" className="lp-btn lp-btn--primary lp-btn--lg" id="hero-get-started">
                      Get Started <ArrowRight size={18} className="lp-btn__arrow" />
                    </Link>
                  )}
                  <a
                    href="#features"
                    id="hero-explore-features"
                    className="lp-btn lp-btn--secondary lp-btn--lg"
                    onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
                  >
                    Explore Features
                  </a>
                </div>
                {!isAuthenticated && (
                  <p className="lp-hero__note">
                    New to CoBuy? <Link to="/register" id="hero-create-account">Create an account</Link>
                  </p>
                )}
                <ul className="lp-hero__chips" aria-label="Techniques used">
                  {['Apriori', 'FP-Growth', 'Support', 'Confidence', 'Lift'].map((t) => (
                    <li key={t}><Check size={13} /> {t}</li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                className="lp-hero__visual"
                initial={{ opacity: 0, y: 32, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <DashboardPreview />
              </motion.div>
            </div>
          </section>

          {/* ── Value strip ──────────────────────────────────────────────── */}
          <section className="lp-values" aria-label="Why CoBuy">
            <div className="lp-container">
              <Reveal as="ul" className="lp-values__grid">
                {VALUES.map(({ icon: Icon, label, c, bg }) => (
                  <li key={label} className="lp-value">
                    <span className="lp-value__icon" style={{ '--_c': c, '--_bg': bg }} aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <p>{label}</p>
                  </li>
                ))}
              </Reveal>
            </div>
          </section>

          {/* ── Features ─────────────────────────────────────────────────── */}
          <section id="features" className="lp-section" aria-labelledby="features-title">
            <SectionAtmosphere variant="features" />
            <div className="lp-container">
              <SectionHeading
                id="features-title"
                kicker="Features"
                title="Everything You Need to Discover Buying Patterns"
                lead="Transform historical transaction records into understandable product relationships and actionable recommendations."
              />
              <div className="lp-features__grid">
                {FEATURES.map((f, i) => (
                  <FeatureCard key={f.title} index={i + 1} delay={i * 0.08} {...f} />
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────────────── */}
          <section id="how-it-works" className="lp-section lp-how" aria-labelledby="how-title">
            <SectionAtmosphere variant="how-it-works" />
            <div className="lp-container">
              <SectionHeading
                id="how-title"
                kicker="How It Works"
                title="From Transaction Records to Product Insights"
                lead="A clear, four-step workflow that takes you from raw sales history to understandable association rules."
              />
              <div className="lp-steps" role="list">
                <span className="lp-steps__line" aria-hidden="true">
                  <motion.i
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '0px 0px -120px 0px' }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                {STEPS.map((s, i) => (
                  <WorkflowStep key={s.title} step={i + 1} delay={i * 0.12} {...s} />
                ))}
              </div>
            </div>
          </section>

          {/* ── Interactive analytics preview ────────────────────────────── */}
          <section id="analytics" className="lp-section" aria-labelledby="analytics-title">
            <SectionAtmosphere variant="analytics" />
            <div className="lp-container">
              <SectionHeading
                id="analytics-title"
                kicker="Analytics Preview"
                title="See the Relationships Behind Every Purchase"
                lead="Select a rule to see how CoBuy explains each relationship. The example below uses a small illustrative café dataset."
              />
              <Reveal>
                <AssociationExplorer />
              </Reveal>
            </div>
          </section>

          {/* ── About ────────────────────────────────────────────────────── */}
          <section id="about" className="lp-section lp-how" aria-labelledby="about-title">
            <SectionAtmosphere variant="about" />
            <div className="lp-container lp-about__grid">
              <div>
                <SectionHeading
                  id="about-title"
                  align="left"
                  kicker="About CoBuy"
                  title="Built to Make Product Relationships Easier to Understand"
                />
                <Reveal>
                  <p className="lp-about__text">
                    CoBuy is a buying pattern mining system designed to help small retail businesses explore
                    historical transaction data. By combining association rule mining algorithms with accessible
                    visualizations, the system helps users identify purchasing relationships without requiring
                    advanced data mining expertise.
                  </p>
                </Reveal>
                <ul className="lp-about__list">
                  {PURPOSES.map((p, i) => (
                    <Reveal as="li" key={p} className="lp-about__item" delay={i * 0.06}>
                      <span className="lp-about__item-icon" aria-hidden="true"><CircleCheck size={18} /></span>
                      <p>{p}</p>
                    </Reveal>
                  ))}
                </ul>
              </div>

              <Reveal className="lp-about__visual" delay={0.1}>
                <div className="lp-stack">
                  <div className="lp-stack__card lp-stack__card--back" aria-hidden="true" />
                  <div className="lp-stack__card">
                    <div className="lp-stack__title">
                      <strong><Workflow size={16} style={{ verticalAlign: '-3px', marginRight: 6, color: '#5b5ef4' }} />How CoBuy processes data</strong>
                    </div>
                    <ol className="lp-pipeline">
                      {PIPELINE.map(({ icon: Icon, title, sub, tag, c }) => (
                        <li key={title} className="lp-pipeline__row">
                          <span className="lp-pipeline__icon" style={{ '--_c': c }} aria-hidden="true"><Icon size={18} /></span>
                          <div>
                            <b>{title}</b>
                            <small>{sub}</small>
                          </div>
                          <em>{tag}</em>
                        </li>
                      ))}
                    </ol>
                    <p className="lp-stack__note">
                      <Info size={13} /> Works with exported historical records — no live POS connection required.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Final CTA ────────────────────────────────────────────────── */}
          <div style={{ paddingTop: '4.5rem' }}>
            <CtaSection isAuthenticated={isAuthenticated} />
          </div>
        </main>

        <LandingFooter isAuthenticated={isAuthenticated} />
      </div>
    </MotionConfig>
  );
};

export default Landing;
