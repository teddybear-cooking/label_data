'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import NavigationToggle from '../components/NavigationToggle';
import { usePagePersistence } from '../components/PagePersistence';

// Simple category display component with color and percentage
const CategoryDisplay = ({ category, percentage = 0, isLoading = false }) => {
  const getColor = (category) => {
    const colors = {
      'normal': '#10b981',
      'hate speech': '#ef4444',
      'offensive': '#f59e0b',
      'religious hate': '#8b5cf6',
      'political hate': '#3b82f6'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="flex items-center space-x-1 sm:space-x-2 bg-[#1e4558]/80 px-2 py-1 rounded-lg border border-slate-500">
      {/* Color indicator */}
      <div 
        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
        style={{ backgroundColor: getColor(category) }}
      ></div>
      {/* Category name */}
      <span className="text-xs sm:text-sm font-medium text-gray-200 capitalize">
        {category}
      </span>
      {/* Percentage */}
      <span className="text-xs sm:text-sm font-bold text-gray-300">
        {isLoading ? '...' : `${percentage}%`}
      </span>
    </div>
  );
};

export default function Home() {
  const [textInput, setTextInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [predictions, setPredictions] = useState({
    'normal': 0,
    'hate speech': 0,
    'offensive': 0,
    'religious hate': 0,
    'political hate': 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // State for readonly sentence section
  const [readonlyText, setReadonlyText] = useState('');
  const [readonlyCategory, setReadonlyCategory] = useState('');
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [currentSentenceId, setCurrentSentenceId] = useState(null);
  
  // Add loading states for save operations
  const [isSavingMain, setIsSavingMain] = useState(false);
  const [isSavingReadonly, setIsSavingReadonly] = useState(false);

  // Add state for next sentence
  const [nextSentence, setNextSentence] = useState(null);
  const [isLoadingNextSentence, setIsLoadingNextSentence] = useState(false);

  // Categories array for quick access
  const categories = ['normal', 'hate speech', 'offensive', 'religious hate', 'political hate'];

  // Use page persistence hook
  usePagePersistence('main');

  // Load persisted sentence data on mount
  useEffect(() => {
    const savedSentence = localStorage.getItem('currentSentence');
    const savedSentenceId = localStorage.getItem('currentSentenceId');
    const savedCategory = localStorage.getItem('currentSentenceCategory');
    
    if (savedSentence && savedSentenceId) {
      setReadonlyText(savedSentence);
      setCurrentSentenceId(parseInt(savedSentenceId));
      if (savedCategory) {
        setReadonlyCategory(savedCategory);
      }
    }
  }, []);

  // Save sentence data to localStorage whenever it changes
  useEffect(() => {
    if (readonlyText && currentSentenceId) {
      localStorage.setItem('currentSentence', readonlyText);
      localStorage.setItem('currentSentenceId', currentSentenceId.toString());
      localStorage.setItem('currentSentenceCategory', readonlyCategory || '');
    }
  }, [readonlyText, currentSentenceId, readonlyCategory]);

  // Function to fetch next sentence in background
  const prefetchNextSentence = useCallback(async () => {
    if (isLoadingNextSentence) return;
    
    setIsLoadingNextSentence(true);
    try {
      const response = await fetch('/api/fetch-sentence');
      if (!response.ok) {
        throw new Error('Failed to fetch next sentence');
      }
      const result = await response.json();
      
      if (result.success && result.sentence) {
        setNextSentence({
          text: result.sentence,
          id: result.sentenceId
        });
      } else {
        setNextSentence(null);
      }
    } catch (error) {
      console.error('Error prefetching next sentence:', error);
      setNextSentence(null);
    } finally {
      setIsLoadingNextSentence(false);
    }
  }, [isLoadingNextSentence]);

  // Prefetch next sentence when component mounts
  useEffect(() => {
    if (!nextSentence && !isLoadingNextSentence) {
      prefetchNextSentence();
    }
  }, [nextSentence, isLoadingNextSentence, prefetchNextSentence]);

  // Handle category selection and immediate save
  const handleReadonlyCategorySelect = async (category) => {
    if (!readonlyText || readonlyText.includes('No sentences available') || 
        readonlyText.includes('Unable to load sentence') || isSavingReadonly) {
      return;
    }

    setIsSavingReadonly(true);
    setReadonlyCategory(category);

    // Store current values for potential rollback
    const currentText = readonlyText;
    const currentId = currentSentenceId;

    // Clear localStorage immediately
    localStorage.removeItem('currentSentence');
    localStorage.removeItem('currentSentenceId');
    localStorage.removeItem('currentSentenceCategory');

    // If we have a prefetched sentence, use it immediately
    if (nextSentence) {
      setReadonlyText(nextSentence.text);
      setCurrentSentenceId(nextSentence.id);
      setReadonlyCategory('');
      setNextSentence(null);
      // Start prefetching the next one
      prefetchNextSentence();
    }

    try {
      const requestData = { 
        text: currentText.trim(),
        label: category,
        sentenceId: currentId
      };

      const response = await fetch('/api/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Save operation failed');
      }

      // If we didn't have a prefetched sentence, fetch one now
      if (!nextSentence) {
        const nextSentenceResponse = await fetch('/api/fetch-sentence');
        if (!nextSentenceResponse.ok) {
          throw new Error('Failed to fetch next sentence');
        }
        const nextSentenceResult = await nextSentenceResponse.json();
        
        if (nextSentenceResult.success && nextSentenceResult.sentence) {
          setReadonlyText(nextSentenceResult.sentence);
          setCurrentSentenceId(nextSentenceResult.sentenceId);
          setReadonlyCategory('');
        } else {
          handleNextSentenceError(nextSentenceResult);
        }
      }
      
    } catch (error) {
      console.error('Error saving data:', error);
      // Rollback on error
      setReadonlyText(currentText);
      setCurrentSentenceId(currentId);
      setReadonlyCategory(category);
      // Restore localStorage
      localStorage.setItem('currentSentence', currentText);
      localStorage.setItem('currentSentenceId', currentId.toString());
      localStorage.setItem('currentSentenceCategory', category);
      setError('Failed to save. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSavingReadonly(false);
    }
  };

  // Skip current sentence
  const handleSkip = async () => {
    if (!readonlyText || readonlyText.includes('No sentences available') || 
        readonlyText.includes('Unable to load sentence') || isSavingReadonly) {
      return;
    }

    setIsSavingReadonly(true);

    // Store current values for potential rollback
    const currentText = readonlyText;
    const currentId = currentSentenceId;

    // Clear localStorage immediately
    localStorage.removeItem('currentSentence');
    localStorage.removeItem('currentSentenceId');
    localStorage.removeItem('currentSentenceCategory');

    // If we have a prefetched sentence, use it immediately
    if (nextSentence) {
      setReadonlyText(nextSentence.text);
      setCurrentSentenceId(nextSentence.id);
      setReadonlyCategory('');
      setNextSentence(null);
      // Start prefetching the next one
      prefetchNextSentence();
    }

    try {
      // Mark the sentence as used without saving a label
      const response = await fetch('/api/mark-sentence-used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentenceId: currentId })
      });

      if (!response.ok) {
        throw new Error('Failed to skip sentence');
      }

      // If we didn't have a prefetched sentence, fetch one now
      if (!nextSentence) {
        const nextSentenceResponse = await fetch('/api/fetch-sentence');
        if (!nextSentenceResponse.ok) {
          throw new Error('Failed to fetch next sentence');
        }
        const nextSentenceResult = await nextSentenceResponse.json();
        
        if (nextSentenceResult.success && nextSentenceResult.sentence) {
          setReadonlyText(nextSentenceResult.sentence);
          setCurrentSentenceId(nextSentenceResult.sentenceId);
          setReadonlyCategory('');
        } else {
          handleNextSentenceError(nextSentenceResult);
        }
      }
      
    } catch (error) {
      console.error('Error skipping sentence:', error);
      // Rollback on error
      setReadonlyText(currentText);
      setCurrentSentenceId(currentId);
      // Restore localStorage
      localStorage.setItem('currentSentence', currentText);
      localStorage.setItem('currentSentenceId', currentId.toString());
      setError('Failed to skip. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSavingReadonly(false);
    }
  };

  // Modified fetchNewSentence to use prefetched sentence
  const fetchNewSentence = async () => {
    setIsLoadingSentence(true);
    try {
      // If we have a prefetched sentence, use it
      if (nextSentence) {
        setReadonlyText(nextSentence.text);
        setCurrentSentenceId(nextSentence.id);
        setReadonlyCategory('');
        setNextSentence(null);
        // Start prefetching the next one
        prefetchNextSentence();
        return;
      }

      // If no prefetched sentence, fetch one normally
      const response = await fetch('/api/fetch-sentence');
      if (!response.ok) {
        throw new Error('Failed to fetch sentence');
      }
      const result = await response.json();
      
      if (result.success && result.sentence) {
        setReadonlyText(result.sentence);
        setCurrentSentenceId(result.sentenceId);
        setReadonlyCategory('');
        // Start prefetching the next one
        prefetchNextSentence();
      } else {
        handleNextSentenceError(result);
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
      setCurrentSentenceId(null);
    } finally {
      setIsLoadingSentence(false);
    }
  };

  // Helper function to handle next sentence errors
  const handleNextSentenceError = (result) => {
    if (result.error === 'Database tables not found') {
      setReadonlyText('Database setup required. Please create the required tables in Supabase first.');
    } else if (result.message && result.message.includes('No sentences available')) {
      setReadonlyText('No sentences available. Please submit paragraphs in the Admin Panel first.');
    } else {
      setReadonlyText('No sentences available.');
    }
    setCurrentSentenceId(null);
    setReadonlyCategory('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header with Navigation Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Label Sentences
          </h1>
          <NavigationToggle currentPage="main" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/80 border border-red-600 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Sentence Display and Category Selection */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
              Current Sentence
            </h2>
            <p className="text-base sm:text-lg text-gray-200 mb-4">
              {isLoadingSentence ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span>
                  Loading sentence...
                </span>
              ) : readonlyText}
            </p>
          </div>

          {/* Category Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleReadonlyCategorySelect(category)}
                disabled={isSavingReadonly || !readonlyText || 
                         readonlyText.includes('No sentences available') || 
                         readonlyText.includes('Unable to load sentence')}
                className={`
                  py-2 px-3 rounded-lg font-medium text-sm sm:text-base
                  transition-all duration-200 transform
                  ${isSavingReadonly ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 active:scale-95'}
                  ${readonlyCategory === category ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'}
                  focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-800
                `}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Skip Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSkip}
              disabled={isSavingReadonly || !readonlyText || 
                       readonlyText.includes('No sentences available') || 
                       readonlyText.includes('Unable to load sentence')}
              className={`
                py-2 px-4 rounded-lg font-medium text-sm sm:text-base
                transition-all duration-200 transform
                ${isSavingReadonly ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 active:scale-95'}
                bg-slate-600 text-gray-200 hover:bg-slate-500
                focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800
              `}
            >
              Skip This Sentence
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Select a category for the sentence above. The next sentence will load automatically.</p>
        </div>
      </div>
    </div>
  );
}
