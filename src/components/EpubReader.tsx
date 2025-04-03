
import React, { useState, useEffect, useRef } from 'react';
import { Book as EpubType } from 'epubjs';
import ePub from 'epubjs';
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Settings, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import WordTooltip from './WordTooltip';
import { translateWord, cleanWord, type Dictionary } from '@/utils/dictionaryLoader';

interface EpubReaderProps {
  bookId: string;
  onClose?: () => void;
}

interface WordPosition {
  x: number;
  y: number;
}

interface ReaderSettings {
  fontSize: number;
  lineHeight: string;
  theme: 'light' | 'dark' | 'sepia';
}

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: '1.5',
  theme: 'light',
};

const EpubReader: React.FC<EpubReaderProps> = ({ bookId, onClose }) => {
  const [book, setBook] = useState<EpubType | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [title, setTitle] = useState('Loading book...');
  const [selectedWord, setSelectedWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<WordPosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);

  // Load book from IndexedDB
  useEffect(() => {
    const loadBook = async () => {
      try {
        setIsLoading(true);
        
        // Get book from IndexedDB
        const bookData = await getBookFromIndexedDB(bookId);
        
        if (!bookData || !bookData.file) {
          toast.error('Book not found');
          if (onClose) onClose();
          return;
        }
        
        setBookFile(bookData.file);
        
        // Check if we have a saved reading position
        const savedCfi = localStorage.getItem(`epub-cfi-${bookId}`);
        if (savedCfi) {
          setCurrentCfi(savedCfi);
        }
        
        // Load reader settings
        const savedSettings = localStorage.getItem('epub-reader-settings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
        
        // Update last opened date
        await updateBookLastOpened(bookId);
        
      } catch (error) {
        console.error('Error loading book:', error);
        toast.error('Failed to load book');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBook();
  }, [bookId, onClose]);

  // Initialize EPUB reader once we have the book file
  useEffect(() => {
    if (!bookFile || !viewerRef.current) return;
    
    const initializeEpubReader = async () => {
      try {
        // Create a blob URL for the file
        const bookUrl = URL.createObjectURL(bookFile);
        
        // Initialize EPUB.js book
        const epubBook = ePub(bookUrl);
        setBook(epubBook);
        
        // Get book metadata
        epubBook.loaded.metadata.then((metadata: any) => {
          setTitle(metadata.title || 'Untitled Book');
        });
        
        // Create rendition
        const rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
        });
        
        // Apply current settings
        applyReaderSettings(rendition, settings);
        
        // Setup event listeners for word selection
        rendition.on('selected', (cfiRange: any, contents: any) => {
          const selection = contents.window.getSelection();
          const text = selection?.toString().trim();
          
          if (text && text.length > 0) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();
            
            if (rect) {
              handleWordSelection(text, {
                x: rect.left + (rect.width / 2),
                y: rect.bottom
              });
            }
            
            // Clear selection
            selection?.removeAllRanges();
          }
        });
        
        // Load current location or start from beginning
        if (currentCfi) {
          rendition.display(currentCfi);
        } else {
          rendition.display();
        }
        
        // Store the rendition for later use
        renditionRef.current = rendition;
        
        // Setup keyboard event listeners
        document.addEventListener('keydown', handleKeyDown);
        
      } catch (error) {
        console.error('Error initializing EPUB reader:', error);
        toast.error('Failed to load book');
      }
    };
    
    initializeEpubReader();
    
    return () => {
      if (book) {
        book.destroy();
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookFile, settings]);

  // Apply reader settings to the rendition
  const applyReaderSettings = (rendition: any, settings: ReaderSettings) => {
    if (!rendition) return;
    
    // Apply font size
    rendition.themes.fontSize(`${settings.fontSize}px`);
    
    // Apply line height
    rendition.themes.override('line-height', settings.lineHeight);
    
    // Apply theme
    if (settings.theme === 'dark') {
      rendition.themes.override('color', '#ffffff');
      rendition.themes.override('background', '#121212');
    } else if (settings.theme === 'sepia') {
      rendition.themes.override('color', '#5f4b32');
      rendition.themes.override('background', '#fbf0d9');
    } else {
      rendition.themes.override('color', '#000000');
      rendition.themes.override('background', '#ffffff');
    }
  };

  // Save settings to localStorage
  const saveSettings = (newSettings: ReaderSettings) => {
    localStorage.setItem('epub-reader-settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    
    if (renditionRef.current) {
      applyReaderSettings(renditionRef.current, newSettings);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goToNextPage();
    } else if (e.key === 'ArrowLeft') {
      goToPrevPage();
    }
  };

  // Navigation functions
  const goToNextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
      saveCurrentLocation();
    }
  };
  
  const goToPrevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
      saveCurrentLocation();
    }
  };

  // Save the current reading position
  const saveCurrentLocation = () => {
    if (renditionRef.current) {
      const currentLocation = renditionRef.current.currentLocation();
      if (currentLocation && currentLocation.start) {
        const cfi = currentLocation.start.cfi;
        setCurrentCfi(cfi);
        localStorage.setItem(`epub-cfi-${bookId}`, cfi);
        
        // Update progress
        updateBookProgress(bookId, renditionRef.current);
      }
    }
  };

  // Handle word selection for translation
  const handleWordSelection = async (word: string, position: WordPosition) => {
    // If clicking the same word, close the tooltip
    if (word === selectedWord && showTooltip) {
      setShowTooltip(false);
      setSelectedWord("");
      return;
    }
    
    // Close settings panel if open
    if (showSettings) {
      setShowSettings(false);
    }
    
    // Set word and position immediately to show the tooltip
    setSelectedWord(word);
    setTooltipPosition(position);
    setShowTooltip(true);
    
    // Show loading state in the tooltip
    setIsTranslating(true);
    setTranslation("Translating...");
    
    try {
      // Get real-time translation
      const translatedWord = await translateWord(word);
      setTranslation(translatedWord);
    } catch (error) {
      console.error("Translation error:", error);
      setTranslation("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Close tooltip
  const closeTooltip = () => {
    setShowTooltip(false);
  };
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
    // Close tooltip if open
    if (showTooltip) {
      setShowTooltip(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.theme === 'dark' ? 'bg-gray-900' : 
      settings.theme === 'sepia' ? 'bg-[#f5edd6]' : 'bg-white'}`}>
      {/* Reader Header */}
      <header className={`py-3 px-4 flex justify-between items-center border-b ${
        settings.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 
        settings.theme === 'sepia' ? 'bg-[#efe6d0] border-[#e7d7b6] text-[#5f4b32]' : 
        'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 transition-colors"
              aria-label="Close reader"
            >
              <X size={20} />
            </button>
          )}
          <h1 className="text-lg font-medium truncate max-w-[200px] sm:max-w-xs">{title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSettings}
            className={`p-2 rounded-full transition-colors ${
              showSettings ? 'bg-black/10' : 'hover:bg-black/10'
            }`}
            aria-label="Reader settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>
      
      {/* Reader Content */}
      <div className="flex-1 flex flex-col relative">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className={`text-${settings.theme === 'dark' ? 'white' : 'gray-600'}`}>
                Loading book...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* EPUB Viewer */}
            <div className="flex-1 relative overflow-hidden" ref={viewerRef}></div>
            
            {/* Navigation Controls */}
            <div className="flex justify-between p-4 absolute bottom-0 left-0 right-0 pointer-events-none">
              <button
                onClick={goToPrevPage}
                className={`p-3 rounded-full ${
                  settings.theme === 'dark' ? 'bg-gray-800 text-white' : 
                  settings.theme === 'sepia' ? 'bg-[#efe6d0] text-[#5f4b32]' : 
                  'bg-white text-gray-800'
                } shadow-lg pointer-events-auto`}
                aria-label="Previous page"
              >
                <ArrowLeft size={20} />
              </button>
              
              <button
                onClick={goToNextPage}
                className={`p-3 rounded-full ${
                  settings.theme === 'dark' ? 'bg-gray-800 text-white' : 
                  settings.theme === 'sepia' ? 'bg-[#efe6d0] text-[#5f4b32]' : 
                  'bg-white text-gray-800'
                } shadow-lg pointer-events-auto`}
                aria-label="Next page"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}
        
        {/* Word Translation Tooltip */}
        {showTooltip && (
          <WordTooltip 
            word={selectedWord} 
            translation={translation}
            position={tooltipPosition}
            isLoading={isTranslating}
            onClose={closeTooltip}
          />
        )}
        
        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute right-4 top-2 w-72 rounded-lg shadow-lg border ${
              settings.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 
              settings.theme === 'sepia' ? 'bg-[#efe6d0] border-[#e7d7b6] text-[#5f4b32]' : 
              'bg-white border-gray-200 text-gray-800'
            } p-4 z-50`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Reader Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Font Size Control */}
              <div>
                <label className="text-sm font-medium mb-2 block">Font Size</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => saveSettings({ ...settings, fontSize: Math.max(12, settings.fontSize - 2) })}
                    className="p-1 rounded hover:bg-black/10 transition-colors"
                  >
                    <span className="text-lg">A-</span>
                  </button>
                  
                  <input
                    type="range"
                    min="12"
                    max="32"
                    step="2"
                    value={settings.fontSize}
                    onChange={(e) => saveSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  
                  <button
                    onClick={() => saveSettings({ ...settings, fontSize: Math.min(32, settings.fontSize + 2) })}
                    className="p-1 rounded hover:bg-black/10 transition-colors"
                  >
                    <span className="text-lg">A+</span>
                  </button>
                </div>
              </div>
              
              {/* Line Height Control */}
              <div>
                <label className="text-sm font-medium mb-2 block">Line Spacing</label>
                <div className="flex gap-2">
                  {['1.0', '1.5', '2.0'].map((height) => (
                    <button
                      key={height}
                      onClick={() => saveSettings({ ...settings, lineHeight: height })}
                      className={`flex-1 py-2 rounded ${
                        settings.lineHeight === height 
                          ? 'bg-primary text-white' 
                          : 'bg-black/5 hover:bg-black/10'
                      }`}
                    >
                      {height}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Theme Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => saveSettings({ ...settings, theme: 'light' })}
                    className={`py-2 rounded flex flex-col items-center ${
                      settings.theme === 'light' ? 'ring-2 ring-primary' : 'hover:bg-black/5'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-300 mb-1"></div>
                    <span className="text-xs">Light</span>
                  </button>
                  
                  <button
                    onClick={() => saveSettings({ ...settings, theme: 'sepia' })}
                    className={`py-2 rounded flex flex-col items-center ${
                      settings.theme === 'sepia' ? 'ring-2 ring-primary' : 'hover:bg-black/5'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#fbf0d9] border border-[#e7d7b6] mb-1"></div>
                    <span className="text-xs">Sepia</span>
                  </button>
                  
                  <button
                    onClick={() => saveSettings({ ...settings, theme: 'dark' })}
                    className={`py-2 rounded flex flex-col items-center ${
                      settings.theme === 'dark' ? 'ring-2 ring-primary' : 'hover:bg-black/5'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 mb-1"></div>
                    <span className="text-xs">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Helper functions for IndexedDB operations
async function getBookFromIndexedDB(bookId: string) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const getRequest = store.get(bookId);
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to retrieve book from IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

async function updateBookLastOpened(bookId: string) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      
      // Get the book first
      const getRequest = store.get(bookId);
      
      getRequest.onsuccess = () => {
        const book = getRequest.result;
        if (book) {
          book.lastOpened = new Date();
          const updateRequest = store.put(book);
          
          updateRequest.onsuccess = () => {
            resolve(true);
          };
          
          updateRequest.onerror = () => {
            reject(new Error('Failed to update book in IndexedDB'));
          };
        } else {
          reject(new Error('Book not found'));
        }
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to retrieve book from IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

async function updateBookProgress(bookId: string, rendition: any) {
  if (!rendition) return;
  
  try {
    // Calculate progress percentage
    const currentLocation = rendition.currentLocation();
    if (!currentLocation || !currentLocation.start) return;
    
    const progress = Math.floor(currentLocation.start.percentage * 100);
    
    // Update in IndexedDB
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      
      // Get the book first
      const getRequest = store.get(bookId);
      
      getRequest.onsuccess = () => {
        const book = getRequest.result;
        if (book) {
          book.progress = progress;
          store.put(book);
        }
      };
    };
  } catch (error) {
    console.error('Error updating book progress:', error);
  }
}

export default EpubReader;
