// Asset Type Color Mapping
export const assetTypeColors = {
  'Retail Centers': {
    color: '#00b8d4',
    bg: 'rgba(0, 184, 212, 0.15)',
    border: 'rgba(0, 184, 212, 0.3)'
  },
  'Land': {
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  'Industrial': {
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.3)'
  },
  'Restaurants': {
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  'Hotels': {
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.3)'
  },
  'Medical': {
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)'
  }
};

// Get color for asset type with fallback
export const getAssetTypeColor = (assetType) => {
  return assetTypeColors[assetType] || {
    color: '#00b8d4',
    bg: 'rgba(0, 184, 212, 0.15)',
    border: 'rgba(0, 184, 212, 0.3)'
  };
};
