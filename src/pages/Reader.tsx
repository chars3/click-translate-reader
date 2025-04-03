
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import EpubReader from '@/components/EpubReader';
import LoadingScreen from '@/components/LoadingScreen';

const ReaderPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const checkBook = async () => {
      if (!bookId) {
        console.error("Book ID is missing");
        toast.error('Book ID is missing');
        navigate('/library');
        return;
      }
      
      try {
        console.log(`Checking if book exists: ${bookId}`);
        // Check if book exists in IndexedDB
        const request = indexedDB.open('epubLibraryDB', 1);
        
        request.onsuccess = (event) => {
          console.log("IndexedDB opened successfully");
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['books'], 'readonly');
          const store = transaction.objectStore('books');
          const getRequest = store.get(bookId);
          
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              console.log("Book found in database");
              setExists(true);
            } else {
              console.error("Book not found in database");
              toast.error('Book not found');
              navigate('/library');
            }
            setIsLoading(false);
          };
          
          getRequest.onerror = (error) => {
            console.error("Error checking book:", error);
            toast.error('Failed to check if book exists');
            navigate('/library');
          };
        };
        
        request.onerror = (error) => {
          console.error("Error opening database:", error);
          toast.error('Failed to open book database');
          navigate('/library');
        };
      } catch (error) {
        console.error('Error checking book:', error);
        toast.error('An error occurred');
        navigate('/library');
      }
    };
    
    checkBook();
  }, [bookId, navigate]);

  // Handle closing the reader
  const handleClose = () => {
    navigate('/library');
  };

  if (isLoading) {
    return <LoadingScreen progress={50} />;
  }

  if (!exists || !bookId) {
    return null; // Will navigate away in useEffect
  }

  console.log(`Rendering EpubReader with bookId: ${bookId}`);
  return <EpubReader bookId={bookId} onClose={handleClose} />;
};

export default ReaderPage;
