
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { loadDictionary, getTranslation, cleanWord, type Dictionary } from '@/utils/dictionaryLoader';
import WordTooltip from './WordTooltip';
import LoadingScreen from './LoadingScreen';
import sampleText from '@/assets/sample';

interface WordPosition {
  x: number;
  y: number;
}

const Reader: React.FC = () => {
  const [dictionary, setDictionary] = useState<Dictionary>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedWord, setSelectedWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState<WordPosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load dictionary on component mount
  useEffect(() => {
    const fetchDictionary = async () => {
      try {
        // Simulate loading progress
        const interval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 95) {
              clearInterval(interval);
              return prev;
            }
            return prev + Math.random() * 15;
          });
        }, 200);
        
        // Actually load the dictionary
        const dict = await loadDictionary();
        setDictionary(dict);
        
        // Clear interval and set progress to 100%
        clearInterval(interval);
        setLoadingProgress(100);
        
        // Short delay to show 100% before hiding loading screen
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Dictionary loaded successfully", {
            description: "Click on any word to see its translation",
          });
        }, 300);
      } catch (error) {
        console.error("Failed to load dictionary:", error);
        setIsLoading(false);
        toast.error("Error loading dictionary", {
          description: "Some translations might not be available offline",
        });
      }
    };

    fetchDictionary();
  }, []);

  // Process text into words with special formatting
  const processedText = useMemo(() => {
    const paragraphs = sampleText.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      const words = paragraph.split(/(\s+)/);
      
      return (
        <p key={pIndex} className="mb-6 leading-relaxed">
          {words.map((word, wIndex) => {
            // Don't make spaces clickable
            if (word.trim() === '') {
              return <span key={`${pIndex}-${wIndex}`}>{word}</span>;
            }
            
            return (
              <span
                key={`${pIndex}-${wIndex}`}
                className={`reader-word ${selectedWord === cleanWord(word) ? 'selected' : ''}`}
                onClick={(e) => handleWordClick(e, word)}
              >
                {word}
              </span>
            );
          })}
        </p>
      );
    });
  }, [sampleText, selectedWord]);

  // Handle word click to show translation
  const handleWordClick = (
    event: React.MouseEvent<HTMLSpanElement>, 
    word: string
  ) => {
    event.stopPropagation();
    const cleanedWord = cleanWord(word);
    
    if (cleanedWord === selectedWord && showTooltip) {
      // If clicking the same word, close the tooltip
      setShowTooltip(false);
      setSelectedWord("");
      return;
    }
    
    // Get word position for tooltip placement
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + (rect.width / 2),
      y: rect.bottom
    };

    // Get translation and update state
    const translatedWord = getTranslation(word, dictionary);
    setSelectedWord(cleanedWord);
    setTranslation(translatedWord);
    setTooltipPosition(position);
    setShowTooltip(true);
  };

  // Close tooltip
  const closeTooltip = () => {
    setShowTooltip(false);
  };

  // Close tooltip on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current && 
        !contentRef.current.contains(event.target as Node)
      ) {
        closeTooltip();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="min-h-screen bg-reader-background pb-24">
      <motion.div 
        className="max-w-2xl mx-auto bg-reader-paper text-reader-text p-8 md:p-12 rounded-lg shadow-medium my-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        ref={contentRef}
      >
        <div className="prose prose-lg max-w-none">
          {processedText}
        </div>
      </motion.div>

      {showTooltip && (
        <WordTooltip 
          word={selectedWord} 
          translation={translation}
          position={tooltipPosition}
          onClose={closeTooltip}
        />
      )}
    </div>
  );
};

export default Reader;
