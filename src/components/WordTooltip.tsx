
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordTooltipProps {
  word: string;
  translation: string;
  position: { x: number; y: number };
  isLoading?: boolean;
  onClose: () => void;
}

const WordTooltip: React.FC<WordTooltipProps> = ({ 
  word, 
  translation, 
  position, 
  isLoading = false,
  onClose 
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close tooltip when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Position adjustments
  const getPosition = () => {
    if (!tooltipRef.current) return position;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get tooltip dimensions
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    
    // Default position
    let x = position.x;
    let y = position.y + 20;  // Add some space below the word
    
    // Adjust if tooltip would go off the right edge
    if (x + tooltipWidth > viewportWidth - 20) {
      x = viewportWidth - tooltipWidth - 20;
    }
    
    // Adjust if tooltip would go off the bottom edge
    if (y + tooltipHeight > viewportHeight - 20) {
      y = position.y - tooltipHeight - 10;  // Position above the word
    }
    
    return { x, y };
  };
  
  const adjustedPosition = getPosition();

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        className="reader-tooltip"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">From English:</span>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Close translation"
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-muted-foreground"
              >
                <path 
                  d="M18 6L6 18M6 6L18 18" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          
          <div className="font-medium">{word}</div>
          
          <div className="h-px w-full bg-border"></div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">To Portuguese:</span>
          </div>
          
          <div className="font-medium">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-muted-foreground">Translating...</span>
              </div>
            ) : translation === "Translation not found" ? (
              <span className="text-muted-foreground italic">
                Translation not available
              </span>
            ) : (
              translation
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WordTooltip;
