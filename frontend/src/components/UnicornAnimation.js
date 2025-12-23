import React, { useEffect, useRef } from 'react';

const UnicornAnimation = ({ animationData, style, className }) => {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    // Load Unicorn Studio library
    if (!window.UnicornStudio) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.3/dist/unicornStudio.umd.js';
      script.async = true;
      script.onload = () => {
        if (window.UnicornStudio) {
          window.UnicornStudio.init();
          initAnimation();
        }
      };
      document.body.appendChild(script);
    } else {
      initAnimation();
    }

    function initAnimation() {
      if (containerRef.current && window.UnicornStudio && animationData) {
        try {
          // Create instance from JSON data
          instanceRef.current = window.UnicornStudio.createFromJSON(
            containerRef.current,
            animationData
          );
        } catch (error) {
          console.error('Error initializing Unicorn Studio animation:', error);
        }
      }
    }

    return () => {
      // Cleanup
      if (instanceRef.current && instanceRef.current.destroy) {
        instanceRef.current.destroy();
      }
    };
  }, [animationData]);

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        height: '100%',
        ...style
      }}
      className={className}
    />
  );
};

export default UnicornAnimation;
