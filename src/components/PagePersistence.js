'use client';

import { useEffect } from 'react';

// Custom hook for page persistence
export const usePagePersistence = (currentPage, shouldCheckRedirect = false) => {
  useEffect(() => {
    // Always save the current page
    localStorage.setItem('currentPage', currentPage);
    
    // Optional: Check for saved preference and redirect (only on main page)
    if (shouldCheckRedirect && currentPage === 'main') {
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage && savedPage !== 'main') {
        // Add a small delay to avoid hydration issues
        setTimeout(() => {
          if (savedPage === 'admin') {
            window.location.href = '/admin';
          } else if (savedPage === 'data') {
            window.location.href = '/download';
          }
        }, 100);
      }
    }
  }, [currentPage, shouldCheckRedirect]);
};

// Helper to get the last visited page
export const getLastVisitedPage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('currentPage') || 'main';
  }
  return 'main';
};

// Helper to clear persistence
export const clearPagePersistence = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentPage');
  }
}; 