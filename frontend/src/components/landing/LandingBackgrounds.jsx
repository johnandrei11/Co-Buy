import React from 'react';

/**
 * CoBuy Landing Backgrounds
 * 
 * Provides luminous studio lighting, layered translucent wave ribbons,
 * glowing association connector lines, small luminous nodes, and floating 3D cubes.
 * Keeps the page predominantly clean and white with soft lavender, cyan, and mint-green accents.
 * Designed so that decorative elements frame the content and never compete with text contrast.
 */

/** Floating 3D Isometric Cube */
export const FloatingCube = ({
  size = 40,
  topColor = '#e0e7ff',
  leftColor = '#c7d2fe',
  rightColor = '#a5b4fc',
  glowColor = 'rgba(165, 180, 252, 0.35)',
  shadow = true,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`lp-cube-wrapper ${className}`}
      style={{
        width: size,
        height: size * 1.15,
        ...style,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 115"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 8px 16px ${glowColor})` }}
      >
        <defs>
          {shadow && (
            <radialGradient id={`cube-shadow-${size}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.16)" />
              <stop offset="60%" stopColor="rgba(15, 23, 42, 0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          )}
        </defs>

        {/* Ambient Occlusion Ground Shadow */}
        {shadow && (
          <ellipse cx="50" cy="104" rx="36" ry="9" fill={`url(#cube-shadow-${size})`} />
        )}

        {/* 3D Isometric Faces */}
        {/* Left Face */}
        <path
          d="M12 40 L50 62 L50 94 L12 72 Z"
          fill={leftColor}
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Right Face */}
        <path
          d="M50 62 L88 40 L88 72 L50 94 Z"
          fill={rightColor}
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Top Face (Illuminated Rim) */}
        <path
          d="M50 8 L88 30 L50 52 L12 30 Z"
          fill={topColor}
          stroke="rgba(255, 255, 255, 0.95)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/** Floating Rounded Glass Square with Icon Glyph */
export const FloatingGlassBadge = ({
  size = 48,
  color = '#7c3aed',
  bg = 'rgba(255, 255, 255, 0.88)',
  borderColor = 'rgba(255, 255, 255, 0.95)',
  glowColor = 'rgba(124, 58, 237, 0.18)',
  children,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`lp-glass-badge ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: bg,
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 12px 28px -6px ${glowColor}, 0 4px 10px rgba(15, 23, 42, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.95)`,
        color,
        display: 'grid',
        placeItems: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        ...style,
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

/** Hero Section Atmosphere: Radial Light Glows, Layered Translucent Waves & Luminous Nodes */
export const HeroAtmosphere = () => {
  return (
    <div className="lp-hero__bg" aria-hidden="true">
      {/* 1. Large Soft Radial Light Glows */}
      <div className="lp-ambient-glow lp-glow--lavender" />
      <div className="lp-ambient-glow lp-glow--cyan" />
      <div className="lp-ambient-glow lp-glow--mint" />
      <div className="lp-ambient-glow lp-glow--hero-studio" />

      {/* 2. Layered Translucent Gradient Waves SVG */}
      <svg
        className="lp-hero-waves"
        viewBox="0 0 1440 680"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Lavender Wave Gradient */}
          <linearGradient id="wave-lavender-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0.18" />
          </linearGradient>

          {/* Mint Wave Gradient */}
          <linearGradient id="wave-mint-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#cffafe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.15" />
          </linearGradient>

          {/* Icy Cyan Ribbon Gradient */}
          <linearGradient id="wave-cyan-grad" x1="20%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#dbeafe" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ede9fe" stopOpacity="0.2" />
          </linearGradient>

          {/* Glow filter for connector nodes */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dot matrix pattern */}
          <pattern id="dot-matrix-hero" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.4" fill="#a5b4fc" fillOpacity="0.28" />
          </pattern>
        </defs>

        {/* Dot Matrix Grids in Margins (Panel 3 & 4 style) */}
        <rect x="25" y="35" width="144" height="96" fill="url(#dot-matrix-hero)" />
        <rect x="1260" y="60" width="144" height="120" fill="url(#dot-matrix-hero)" />

        {/* Layer 1: Soft Lavender Translucent Wave (swooping from top-left) */}
        <path
          d="M -50 0 C 220 80 340 240 560 170 C 780 100 950 260 1200 200 C 1350 160 1480 230 1520 280 L 1520 0 Z"
          fill="url(#wave-lavender-grad)"
        />
        <path
          d="M -50 0 C 220 80 340 240 560 170 C 780 100 950 260 1200 200 C 1350 160 1480 230 1520 280"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="2"
          fill="none"
        />

        {/* Layer 2: Icy Blue Flowing Wave Ribbon */}
        <path
          d="M -40 400 C 180 340 380 480 620 430 C 860 380 1100 530 1480 380 L 1480 680 L -40 680 Z"
          fill="url(#wave-cyan-grad)"
        />

        {/* Layer 3: Mint-Green Accent Translucent Wave (bottom left and center) */}
        <path
          d="M -50 560 C 160 480 380 580 640 510 C 920 430 1180 590 1500 530 L 1500 680 L -50 680 Z"
          fill="url(#wave-mint-grad)"
        />
        <path
          d="M -50 560 C 160 480 380 580 640 510 C 920 430 1180 590 1500 530"
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* 3. Faint Glowing Association Connector Lines & Luminous Nodes */}
        {/* Top-Left Margin Path (Frames the headline without intersecting words) */}
        <path
          d="M 30 110 C 90 70 170 105 230 65 C 290 25 360 45 420 30"
          stroke="rgba(124, 92, 255, 0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <g filter="url(#node-glow)">
          <circle cx="30" cy="110" r="4.5" fill="#7c5cff" />
          <circle cx="30" cy="110" r="9" stroke="rgba(124, 92, 255, 0.35)" strokeWidth="1.2" fill="none" />

          <circle cx="230" cy="65" r="4" fill="#06b6d4" />
          <circle cx="230" cy="65" r="8" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="1.2" fill="none" />

          <circle cx="420" cy="30" r="4.5" fill="#10b981" />
          <circle cx="420" cy="30" r="9" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.2" fill="none" />
        </g>

        {/* Bottom-Left Margin Arc (Frames the CTA & chip list from below) */}
        <path
          d="M 30 610 C 130 570 240 620 350 580 C 440 550 510 590 570 580"
          stroke="rgba(6, 182, 212, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <g filter="url(#node-glow)">
          <circle cx="30" cy="610" r="4" fill="#06b6d4" />
          <circle cx="350" cy="580" r="4.5" fill="#7c5cff" />
          <circle cx="570" cy="580" r="4" fill="#10b981" />
        </g>

        {/* Right Side: Recommendation Association Path curving around Dashboard Preview */}
        <path
          d="M 1030 150 C 1140 110 1260 180 1340 140 C 1390 110 1420 160 1460 180"
          stroke="rgba(6, 182, 212, 0.32)"
          strokeWidth="1.6"
          strokeDasharray="5 4"
          fill="none"
        />
        <path
          d="M 980 490 C 1070 430 1190 480 1290 420 C 1370 370 1410 430 1460 410"
          stroke="rgba(124, 92, 255, 0.28)"
          strokeWidth="1.5"
          fill="none"
        />
        <g filter="url(#node-glow)">
          <circle cx="1030" cy="150" r="4" fill="#06b6d4" />
          <circle cx="1260" cy="180" r="4.5" fill="#7c5cff" />
          <circle cx="1340" cy="140" r="3.5" fill="#10b981" />
          <circle cx="1070" cy="430" r="4" fill="#7c5cff" />
          <circle cx="1290" cy="420" r="4.5" fill="#06b6d4" />
        </g>
      </svg>

      {/* 4. Floating 3D Geometric Cubes with Soft Ambient Shadows */}
      {/* Top Left: Lavender 3D Cube */}
      <FloatingCube
        size={46}
        topColor="#f5f3ff"
        leftColor="#ddd6fe"
        rightColor="#c4b5fd"
        glowColor="rgba(167, 139, 250, 0.3)"
        className="lp-float-3d lp-pos-hero-1"
      />

      {/* Bottom Left: Mint Green 3D Cube */}
      <FloatingCube
        size={36}
        topColor="#ecfdf5"
        leftColor="#a7f3d0"
        rightColor="#6ee7b7"
        glowColor="rgba(16, 185, 129, 0.25)"
        className="lp-float-3d lp-pos-hero-2"
      />

      {/* Top Right: Icy Cyan 3D Cube */}
      <FloatingCube
        size={42}
        topColor="#f0fdfa"
        leftColor="#cffafe"
        rightColor="#a5f3fc"
        glowColor="rgba(6, 182, 212, 0.25)"
        className="lp-float-3d lp-pos-hero-3"
      />

      {/* Far Right: Soft Indigo/Violet Cube */}
      <FloatingCube
        size={32}
        topColor="#eef2ff"
        leftColor="#c7d2fe"
        rightColor="#a5b4fc"
        glowColor="rgba(99, 102, 241, 0.22)"
        className="lp-float-3d lp-pos-hero-4"
      />

      {/* Floating Glass Rounded Square with Shopping Cart / Pattern glyph (Panel 2 vibe) */}
      <FloatingGlassBadge
        size={46}
        color="#7c5cff"
        glowColor="rgba(124, 92, 255, 0.22)"
        className="lp-float-3d lp-pos-hero-badge"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      </FloatingGlassBadge>
    </div>
  );
};

/** Section Atmosphere for Features, How It Works, Analytics, and About */
export const SectionAtmosphere = ({ variant = 'features' }) => {
  if (variant === 'features') {
    return (
      <div className="lp-section-bg" aria-hidden="true">
        {/* Soft radial glow: cyan on left, lavender on right */}
        <div className="lp-sec-glow lp-sec-glow--cyan-left" />
        <div className="lp-sec-glow lp-sec-glow--lavender-right" />

        {/* Dot Matrix Patterns (Panel 3 & 4 style) */}
        <svg className="lp-section-dots" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="feat-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="1.3" fill="#cbd5e1" fillOpacity="0.45" />
            </pattern>
          </defs>
          <rect x="3%" y="40" width="144" height="110" fill="url(#feat-dots)" />
          <rect x="89%" y="160" width="130" height="130" fill="url(#feat-dots)" />
        </svg>

        {/* Small floating 3D cube on feature edge */}
        <FloatingCube
          size={32}
          topColor="#f5f3ff"
          leftColor="#ede9fe"
          rightColor="#ddd6fe"
          glowColor="rgba(124, 92, 255, 0.18)"
          className="lp-float-3d lp-pos-feat-1"
        />
      </div>
    );
  }

  if (variant === 'how-it-works') {
    return (
      <div className="lp-section-bg" aria-hidden="true">
        {/* Soft mint & pale blue radial glows */}
        <div className="lp-sec-glow lp-sec-glow--mint-center" />
        <div className="lp-sec-glow lp-sec-glow--lavender-top" />

        {/* Layered Translucent Gradient Wave Ribbon (Panel 4 style) */}
        <svg
          className="lp-how-waves"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="how-ribbon-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#cffafe" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="how-ribbon-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#ede9fe" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Translucent overlapping wave ribbons */}
          <path
            d="M 0 140 C 260 80 480 200 740 150 C 1000 100 1220 220 1440 160 L 1440 320 L 0 320 Z"
            fill="url(#how-ribbon-1)"
          />
          <path
            d="M 0 140 C 260 80 480 200 740 150 C 1000 100 1220 220 1440 160"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth="2"
            fill="none"
          />

          <path
            d="M 0 210 C 320 160 560 260 840 200 C 1120 140 1300 240 1440 220 L 1440 320 L 0 320 Z"
            fill="url(#how-ribbon-2)"
          />
        </svg>

        <FloatingCube
          size={34}
          topColor="#ecfdf5"
          leftColor="#a7f3d0"
          rightColor="#6ee7b7"
          glowColor="rgba(16, 185, 129, 0.2)"
          className="lp-float-3d lp-pos-how-1"
        />
      </div>
    );
  }

  if (variant === 'analytics') {
    return (
      <div className="lp-section-bg" aria-hidden="true">
        {/* Soft studio backlight behind association explorer */}
        <div className="lp-sec-glow lp-sec-glow--analytics-bloom" />
        <div className="lp-sec-glow lp-sec-glow--cyan-bottom" />

        {/* Association Graph Faint Network in Margins (Frames title without colliding with it) */}
        <svg
          className="lp-analytics-bg-graph"
          viewBox="0 0 1200 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Margin Cluster */}
          <g opacity="0.4">
            <line x1="50" y1="90" x2="160" y2="50" stroke="#a5b4fc" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="160" y1="50" x2="220" y2="120" stroke="#67e8f9" strokeWidth="1.3" />
            <line x1="160" y1="50" x2="90" y2="180" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="90" y1="180" x2="190" y2="230" stroke="#86efac" strokeWidth="1.2" />

            <circle cx="50" cy="90" r="4.5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.4" />
            <circle cx="160" cy="50" r="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.4" />
            <circle cx="220" cy="120" r="5" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="1.4" />
            <circle cx="90" cy="180" r="4.5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.4" />
            <circle cx="190" cy="230" r="5" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.4" />
          </g>

          {/* Right Margin Cluster */}
          <g opacity="0.4">
            <line x1="980" y1="60" x2="1080" y2="110" stroke="#67e8f9" strokeWidth="1.3" />
            <line x1="1080" y1="110" x2="1150" y2="70" stroke="#a5b4fc" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="1080" y1="110" x2="1040" y2="190" stroke="#86efac" strokeWidth="1.2" />
            <line x1="1040" y1="190" x2="1130" y2="230" stroke="#cbd5e1" strokeWidth="1" />

            <circle cx="980" cy="60" r="5" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.4" />
            <circle cx="1080" cy="110" r="6" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="1.4" />
            <circle cx="1150" cy="70" r="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.4" />
            <circle cx="1040" cy="190" r="5" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.4" />
            <circle cx="1130" cy="230" r="4.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.4" />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'about') {
    return (
      <div className="lp-section-bg" aria-hidden="true">
        {/* Soft lavender & mint glow */}
        <div className="lp-sec-glow lp-sec-glow--about-lavender" />
        <div className="lp-sec-glow lp-sec-glow--about-mint" />

        <svg className="lp-section-dots" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="about-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#c7d2fe" fillOpacity="0.38" />
            </pattern>
          </defs>
          <rect x="75%" y="60" width="220" height="180" fill="url(#about-dots)" />
        </svg>

        {/* Isometric Pipeline Accent Cube (Panel 5 style) */}
        <FloatingCube
          size={38}
          topColor="#ede9fe"
          leftColor="#c4b5fd"
          rightColor="#a78bfa"
          glowColor="rgba(124, 58, 237, 0.22)"
          className="lp-float-3d lp-pos-about-1"
        />
        <FloatingCube
          size={28}
          topColor="#cffafe"
          leftColor="#a5f3fc"
          rightColor="#67e8f9"
          glowColor="rgba(6, 182, 212, 0.2)"
          className="lp-float-3d lp-pos-about-2"
        />
      </div>
    );
  }

  return null;
};
