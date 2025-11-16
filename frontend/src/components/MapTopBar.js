import React from 'react';
import { Layers, Sparkles, Ruler, Square } from 'lucide-react';

const MapTopBar = ({
  searchBarComponent,
  layersPanelOpen,
  onToggleLayersPanel,
  aiResearchPanelOpen,
  onToggleAIResearch,
  measurementMode,
  onSetMeasurementMode
}) => {
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
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Left Section: App Logo + Layer Manager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 0 auto' }}>
        {/* App Logo/Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(0, 184, 212, 0.1)',
          border: '1px solid rgba(0, 184, 212, 0.2)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#00b8d4" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="10" r="3" fill="#00b8d4"/>
          </svg>
          <span style={{ color: '#00b8d4', fontSize: '16px', fontWeight: 700 }}>DealView</span>
        </div>

        {/* Layer Manager Button */}
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
      </div>

      {/* Center Section: Address Search Bar (passed as component) */}
      <div style={{ flex: '1 1 auto', maxWidth: '600px', margin: '0 24px' }}>
        {searchBarComponent}
      </div>

      {/* Right Section: Tools (Icons Only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
        {/* Measure Distance */}
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

        {/* Measure Area */}
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

        {/* AI Research Button */}
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
      </div>
    </div>
  );
};

export default MapTopBar;
