
import React from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Reader from '@/components/Reader';

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
        <Reader />
      </main>
    </motion.div>
  );
};

export default Index;
