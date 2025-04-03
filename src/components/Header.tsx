
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Book, BookOpen } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">Click Translate</span>
              </Link>
            </div>
            <nav className="ml-6 flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Demo Text
              </Link>
              <Link
                to="/library"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  location.pathname === '/library' || location.pathname.includes('/reader/')
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Book size={16} className="mr-1" />
                Library
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
