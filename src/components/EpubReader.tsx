
import React, { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { translateWord, isTranslating as isTranslatingWord } from '@/utils/dictionaryLoader';
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
  const [epubModule, setEpubModule] = useState<any>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Load the EPUB.js module first
  useEffect(() => {
    const loadEpubModule = async () => {
      try {
        console.log("Importing EPUB.js");
        const module = await import('epubjs');
        console.log("EPUB.js imported successfully:", module);
        setEpubModule(module.default);
      } catch (error) {
        console.error('Error importing EPUB.js:', error);
        toast.error('Failed to load EPUB reader module');
        onClose();
      }
    };
    
    loadEpubModule();
  }, [onClose]);
  
  // Load the book from IndexedDB once we have the EPUB module
  useEffect(() => {
    if (!epubModule) return;
    
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
        
        console.log("Opening IndexedDB for epubLibraryDB");
        const request = indexedDB.open('epubLibraryDB', 1);
        
        request.onsuccess = async (event) => {
          console.log("IndexedDB opened successfully");
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['books'], 'readonly');
          const store = transaction.objectStore('books');
          const bookRequest = store.get(bookId);
          
          bookRequest.onsuccess = async () => {
            console.log("Book request successful, fetched book:", bookRequest.result);
            if (bookRequest.result) {
              const bookData = bookRequest.result as BookInfo;
              setBookData(bookData);
              
              try {
                // Create a blob URL from the file
                console.log("Creating blob from file", bookData.file);
                const bookBlob = new Blob([bookData.file], { type: 'application/epub+zip' });
                const bookUrl = URL.createObjectURL(bookBlob);
                
                console.log("Creating EPUB book with URL:", bookUrl);
                const epubBook = epubModule(bookUrl);
                console.log("EPUB book created:", epubBook);
                setBook(epubBook);
                
                // Show loading progress
                clearInterval(loadingInterval);
                setLoadingProgress(100);
                
                setTimeout(() => {
                  setIsLoading(false);
                }, 300);
              } catch (err) {
                console.error('Error creating book:', err);
                toast.error('Failed to load book file');
                clearInterval(loadingInterval);
                onClose();
              }
            } else {
              console.error("Book not found in database");
              toast.error('Book not found in database');
              onClose();
              clearInterval(loadingInterval);
            }
          };
          
          bookRequest.onerror = (err) => {
            console.error("Book request error:", err);
            toast.error('Failed to retrieve book from database');
            onClose();
            clearInterval(loadingInterval);
          };
        };
        
        request.onerror = (err) => {
          console.error("IndexedDB open error:", err);
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
  }, [epubModule, bookId, onClose]);
  
  // Initialize rendition once book is loaded
  useEffect(() => {
    if (!book || !viewerRef.current || isLoading) {
      console.log("Not ready to initialize renderer:", { book: !!book, viewerRef: !!viewerRef.current, isLoading });
      return;
    }
    
    const initializeRenderer = async () => {
      try {
        console.log('Initializing renderer with book:', book);
        
        // Create rendition
        const bookRendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated'
        });
        
        console.log("Rendition created:", bookRendition);
        setRendition(bookRendition);
        
        // Load saved position or start from beginning
        try {
          console.log("Attempting to display content");
          const savedCfi = localStorage.getItem(`book-position-${bookId}`);
          console.log("Saved CFI:", savedCfi);
          
          if (savedCfi) {
            await bookRendition.display(savedCfi);
            console.log("Book displayed at saved position");
          } else {
            await bookRendition.display();
            console.log("Book displayed at beginning");
          }
        } catch (e) {
          console.error('Error displaying book:', e);
          try {
            console.log("Attempting to display at default position");
            // Try to display at the beginning if saved position fails
            await bookRendition.display();
          } catch (err) {
            console.error("Failed to display book:", err);
            toast.error("Failed to render book");
          }
        }
        
        // Add event listeners for word selection
        bookRendition.on('selected', (cfiRange: string, contents: any) => {
          try {
            console.log("Text selected:", cfiRange);
            const selection = contents.window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && selectedText.length > 0) {
              console.log("Selected text:", selectedText);
              handleWordSelection(selectedText, selection);
            }
          } catch (error) {
            console.error("Error handling selection:", error);
          }
        });
        
        // Update progress when changing pages
        bookRendition.on('relocated', (location: any) => {
          try {
            console.log("Page relocated:", location);
            if (book.locations && typeof book.locations.percentageFromCfi === 'function') {
              const progress = book.locations.percentageFromCfi(location.start.cfi);
              const progressPercent = Math.floor(progress * 100);
              console.log("Reading progress:", progressPercent);
              
              // Save position
              localStorage.setItem(`book-position-${bookId}`, location.start.cfi);
              
              // Update progress in IndexedDB
              updateReadingProgress(progressPercent);
            }
          } catch (error) {
            console.error("Error handling relocation:", error);
          }
        });
        
        // Generate locations for better progress calculation
        try {
          if (book.locations && typeof book.locations.generate === 'function' && !book.locations.length()) {
            console.log("Generating locations for progress tracking");
            book.locations.generate();
          }
        } catch (error) {
          console.error("Error generating locations:", error);
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
        console.log("Cleaning up book instance");
        try {
          book.destroy();
        } catch (error) {
          console.error("Error destroying book:", error);
        }
      }
    };
  }, [book, isLoading, bookId]);
  
  // Handle word selection for translation
  const handleWordSelection = (text: string, selection: any) => {
    try {
      // Get selection position for tooltip
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const cleanedWord = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      
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
        console.log("Translation result:", result);
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
  
  // Navigation functions with safety checks
  const goToPreviousPage = () => {
    if (rendition && typeof rendition.prev === 'function') {
      console.log("Going to previous page");
      try {
        rendition.prev();
      } catch (error) {
        console.error("Error navigating to previous page:", error);
        toast.error("Failed to navigate to previous page");
      }
    } else {
      console.warn("Navigation not available yet");
    }
  };
  
  const goToNextPage = () => {
    if (rendition && typeof rendition.next === 'function') {
      console.log("Going to next page");
      try {
        rendition.next();
      } catch (error) {
        console.error("Error navigating to next page:", error);
        toast.error("Failed to navigate to next page");
      }
    } else {
      console.warn("Navigation not available yet");
    }
  };
  
  // Close tooltip
  const closeTooltip = () => {
    setShowTooltip(false);
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!rendition || typeof rendition.prev !== 'function' || typeof rendition.next !== 'function') return;
      
      try {
        switch (e.key) {
          case 'ArrowLeft':
            console.log("Left arrow pressed, going to previous page");
            rendition.prev();
            break;
          case 'ArrowRight':
            console.log("Right arrow pressed, going to next page");
            rendition.next();
            break;
          default:
            break;
        }
      } catch (error) {
        console.error("Error handling keyboard navigation:", error);
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
    <div className="min-h-screen bg-background">
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
        <div ref={viewerRef} className="epub-container shadow-lg rounded-md bg-white"></div>
        
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
