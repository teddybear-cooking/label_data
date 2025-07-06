'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import NavigationToggle from '../../components/NavigationToggle';
import { usePagePersistence } from '../../components/PagePersistence';

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

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Prediction state
  const [predictions, setPredictions] = useState({
    'normal': 0,
    'hate speech': 0,
    'offensive': 0,
    'religious hate': 0,
    'political hate': 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Use page persistence hook
  usePagePersistence('admin');

  // Performance optimizations
  const cache = useRef(new Map()); // Cache for responses
  const currentRequest = useRef(null); // Track current request for cancellation
  const debounceTimeout = useRef(null); // Debounce timeout reference

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
      console.log('Cache hit for admin text:', trimmedText);
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
        
        console.log('Setting admin predictions:', newPredictions);
        setPredictions(newPredictions);
      } else {
        console.log('No all_probabilities found in admin response');
      }
    } catch (err) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError') {
        console.log('Admin request cancelled');
        return;
      }
      
      console.error('Error getting admin predictions:', err);
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
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [textInput, getPredictions]);

  const categories = [
    'normal',
    'hate speech',
    'offensive',
    'religious hate',
    'political hate'
  ];

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

  const handleSubmit = async () => {
    if (!textInput.trim()) {
      setMessage('⚠️ Please enter some text before submitting.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      // Clean the text - remove extra spaces and normalize whitespace
      const cleanedText = textInput
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .trim(); // Remove leading/trailing whitespace

      const response = await fetch('/api/save-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanedText })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save text');
      }

      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ Paragraph submitted successfully! Sentences will be available for labeling.');
        setTextInput(''); // Clear the form
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Submit operation failed');
      }
      
    } catch (error) {
      console.error('Error submitting text:', error);
      
      // Check if it's a database setup error
      if (error.message.includes('Database tables not found') || 
          error.message.includes('relation') || 
          error.message.includes('table')) {
        setMessage('❌ Database tables need to be created. Please run the SQL commands in your Supabase SQL editor first.');
      } else {
        setMessage('❌ Failed to submit text. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = textInput.trim() && !isSaving;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header with Navigation Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Admin Panel
          </h1>
          <NavigationToggle currentPage="admin" />
        </div>

        {/* Admin Form Section */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
              Submit Training Paragraphs
            </h2>
            <p className="text-sm sm:text-base text-gray-300">
              Submit paragraphs that will be used as training data for sentence labeling.
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm sm:text-base ${
              message.includes('✅') 
                ? 'bg-green-900/80 border border-green-600 text-green-200' 
                : 'bg-red-900/80 border border-red-600 text-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Text Input */}
          <div className="mb-4 sm:mb-6">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter training paragraphs here... These will be split into sentences for labeling."
              className="w-full p-3 sm:p-4 border border-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-black placeholder-gray-500 text-sm sm:text-base"
              rows={8}
            />
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
              <div className="flex flex-col gap-1">
                <div className="text-xs sm:text-sm text-gray-400">
                  {textInput.length} characters • {textInput.trim().split(/\s+/).filter(w => w.length > 0).length} words
                </div>
                <div>
                  {textInput.trim().length === 0 && !isLoading && (
                    <div className="text-xs sm:text-sm text-gray-400">
                      paragraph classification result 0% all class
                    </div>
                  )}
                  {isLoading && (
                    <div className="text-xs sm:text-sm text-gray-300 flex items-center">
                      <span className="animate-spin mr-2">⟳</span>
                      Analyzing paragraph...
                    </div>
                  )}
                  {!isLoading && textInput.trim().length >= 3 && (
                    <div className="text-xs sm:text-sm text-green-400 flex items-center">
                      <span className="mr-2">✓</span>
                      Paragraph predictions updated
                    </div>
                  )}
                  {textInput.trim() && textInput.trim().length < 3 && !isLoading && (
                    <div className="text-xs sm:text-sm text-gray-300">
                      Type at least 3 characters to see predictions
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-right">
                  Paragraphs will be split into individual sentences for labeling
                </div>
                
                {/* Top 2 Predictions */}
                {!isLoading && textInput.trim().length >= 3 && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-end">
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
          </div>

          {/* Submit Button */}
          {canSubmit && (
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className={`font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto transform ${
                  isSaving 
                    ? 'bg-green-400 cursor-not-allowed scale-95' 
                    : 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'
                } text-white`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit Paragraphs'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Submit training paragraphs that will be used to generate sentences for labeling on the main page.</p>
        </div>
      </div>
    </div>
  );
} 