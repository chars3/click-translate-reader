
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Reader from '@/components/Reader';
import { Book } from 'lucide-react';

const Index = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col"
    >
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Click Translate Reader</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Read books with instant Portuguese translations - just click on any word to see its translation!
            </p>
            
            <div className="mt-6">
              <Link 
                to="/library" 
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 transition-colors"
              >
                <Book className="mr-2" size={20} />
                Go to Your Library
              </Link>
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 mb-8">
            <h2 className="text-xl font-semibold mb-2">Try the demo below</h2>
            <p className="text-muted-foreground">
              This demo shows how the translation works. Click on any word in the text below to see its Portuguese translation.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              For a complete experience with your own books, visit the Library.
            </p>
          </div>
          
          <Reader />
        </div>
      </main>
    </motion.div>
  );
};

export default Index;
