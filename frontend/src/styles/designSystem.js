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
  primary: '#00b8d4',       // Cyan - main brand
  primaryDark: '#0088a3',   // Darker cyan
  primaryLight: '#00d4f0',  // Lighter cyan
  
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
  borderHover: 'rgba(0, 184, 212, 0.3)',
  divider: 'rgba(255,255,255,0.05)',
};

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 48px rgba(0, 0, 0, 0.6)',
  
  // Glow effects
  glowCyan: '0 0 20px rgba(0, 184, 212, 0.2)',
  glowCyanHover: '0 0 32px rgba(0, 184, 212, 0.3)',
  glowCyanStrong: '0 0 40px rgba(0, 184, 212, 0.4)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.2)',
};

export const gradients = {
  // Atmospheric Background (Buy Box Cartel inspired - with cyan instead of purple)
  // Strong radial glows for depth - more visible than before
  atmosphericGlow: `
    radial-gradient(ellipse 1400px 900px at 50% 0%, rgba(0, 184, 212, 0.15) 0%, rgba(0, 100, 120, 0.08) 40%, transparent 70%),
    radial-gradient(ellipse 1000px 800px at 0% 30%, rgba(0, 140, 160, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 1000px 800px at 100% 70%, rgba(0, 200, 220, 0.10) 0%, transparent 60%),
    linear-gradient(180deg, rgba(0, 50, 60, 0.1) 0%, rgba(0, 0, 0, 1) 100%)
  `,
  
  // Subtle surface gradients
  surfaceSubtle: 'linear-gradient(135deg, rgba(0, 184, 212, 0.03) 0%, rgba(0, 0, 0, 0) 100%)',
  
  // Interactive elements
  primaryButton: 'linear-gradient(135deg, #00b8d4 0%, #0088a3 100%)',
  primaryButtonHover: 'linear-gradient(135deg, #00d4f0 0%, #00b8d4 100%)',
  
  // Overlays
  imageOverlay: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)',
  cardShine: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
};

export const animations = {
  // Keyframes for shimmer loading
  shimmer: '@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }',
  
  // Keyframes for fade in
  fadeIn: '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }',
  
  // Keyframes for scale in
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
  // Headings
  h1: { fontSize: '36px', fontWeight: '700', letterSpacing: '-0.03em' },
  h2: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' },
  h3: { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em' },
  h4: { fontSize: '16px', fontWeight: '600' },
  
  // Body
  body: { fontSize: '15px', lineHeight: '1.6' },
  bodySm: { fontSize: '14px', lineHeight: '1.5' },
  
  // Labels
  label: { fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' },
  labelSm: { fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' },
};

export const transitions = {
  default: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',  // Smooth ease-in-out
  fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',  // Bouncy spring effect
};
