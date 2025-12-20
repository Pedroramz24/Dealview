import React from 'react';
import { Layers, Sparkles, Ruler, Square, Type } from 'lucide-react';

const MapTopBar = ({
  searchBarComponent,
  layersPanelOpen,
  onToggleLayersPanel,
  aiResearchPanelOpen,
  onToggleAIResearch,
  measurementMode,
  onSetMeasurementMode,
  annotationMode,
  onToggleAnnotationMode,
  mapMode
}) => {
  const getModeConfig = () => {
    switch (mapMode) {
      case 'prospecting':
        return { label: 'Prospecting', color: '#00b8d4', description: 'Full research tools' };
      case 'portfolio':
        return { label: 'Portfolio', color: '#00d4aa', description: 'Your listings' };
      case 'discovery':
        return { label: 'Discovery', color: '#a78bfa', description: 'Marketplace deals' };
      default:
        return { label: 'Map', color: '#6b7280', description: '' };
    }
  };

  const modeConfig = getModeConfig();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: 'rgba(11, 12, 14, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      gap: '20px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Left: Layer Manager Button + Mode Badge */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleLayersPanel}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: layersPanelOpen ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${layersPanelOpen ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: layersPanelOpen ? '#00b8d4' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Layers"
        >
          <Layers size={20} />
        </button>

        {/* Mode Indicator Badge */}
        <div style={{
          padding: '6px 14px',
          background: `${modeConfig.color}15`,
          border: `1px solid ${modeConfig.color}30`,
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          color: modeConfig.color,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {modeConfig.label}
        </div>
      </div>

      {/* Center: Address Search Bar - Flush with header */}
      <div style={{ flex: '1 1 auto', maxWidth: '600px' }}>
        {searchBarComponent}
      </div>

      {/* Right: Tools (Icons Only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
        {/* Measure Distance - All modes */}
        <button
          onClick={() => onSetMeasurementMode(measurementMode === 'distance' ? null : 'distance')}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: measurementMode === 'distance' 
              ? 'rgba(168, 85, 247, 0.15)' 
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${measurementMode === 'distance' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: measurementMode === 'distance' ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Measure Distance"
        >
          <Ruler size={20} />
        </button>

        {/* Measure Area - All modes */}
        <button
          onClick={() => onSetMeasurementMode(measurementMode === 'area' ? null : 'area')}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: measurementMode === 'area' 
              ? 'rgba(168, 85, 247, 0.15)' 
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${measurementMode === 'area' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: measurementMode === 'area' ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Measure Area"
        >
          <Square size={20} />
        </button>

        {/* Text Annotation - All modes */}
        <button
          onClick={onToggleAnnotationMode}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: annotationMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${annotationMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: annotationMode ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Add Text Label"
        >
          <Type size={20} />
        </button>

        {/* AI Research - Only in Prospecting Mode (Broker) */}
        {mapMode === 'prospecting' && (
          <button
            onClick={onToggleAIResearch}
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: aiResearchPanelOpen ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${aiResearchPanelOpen ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: aiResearchPanelOpen ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="AI Market Research"
          >
            <Sparkles size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MapTopBar;
