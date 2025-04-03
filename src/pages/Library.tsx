
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Book, X, Upload, Plus } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from "sonner";

type BookInfo = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress: number;
  lastOpened: Date;
  file: File;
};

const Library = () => {
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load books from IndexedDB on component mount
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const storedBooks = await getStoredBooks();
        setBooks(storedBooks);
      } catch (error) {
        console.error('Failed to load books:', error);
        toast.error('Failed to load your library');
      }
    };

    loadBooks();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.epub')) {
          // Create a book object
          const bookId = `book_${Date.now()}_${i}`;
          const book: BookInfo = {
            id: bookId,
            title: file.name.replace('.epub', ''),
            author: 'Unknown Author',
            coverUrl: '/placeholder.svg',
            progress: 0,
            lastOpened: new Date(),
            file: file
          };

          // Store book in IndexedDB
          await storeBook(book);
          
          // Update UI
          setBooks(prevBooks => [...prevBooks, book]);
          toast.success(`Added "${book.title}" to your library`);
        } else {
          toast.error(`${file.name} is not a valid EPUB file`);
        }
      }
    } catch (error) {
      console.error('Error uploading books:', error);
      toast.error('Failed to add books to your library');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    try {
      await removeBook(bookId);
      setBooks(books.filter(book => book.id !== bookId));
      toast.success('Book removed from your library');
    } catch (error) {
      console.error('Error removing book:', error);
      toast.error('Failed to remove book');
    }
  };

  return (
    <div className="min-h-screen bg-reader-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Your Library</h1>
            <label 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Upload size={18} />
              <span>Add Books</span>
              <input 
                type="file" 
                accept=".epub" 
                multiple 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              <Book size={48} className="mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your library is empty</h2>
              <p className="text-muted-foreground mb-6">Upload EPUB books to start reading with instant translation</p>
              <label className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors">
                <Plus size={18} />
                <span>Add Your First Book</span>
                <input 
                  type="file" 
                  accept=".epub" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map(book => (
                <div key={book.id} className="bg-card rounded-lg border border-border overflow-hidden group relative">
                  <button 
                    onClick={() => handleRemoveBook(book.id)}
                    className="absolute top-2 right-2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove book"
                  >
                    <X size={16} />
                  </button>
                  <Link to={`/reader/${book.id}`} className="block">
                    <div className="aspect-[2/3] bg-muted relative">
                      <img 
                        src={book.coverUrl} 
                        alt={`Cover of ${book.title}`}
                        className="w-full h-full object-cover"
                      />
                      {book.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      {book.progress > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {book.progress}% completed
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

// IndexedDB utility functions
async function getStoredBooks(): Promise<BookInfo[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
      
      getAllRequest.onerror = () => {
        reject(new Error('Failed to retrieve books from IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

async function storeBook(book: BookInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const addRequest = store.put(book);
      
      addRequest.onsuccess = () => {
        resolve();
      };
      
      addRequest.onerror = () => {
        reject(new Error('Failed to store book in IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

async function removeBook(bookId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('epubLibraryDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const deleteRequest = store.delete(bookId);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = () => {
        reject(new Error('Failed to remove book from IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

export default Library;
