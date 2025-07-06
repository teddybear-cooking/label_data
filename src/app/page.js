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

  // Remove sentence predictions state
  const [isSentencePredictionLoading, setIsSentencePredictionLoading] = useState(false);
  const [sentencePredictionError, setSentencePredictionError] = useState('');

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
      console.log('Restored sentence from localStorage:', savedSentence);
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

  // Performance optimizations
  const cache = useRef(new Map()); // Cache for responses
  const currentRequest = useRef(null); // Track current request for cancellation
  const debounceTimeout = useRef(null); // Debounce timeout reference

  // Sentence prediction optimizations
  const sentenceCurrentRequest = useRef(null); // Track current request for cancellation
  const sentenceDebounceTimeout = useRef(null); // Debounce timeout reference

  // Optimized API call with caching, deduplication, and cancellation
  const getPredictions = useCallback(async (text) => {
    const trimmedText = text.trim();
    
    if (!trimmedText || trimmedText.length < 3) {
      setPredictions({
        'normal': 0,
        'hate speech': 0,
        'offensive': 0,
        'religious hate': 0,
        'political hate': 0
      });
      return;
    }

    // Check cache first
    const cacheKey = trimmedText.toLowerCase();
    if (cache.current.has(cacheKey)) {
      console.log('Cache hit for:', trimmedText);
      setPredictions(cache.current.get(cacheKey));
      return;
    }

    // Cancel previous request if still pending
    if (currentRequest.current) {
      currentRequest.current.abort();
    }

    setIsLoading(true);
    setError('');
    
    // Create new AbortController for this request
    const controller = new AbortController();
    currentRequest.current = controller;

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedText }),
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        throw new Error('Failed to get predictions');
      }

      const data = await response.json();
      
      // Debug: Log the API response
      console.log('API Response:', data);
      
      // Update predictions based on API response
      if (data.all_probabilities) {
        const newPredictions = {
          'normal': Math.round((data.all_probabilities.normal || 0) * 100),
          'hate speech': Math.round((data.all_probabilities.hate_speech || 0) * 100),
          'offensive': Math.round((data.all_probabilities.offensive || 0) * 100),
          'religious hate': Math.round((data.all_probabilities.religious_hate || 0) * 100),
          'political hate': Math.round((data.all_probabilities.political_hate || 0) * 100)
        };
        
        // Cache the result
        cache.current.set(cacheKey, newPredictions);
        
        // Limit cache size (keep only last 50 entries)
        if (cache.current.size > 50) {
          const firstKey = cache.current.keys().next().value;
          cache.current.delete(firstKey);
        }
        
        console.log('Setting predictions:', newPredictions);
        setPredictions(newPredictions);
      } else {
        console.log('No all_probabilities found in response');
      }
    } catch (err) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      
      console.error('Error getting predictions:', err);
      setError('Failed to get predictions. Please try again.');
    } finally {
      setIsLoading(false);
      currentRequest.current = null;
    }
  }, []);

  // Optimized debounce with faster response time
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout with reduced delay for better UX
    debounceTimeout.current = setTimeout(() => {
      getPredictions(textInput);
    }, 300); // Reduced from 500ms to 300ms

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [textInput, getPredictions]);

  // Sentence prediction function
  const getSentencePredictions = useCallback(async (text) => {
    const trimmedText = text.trim();
    
    if (!trimmedText || trimmedText.length < 3) {
      setSentencePredictions({
        'normal': 0,
        'hate speech': 0,
        'offensive': 0,
        'religious hate': 0,
        'political hate': 0
      });
      return;
    }

    // Check cache first
    const cacheKey = trimmedText.toLowerCase();
    if (cache.current.has(cacheKey)) {
      console.log('Cache hit for sentence:', trimmedText);
      setSentencePredictions(cache.current.get(cacheKey));
      return;
    }

    // Cancel previous request if still pending
    if (sentenceCurrentRequest.current) {
      sentenceCurrentRequest.current.abort();
    }

    setIsSentencePredictionLoading(true);
    setSentencePredictionError('');
    
    // Create new AbortController for this request
    const controller = new AbortController();
    sentenceCurrentRequest.current = controller;

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedText }),
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        throw new Error('Failed to get sentence predictions');
      }

      const data = await response.json();
      
      // Update predictions based on API response
      if (data.all_probabilities) {
        const newPredictions = {
          'normal': Math.round((data.all_probabilities.normal || 0) * 100),
          'hate speech': Math.round((data.all_probabilities.hate_speech || 0) * 100),
          'offensive': Math.round((data.all_probabilities.offensive || 0) * 100),
          'religious hate': Math.round((data.all_probabilities.religious_hate || 0) * 100),
          'political hate': Math.round((data.all_probabilities.political_hate || 0) * 100)
        };
        
        // Cache the result
        cache.current.set(cacheKey, newPredictions);
        
        // Limit cache size (keep only last 50 entries)
        if (cache.current.size > 50) {
          const firstKey = cache.current.keys().next().value;
          cache.current.delete(firstKey);
        }
        
        console.log('Setting sentence predictions:', newPredictions);
        setSentencePredictions(newPredictions);
      } else {
        console.log('No all_probabilities found in sentence response');
      }
    } catch (err) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError') {
        console.log('Sentence request cancelled');
        return;
      }
      
      console.error('Error getting sentence predictions:', err);
      setSentencePredictionError('Failed to get predictions. Please try again.');
    } finally {
      setIsSentencePredictionLoading(false);
      sentenceCurrentRequest.current = null;
    }
  }, []);

  // Debounced sentence prediction effect
  useEffect(() => {
    // Clear previous timeout
    if (sentenceDebounceTimeout.current) {
      clearTimeout(sentenceDebounceTimeout.current);
    }

    // Set new timeout with reduced delay for better UX
    sentenceDebounceTimeout.current = setTimeout(() => {
      getSentencePredictions(readonlyText);
    }, 300);

    return () => {
      if (sentenceDebounceTimeout.current) {
        clearTimeout(sentenceDebounceTimeout.current);
      }
    };
  }, [readonlyText, getSentencePredictions]);

  const categories = [
    'normal',
    'hate speech',
    'offensive',
    'religious hate',
    'political hate'
  ];

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleSubmit = async () => {
    if (!textInput.trim()) {
      alert('⚠️ Please enter some text before saving.');
      return;
    }
    
    if (!selectedCategory) {
      alert('⚠️ Please select a category before saving.');
      return;
    }

    // Set loading state immediately for smooth UX
    setIsSavingMain(true);
    
    // Store current values for rollback if needed
    const currentText = textInput;
    const currentCategory = selectedCategory;

    // Optimistically update UI
    setTextInput('');
    setSelectedCategory('');

    try {
      const requestData = { 
        text: currentText.trim(),
        label: currentCategory
      };

      const response = await fetch('/api/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Save operation failed');
      }
      
    } catch (error) {
      console.error('Error saving data:', error);
      // Rollback on error
      setTextInput(currentText);
      setSelectedCategory(currentCategory);
      // Show error in UI instead of alert
      setError('Failed to save. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSavingMain(false);
    }
  };

  // Functions for readonly sentence section
  const fetchNewSentence = async () => {
    setIsLoadingSentence(true);
    try {
      // Mark current sentence as used before fetching new one (if exists)
      if (currentSentenceId) {
        console.log('Marking current sentence as used before fetching new one...');
        try {
          const markUsedResponse = await fetch('/api/mark-sentence-used', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sentenceId: currentSentenceId })
          });
          
          if (markUsedResponse.ok) {
            console.log('✅ Current sentence marked as used');
          } else {
            console.warn('Failed to mark current sentence as used');
          }
        } catch (markError) {
          console.error('Error marking sentence as used:', markError);
          // Continue anyway
        }
      }
      
      const response = await fetch('/api/fetch-sentence');
      if (!response.ok) {
        throw new Error('Failed to fetch sentence');
      }
      const result = await response.json();
      
      if (result.success && result.sentence) {
        setReadonlyText(result.sentence);
        setCurrentSentenceId(result.sentenceId);
        setReadonlyCategory(''); // Reset category when new sentence loads
        console.log('Fetched new sentence:', result.sentence);
      } else {
        // Handle different error cases
        if (result.error === 'Database tables not found') {
          setReadonlyText('Database setup required. Please create the required tables in Supabase first.');
        } else if (result.message && result.message.includes('No sentences available')) {
          setReadonlyText('No sentences available. Please submit paragraphs in the Admin Panel first.');
        } else {
          setReadonlyText('No sentences available.');
        }
        setCurrentSentenceId(null);
        setReadonlyCategory('');
        console.log('No sentences available:', result.message);
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
      setCurrentSentenceId(null);
    } finally {
      setIsLoadingSentence(false);
    }
  }

  const handleReadonlyCategoryChange = (category) => {
    setReadonlyCategory(category);
  };

  const handleReadonlySubmit = async () => {
    if (!readonlyText.trim() || readonlyText.includes('No sentences available') || readonlyText.includes('Unable to load sentence')) {
      setError('⚠️ No valid text to save. Please fetch a sentence first.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!readonlyCategory) {
      setError('⚠️ Please select a category before saving.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Set loading state immediately for smooth UX
    setIsSavingReadonly(true);
    
    // Store current values for potential rollback
    const currentText = readonlyText;
    const currentCategory = readonlyCategory;
    const currentId = currentSentenceId;

    // Optimistically clear localStorage and fetch next sentence
    localStorage.removeItem('currentSentence');
    localStorage.removeItem('currentSentenceId');
    localStorage.removeItem('currentSentenceCategory');
    
    // Start fetching next sentence in parallel
    const nextSentencePromise = fetch('/api/fetch-sentence');

    try {
      const requestData = { 
        text: currentText.trim(),
        label: currentCategory,
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();
      
      if (result.success) {
        // Use the already started fetch request
        const nextSentenceResponse = await nextSentencePromise;
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
      } else {
        throw new Error('Save operation failed');
      }
      
    } catch (error) {
      console.error('Error saving readonly data:', error);
      // Rollback on error
      setReadonlyText(currentText);
      setReadonlyCategory(currentCategory);
      setCurrentSentenceId(currentId);
      // Restore localStorage
      localStorage.setItem('currentSentence', currentText);
      localStorage.setItem('currentSentenceId', currentId.toString());
      localStorage.setItem('currentSentenceCategory', currentCategory);
      // Show error in UI instead of alert
      setError('Failed to save. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSavingReadonly(false);
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

  // Load initial sentence when component mounts (only if not already loaded from localStorage)
  useEffect(() => {
    if (!readonlyText && !currentSentenceId) {
      fetchInitialSentence();
    }
  }, []);

  // Fetch initial sentence without marking any as used
  const fetchInitialSentence = async () => {
    setIsLoadingSentence(true);
    try {
      const response = await fetch('/api/fetch-sentence');
      if (!response.ok) {
        throw new Error('Failed to fetch sentence');
      }
      const result = await response.json();
      
      if (result.success && result.sentence) {
        setReadonlyText(result.sentence);
        setCurrentSentenceId(result.sentenceId);
        setReadonlyCategory(''); // Reset category when new sentence loads
        console.log('Fetched initial sentence:', result.sentence);
      } else {
        // Handle different error cases
        if (result.error === 'Database tables not found') {
          setReadonlyText('Database setup required. Please create the required tables in Supabase first.');
        } else if (result.message && result.message.includes('No sentences available')) {
          setReadonlyText('No sentences available. Please submit paragraphs in the Admin Panel first.');
        } else {
          setReadonlyText('No sentences available.');
        }
        setCurrentSentenceId(null);
        setReadonlyCategory('');
        console.log('No sentences available:', result.message);
      }
    } catch (error) {
      console.error('Error fetching initial sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
      setCurrentSentenceId(null);
    } finally {
      setIsLoadingSentence(false);
    }
  };

  // Get top 2 predictions
  const getTop2Predictions = () => {
    const predictionArray = categories.map(category => ({
      category,
      percentage: predictions[category]
    }));
    
    return predictionArray
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2);
  };

  // Get top 2 sentence predictions
  const getTop2SentencePredictions = () => {
    const predictionArray = categories.map(category => ({
      category,
      percentage: sentencePredictions[category]
    }));
    
    return predictionArray
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2);
  };

  const canSubmit = textInput.trim() && selectedCategory && !isSavingMain;
  const canSubmitReadonly = readonlyText.trim() && 
                           readonlyCategory && 
                           currentSentenceId &&
                           !readonlyText.includes('No sentences available') && 
                           !readonlyText.includes('Unable to load sentence') &&
                           !readonlyText.includes('Database setup required') &&
                           !isSavingReadonly;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header with Navigation Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Text Labeling
          </h1>
          <NavigationToggle currentPage="main" />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Manual Input */}
          <div className="flex flex-col gap-6">
            {/* Text Input Form */}
            <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 lg:p-6 border border-slate-500">
              {/* Header */}
              <div className="mb-4">
                <h2 className="text-lg lg:text-xl font-semibold text-white">
                  Write
                </h2>
                <div className="text-center text-xs lg:text-sm text-gray-300 mt-2">
                  <span className="block sm:inline">normal • hate speech • offensive</span>
                  <span className="block sm:inline sm:ml-2">religious hate • political hate</span>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-3 p-2 bg-red-900/80 border border-red-600 text-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Text Input */}
              <div className="mb-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Write your text here..."
                  className="w-full p-3 lg:p-4 border border-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black placeholder-gray-500 text-sm lg:text-base"
                  rows={4}
                />
                <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs lg:text-sm text-gray-400">
                      {textInput.length} characters • {textInput.trim().split(/\s+/).filter(w => w.length > 0).length} words
                    </div>
                    {textInput.trim().length === 0 && !isLoading && (
                      <div className="text-xs lg:text-sm text-gray-400">
                        Type to see predictions
                      </div>
                    )}
                    {isLoading && (
                      <div className="text-xs lg:text-sm text-gray-300 flex items-center">
                        <span className="animate-spin mr-2">⟳</span>
                        Analyzing text...
                      </div>
                    )}
                    {!isLoading && textInput.trim().length >= 3 && (
                      <div className="text-xs lg:text-sm text-green-400 flex items-center">
                        <span className="mr-2">✓</span>
                        Predictions updated
                      </div>
                    )}
                  </div>
                  
                  {/* Top 2 Predictions */}
                  {!isLoading && textInput.trim().length >= 3 && (
                    <div className="flex flex-wrap gap-2 lg:gap-3 justify-center sm:justify-end">
                      {getTop2Predictions().map((prediction, index) => (
                        <CategoryDisplay
                          key={prediction.category}
                          category={prediction.category}
                          percentage={prediction.percentage}
                          isLoading={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`py-2 px-3 rounded-lg text-sm lg:text-base font-medium transition-all duration-200 ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white transform scale-105'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`font-semibold py-2 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm lg:text-base ${
                    canSubmit
                      ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 active:scale-95'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isSavingMain ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⟳</span>
                      Saving...
                    </span>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Random Sentence */}
          <div className="flex flex-col gap-6">
            {/* Random Sentence Display */}
            <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 lg:p-6 border border-slate-500">
              {/* Header */}
              <div className="mb-4">
                <h2 className="text-lg lg:text-xl font-semibold text-white">
                  Label Random Sentence
                </h2>
                <div className="text-center text-xs lg:text-sm text-gray-300 mt-2">
                  Select a category for the displayed sentence
                </div>
              </div>

              {/* Sentence Display */}
              <div className="mb-4">
                <div className="bg-slate-700/50 p-3 lg:p-4 rounded-lg border border-slate-600">
                  {isLoadingSentence ? (
                    <div className="flex items-center justify-center text-gray-300">
                      <span className="animate-spin mr-2">⟳</span>
                      Loading sentence...
                    </div>
                  ) : (
                    <p className="text-sm lg:text-base text-gray-200">
                      {readonlyText}
                    </p>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleReadonlyCategoryChange(category)}
                      className={`py-2 px-3 rounded-lg text-sm lg:text-base font-medium transition-all duration-200 ${
                        readonlyCategory === category
                          ? 'bg-green-600 text-white transform scale-105'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  onClick={handleReadonlySubmit}
                  disabled={!canSubmitReadonly}
                  className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm lg:text-base ${
                    canSubmitReadonly
                      ? 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105 active:scale-95'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isSavingReadonly ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">⟳</span>
                      Saving...
                    </span>
                  ) : (
                    'Submit & Next'
                  )}
                </button>
                <button
                  onClick={fetchNewSentence}
                  disabled={isLoadingSentence}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm lg:text-base disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
