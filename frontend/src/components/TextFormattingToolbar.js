import React from 'react';
import { Type, Bold, Italic, Trash2, RotateCw } from 'lucide-react';

const TextFormattingToolbar = ({ 
  isVisible, 
  currentFormat, 
  onFormatChange,
  onDelete,
  onRotate 
}) => {
  if (!isVisible) return null;

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32];
  const colors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Cyan', value: '#ff0000' },
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' }
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(11, 12, 14, 0.98)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 0, 0, 0.3)',
      borderRadius: '10px',
      padding: '10px 16px',
      boxShadow: '0 4px 24px rgba(255, 0, 0, 0.3)',
    }}>
      {/* Font Size Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Type size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
        <select
          value={currentFormat.fontSize || 16}
          onChange={(e) => onFormatChange({ fontSize: parseInt(e.target.value) })}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#ffffff',
            padding: '6px 10px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {fontSizes.map(size => (
            <option key={size} value={size} style={{ background: '#1a1a1a' }}>
              {size}px
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Bold */}
      <button
        onClick={() => onFormatChange({ bold: !currentFormat.bold })}
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: currentFormat.bold ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${currentFormat.bold ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '6px',
          color: currentFormat.bold ? '#ff0000' : 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title="Bold"
      >
        <Bold size={18} />
      </button>

      {/* Italic */}
      <button
        onClick={() => onFormatChange({ italic: !currentFormat.italic })}
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: currentFormat.italic ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${currentFormat.italic ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '6px',
          color: currentFormat.italic ? '#ff0000' : 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title="Italic"
      >
        <Italic size={18} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Color Picker */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {colors.map(colorOption => (
          <button
            key={colorOption.value}
            onClick={() => onFormatChange({ color: colorOption.value })}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: colorOption.value,
              border: currentFormat.color === colorOption.value 
                ? '3px solid rgba(255, 255, 255, 0.9)' 
                : '2px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: currentFormat.color === colorOption.value 
                ? `0 0 12px ${colorOption.value}` 
                : 'none'
            }}
            title={colorOption.name}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Uppercase Toggle */}
      <button
        onClick={() => onFormatChange({ uppercase: !currentFormat.uppercase })}
        style={{
          padding: '8px 12px',
          background: currentFormat.uppercase ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${currentFormat.uppercase ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '6px',
          color: currentFormat.uppercase ? '#ff0000' : 'rgba(255, 255, 255, 0.7)',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.5px'
        }}
        title="Toggle Uppercase"
      >
        {currentFormat.uppercase ? 'ABC' : 'abc'}
      </button>

      {/* Rotation */}
      <button
        onClick={() => onRotate()}
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title={`Rotate (${currentFormat.rotation || 0}°)`}
      >
        <RotateCw size={18} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Delete & Exit */}
      <button
        onClick={onDelete}
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          color: '#ef4444',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Delete & Exit"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default TextFormattingToolbar;
