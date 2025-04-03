
import React, { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { translateWord, cleanWord, type Dictionary } from '@/utils/dictionaryLoader';
import WordTooltip from './WordTooltip';
import LoadingScreen from './LoadingScreen';
import type { BookInfo } from '@/types/book';

// Add CSS for ePub.js to work properly
const epubStyles = `
  .epub-container {
    min-height: 500px;
    height: calc(100vh - 200px);
    width: 100%;
    background: white;
    margin: 0 auto;
    position: relative;
  }
`;

interface WordPosition {
  x: number;
  y: number;
}

interface EpubReaderProps {
  bookId: string;
  onClose: () => void;
}

const EpubReader: React.FC<EpubReaderProps> = ({ bookId, onClose }) => {
  const [book, setBook] = useState<any>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [bookData, setBookData] = useState<BookInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedWord, setSelectedWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<WordPosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Load the book from IndexedDB
  useEffect(() => {
    const loadBook = async () => {
      try {
        // Simulate loading progress
        const loadingInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) {
              clearInterval(loadingInterval);
              return prev;
            }
            return prev + Math.random() * 10;
          });
        }, 100);
        
        const request = indexedDB.open('epubLibraryDB', 1);
        
        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['books'], 'readonly');
          const store = transaction.objectStore('books');
          const bookRequest = store.get(bookId);
          
          bookRequest.onsuccess = async () => {
            if (bookRequest.result) {
              const bookData = bookRequest.result as BookInfo;
              setBookData(bookData);
              
              // Load the EPUB.js library dynamically
              const ePub = (await import('epubjs')).default;
              
              // Create a blob URL from the file
              const bookBlob = new Blob([bookData.file], { type: 'application/epub+zip' });
              const bookUrl = URL.createObjectURL(bookBlob);
              
              // Create the book
              const epubBook = ePub(bookUrl);
              setBook(epubBook);
              
              // Show loading progress
              clearInterval(loadingInterval);
              setLoadingProgress(100);
              
              setTimeout(() => {
                setIsLoading(false);
              }, 300);
            } else {
              toast.error('Book not found in database');
              onClose();
            }
          };
          
          bookRequest.onerror = () => {
            toast.error('Failed to retrieve book from database');
            onClose();
            clearInterval(loadingInterval);
          };
        };
        
        request.onerror = () => {
          toast.error('Failed to open book database');
          onClose();
          clearInterval(loadingInterval);
        };
      } catch (error) {
        console.error('Error loading book:', error);
        toast.error('Failed to load book');
        onClose();
      }
    };
    
    loadBook();
  }, [bookId, onClose]);
  
  // Initialize rendition once book is loaded
  useEffect(() => {
    if (!book || !viewerRef.current || isLoading) return;
    
    const initializeRenderer = async () => {
      try {
        // Create rendition
        const bookRendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'auto',
          flow: 'paginated'
        });
        
        setRendition(bookRendition);
        
        // Load saved position or start from beginning
        try {
          const savedCfi = localStorage.getItem(`book-position-${bookId}`);
          if (savedCfi) {
            bookRendition.display(savedCfi);
          } else {
            bookRendition.display();
          }
        } catch (e) {
          console.error('Error displaying saved position:', e);
          bookRendition.display();
        }
        
        // Add event listeners for word selection
        bookRendition.on('selected', (cfiRange: string, contents: any) => {
          const selection = contents.window.getSelection();
          const selectedText = selection.toString().trim();
          
          if (selectedText && selectedText.length > 0) {
            handleWordSelection(selectedText, selection);
          }
        });
        
        // Update progress when changing pages
        bookRendition.on('relocated', (location: any) => {
          const progress = book.locations.percentageFromCfi(location.start.cfi);
          const progressPercent = Math.floor(progress * 100);
          
          // Save position
          localStorage.setItem(`book-position-${bookId}`, location.start.cfi);
          
          // Update progress in IndexedDB
          updateReadingProgress(progressPercent);
        });
        
        // Generate locations for better progress calculation
        if (!book.locations.length()) {
          book.locations.generate();
        }
      } catch (error) {
        console.error('Error initializing renderer:', error);
        toast.error('Failed to initialize book reader');
      }
    };
    
    initializeRenderer();
    
    // Cleanup function
    return () => {
      if (book) {
        book.destroy();
      }
    };
  }, [book, isLoading, bookId]);
  
  // Handle word selection for translation
  const handleWordSelection = (text: string, selection: any) => {
    try {
      // Get selection position for tooltip
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const cleanedWord = cleanWord(text);
      
      if (cleanedWord === selectedWord && showTooltip) {
        setShowTooltip(false);
        setSelectedWord("");
        return;
      }
      
      // Calculate position for the tooltip
      const position = {
        x: rect.left + (rect.width / 2),
        y: rect.bottom
      };
      
      setSelectedWord(cleanedWord);
      setTooltipPosition(position);
      setShowTooltip(true);
      
      // Set loading state and get translation
      setIsTranslating(true);
      setTranslation("Translating...");
      
      translateWord(text).then((result) => {
        setTranslation(result);
        setIsTranslating(false);
      }).catch((error) => {
        console.error('Translation error:', error);
        setTranslation("Translation failed");
        setIsTranslating(false);
      });
    } catch (error) {
      console.error('Error handling word selection:', error);
    }
  };
  
  // Update reading progress in the database
  const updateReadingProgress = (progress: number) => {
    try {
      const request = indexedDB.open('epubLibraryDB', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        
        const getRequest = store.get(bookId);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const bookData = getRequest.result;
            bookData.progress = progress;
            bookData.lastOpened = new Date();
            
            store.put(bookData);
          }
        };
      };
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };
  
  // Navigation functions
  const goToPreviousPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };
  
  const goToNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };
  
  // Close tooltip
  const closeTooltip = () => {
    setShowTooltip(false);
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!rendition) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          rendition.prev();
          break;
        case 'ArrowRight':
          rendition.next();
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rendition]);
  
  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }
  
  return (
    <div className="min-h-screen bg-reader-background">
      <style>{epubStyles}</style>
      
      {/* Header */}
      <div className="bg-card shadow-sm border-b p-4 flex justify-between items-center sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        
        <div className="font-medium truncate mx-2">
          {bookData?.title || 'Reading Book'}
        </div>
        
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      {/* EPUB Viewer */}
      <div className="container py-6 max-w-3xl mx-auto">
        <div ref={viewerRef} className="epub-container shadow-lg rounded-md"></div>
        
        {/* Navigation Controls */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousPage}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextPage}
            className="rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Translation Tooltip */}
      {showTooltip && (
        <WordTooltip
          word={selectedWord}
          translation={translation}
          position={tooltipPosition}
          isLoading={isTranslating}
          onClose={closeTooltip}
        />
      )}
    </div>
  );
};

export default EpubReader;
