'use client';

import { useState, useEffect } from 'react';

const NavigationToggle = ({ currentPage }) => {
  const [activePage, setActivePage] = useState(currentPage);

  useEffect(() => {
    // Save current page to localStorage for persistence
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    // Initialize active page from current page
    setActivePage(currentPage);
  }, [currentPage]);

  const navigateToPage = (page) => {
    setActivePage(page);
    localStorage.setItem('currentPage', page);
    
    // Navigate to the page
    if (page === 'main') {
      window.location.href = '/';
    } else if (page === 'admin') {
      window.location.href = '/admin';
    } else if (page === 'data') {
      window.location.href = '/download';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button
        onClick={() => navigateToPage('main')}
        className={`px-4 py-2 rounded-lg transition-all duration-200 text-center text-sm sm:text-base transform hover:scale-105 active:scale-95 ${
          activePage === 'main' 
            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' 
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        🏠 Main Page
      </button>
      <button
        onClick={() => navigateToPage('admin')}
        className={`px-4 py-2 rounded-lg transition-all duration-200 text-center text-sm sm:text-base transform hover:scale-105 active:scale-95 ${
          activePage === 'admin' 
            ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-400' 
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        ✍️ Admin Panel
      </button>
      <button
        onClick={() => navigateToPage('data')}
        className={`px-4 py-2 rounded-lg transition-all duration-200 text-center text-sm sm:text-base transform hover:scale-105 active:scale-95 ${
          activePage === 'data' 
            ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400' 
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        📊 View Data
      </button>
    </div>
  );
};

export default NavigationToggle; 