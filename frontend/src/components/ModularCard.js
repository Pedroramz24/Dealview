import React from 'react';
import { colors, shadows, borderRadius, spacing, transitions } from '../styles/designSystem';

/**
 * Modular Card Component
 * Creates elevated surface panels that sit on the black void background
 * Provides depth through layering and shadows, not borders
 */
const ModularCard = ({ 
  children, 
  padding = 'large',
  interactive = false,
  onClick = null,
  className = '',
  style = {}
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const paddingValue = {
    'compact': spacing.md,
    'medium': spacing.lg,
    'large': spacing.xl
  }[padding];

  const baseStyle = {
    background: colors.surfaceCard,
    borderRadius: borderRadius.md,
    boxShadow: isHovered && interactive ? shadows.cardElevationHover : shadows.cardElevation,
    padding: paddingValue,
    transition: transitions.default,
    cursor: interactive ? 'pointer' : 'default',
    transform: isHovered && interactive ? 'translateY(-2px)' : 'translateY(0)',
    position: 'relative',
    ...style
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      {children}
    </div>
  );
};

export default ModularCard;
