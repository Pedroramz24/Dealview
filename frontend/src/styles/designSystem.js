/**
 * DealLinked Design System - Premium Dark Mode
 * Elevated aesthetic with depth, shadows, atmospheric gradients, and refined motion
 */

export const colors = {
  // Surfaces (layered elevation) - Modular Card System
  void: '#000000',           // Base background (with gradient)
  surfaceCard: '#0c0c0c',    // Card/panel backgrounds - lighter than void
  surfaceCardHover: '#111111', // Card hover state
  surfaceElevated: '#151515', // Even more elevated (nested cards)
  hover: '#1a1a1a',          // General hover states
  
  // Brand Colors
  primary: '#ff0000',       // Red - main brand
  primaryDark: '#cc0000',   // Darker red
  primaryLight: '#ff3333',  // Lighter red
  
  // Accent Colors (selective use)
  success: '#10b981',       // Emerald - approved, positive
  warning: '#f59e0b',       // Amber - pending, alerts
  danger: '#ef4444',        // Red - delete, reject
  
  // Text Hierarchy
  textPrimary: '#ffffff',           // Headings
  textSecondary: 'rgba(255,255,255,0.85)',  // Body text
  textTertiary: 'rgba(255,255,255,0.6)',    // Labels
  textMuted: 'rgba(255,255,255,0.4)',       // Disabled/subtle
  
  // Borders & Dividers
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255, 0, 0, 0.3)',
  divider: 'rgba(255,255,255,0.05)',
};

export const shadows = {
  // Modular Card Shadows - Soft elevation
  cardElevation: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
  cardElevationHover: '0 8px 20px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)',
  cardElevationActive: '0 2px 6px rgba(0, 0, 0, 0.4)',
  
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 48px rgba(0, 0, 0, 0.6)',
  
  // Glow effects
  glow: '0 0 20px rgba(255, 0, 0, 0.2)',
  glowHover: '0 0 32px rgba(255, 0, 0, 0.3)',
  glowStrong: '0 0 40px rgba(255, 0, 0, 0.4)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.2)',
};

export const gradients = {
  // Atmospheric Background - Red brand glow
  atmosphericGlow: `
    radial-gradient(ellipse 1400px 900px at 50% 0%, rgba(255, 0, 0, 0.12) 0%, rgba(150, 0, 0, 0.06) 40%, transparent 70%),
    radial-gradient(ellipse 1000px 800px at 0% 30%, rgba(200, 0, 0, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 1000px 800px at 100% 70%, rgba(255, 30, 30, 0.06) 0%, transparent 60%),
    linear-gradient(180deg, rgba(80, 0, 0, 0.08) 0%, rgba(0, 0, 0, 1) 100%)
  `,
  
  // Subtle surface gradients
  surfaceSubtle: 'linear-gradient(135deg, rgba(255, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0) 100%)',
  
  // Interactive elements
  primaryButton: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
  primaryButtonHover: 'linear-gradient(135deg, #ff3333 0%, #ff0000 100%)',
  
  // Overlays
  imageOverlay: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)',
  cardShine: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
};

export const animations = {
  shimmer: '@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }',
  fadeIn: '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }',
  scaleIn: '@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
};

export const typography = {
  h1: { fontSize: '36px', fontWeight: '700', letterSpacing: '-0.03em' },
  h2: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' },
  h3: { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em' },
  h4: { fontSize: '16px', fontWeight: '600' },
  body: { fontSize: '15px', lineHeight: '1.6' },
  bodySm: { fontSize: '14px', lineHeight: '1.5' },
  label: { fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' },
  labelSm: { fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' },
};

export const transitions = {
  default: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const cardStyles = {
  base: {
    background: colors.surfaceCard,
    borderRadius: borderRadius.md,
    boxShadow: shadows.cardElevation,
    padding: spacing.lg,
    transition: transitions.default,
  },
  compact: {
    background: colors.surfaceCard,
    borderRadius: borderRadius.md,
    boxShadow: shadows.cardElevation,
    padding: spacing.md,
    transition: transitions.default,
  },
  large: {
    background: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.cardElevation,
    padding: spacing.xl,
    transition: transitions.default,
  },
  interactive: {
    background: colors.surfaceCard,
    borderRadius: borderRadius.md,
    boxShadow: shadows.cardElevation,
    padding: spacing.lg,
    transition: transitions.default,
    cursor: 'pointer',
    ':hover': {
      background: colors.surfaceCardHover,
      boxShadow: shadows.cardElevationHover,
      transform: 'translateY(-2px)',
    },
  },
};
