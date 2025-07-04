'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

    console.log('=== FRONTEND SAVE REQUEST ===');
    console.log('Text to save:', textInput.trim());
    console.log('Selected label:', selectedCategory);

    try {
      const requestData = { 
        text: textInput.trim(),
        label: selectedCategory
      };
      
      console.log('Sending request data:', requestData);

      const response = await fetch('/api/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();
      console.log('✅ Success response:', result);
      
      // Verify the save was successful
      if (result.success && result.fileExists) {
        console.log('✅ Data saved successfully:', result.text, '|', result.label);
        
        // Reset form only after successful save
        setTextInput('');
        setSelectedCategory('');
      } else {
        throw new Error('Save operation may have failed - file verification failed');
      }
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert('❌ Failed to save data. Please try again.');
    }
  };

  // Functions for readonly sentence section
  const fetchNewSentence = async () => {
    setIsLoadingSentence(true);
    try {
      const response = await fetch('/api/fetch-sentence');
      if (!response.ok) {
        throw new Error('Failed to fetch sentence');
      }
      const result = await response.json();
      
      if (result.success && result.sentence) {
        setReadonlyText(result.sentence);
        setReadonlyCategory(''); // Reset category when new sentence loads
        console.log('Fetched new sentence:', result.sentence);
      } else {
        // No sentences available from file
        setReadonlyText('No sentences available.');
        setReadonlyCategory('');
        console.log('No sentences available:', result.message);
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
    } finally {
      setIsLoadingSentence(false);
    }
  };

  const handleReadonlyCategoryChange = (category) => {
    setReadonlyCategory(category);
  };

  const handleReadonlySubmit = async () => {
    if (!readonlyText.trim() || readonlyText.includes('No sentences available') || readonlyText.includes('Unable to load sentence')) {
      alert('⚠️ No valid text to save. Please fetch a sentence first.');
      return;
    }
    
    if (!readonlyCategory) {
      alert('⚠️ Please select a category before saving.');
      return;
    }

    try {
      const requestData = { 
        text: readonlyText.trim(),
        label: readonlyCategory
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
      
      if (result.success && result.fileExists) {
        console.log('✅ Readonly data saved successfully:', result.text, '|', result.label);
        
        // Automatically fetch a new sentence and reset category
        await fetchNewSentence();
      } else {
        throw new Error('Save operation may have failed');
      }
      
    } catch (error) {
      console.error('Error saving readonly data:', error);
      alert('❌ Failed to save data. Please try again.');
    }
  };

  // Load initial sentence when component mounts
  useEffect(() => {
    fetchNewSentence();
  }, []);

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

  const canSubmit = textInput.trim() && selectedCategory;
  const canSubmitReadonly = readonlyText.trim() && 
                           readonlyCategory && 
                           !readonlyText.includes('No sentences available') && 
                           !readonlyText.includes('Unable to load sentence');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8 text-white">
          I need more data model accuracy🙏
        </h1>

        {/* Main Form Section */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500 mb-4 sm:mb-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Write
            </h2>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/80 border border-red-600 text-red-200 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          {/* Categories Display */}
          <div className="mb-4">
            <div className="text-center text-xs sm:text-sm text-gray-300 px-2">
              <span className="block sm:inline">normal • hate speech • offensive</span>
              <span className="block sm:inline sm:ml-2">religious hate • political hate</span>
            </div>
          </div>

          {/* Text Input */}
          <div className="mb-4 sm:mb-6">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="offensive words like... What the fuck brother  OR  Shut the fuck up"
              className="w-full p-3 sm:p-4 border border-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black placeholder-gray-500 text-sm sm:text-base"
              rows={4}
            />
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
              <div>
                {textInput.trim().length === 0 && !isLoading && (
                  <div className="text-xs sm:text-sm text-gray-400">
                    sentence classification result 0% all class
                  </div>
                )}
                {isLoading && (
                  <div className="text-xs sm:text-sm text-gray-300 flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Analyzing text...
                  </div>
                )}
                {!isLoading && textInput.trim().length >= 3 && (
                  <div className="text-xs sm:text-sm text-green-400 flex items-center">
                    <span className="mr-2">✓</span>
                    Predictions updated
                  </div>
                )}
                {textInput.trim() && textInput.trim().length < 3 && !isLoading && (
                  <div className="text-xs sm:text-sm text-gray-300">
                    Type at least 3 characters to see predictions
                  </div>
                )}
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

          {/* Category Selection */}
          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base font-medium text-gray-200 mb-3">
              Select a category:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-[#254761] p-3 rounded-lg border border-slate-400 bg-[#1e4558]/70 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategory === category}
                    onChange={() => handleCategoryChange(category)}
                    className="w-4 h-4 text-blue-400 bg-white border-gray-400 rounded focus:ring-blue-400 focus:ring-2"
                  />
                  <span className="text-sm sm:text-base font-medium text-gray-200 capitalize flex-1">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button - Only visible when both text and category are selected */}
          {canSubmit && (
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
              >
                Save to CSV
              </button>
            </div>
          )}
        </div>

        {/* Readonly Sentence Section */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Label this sentence
            </h2>
            <button
              onClick={fetchNewSentence}
              disabled={isLoadingSentence}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
            >
              {isLoadingSentence ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⟳</span>
                  Loading...
                </span>
              ) : (
                'Get New Sentence'
              )}
            </button>
          </div>

          {/* Readonly Text Display */}
          <div className="mb-4 sm:mb-6">
            <textarea
              value={readonlyText}
              readOnly
              placeholder="Click 'Get New Sentence' to load text for labeling..."
              className="w-full p-3 sm:p-4 border border-gray-400 rounded-lg resize-none bg-white text-black cursor-default text-sm sm:text-base"
              rows={3}
            />
          </div>

          {/* Category Selection for Readonly */}
          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base font-medium text-gray-200 mb-3">
              Select a category for this sentence:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-[#254761] p-3 rounded-lg border border-slate-400 bg-[#1e4558]/70 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={readonlyCategory === category}
                    onChange={() => handleReadonlyCategoryChange(category)}
                    className="w-4 h-4 text-blue-400 bg-white border-gray-400 rounded focus:ring-blue-400 focus:ring-2"
                  />
                  <span className="text-sm sm:text-base font-medium text-gray-200 capitalize flex-1">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button for Readonly */}
          {canSubmitReadonly && (
            <div className="flex justify-center">
              <button
                onClick={handleReadonlySubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
              >
                Save Label
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Write your own text or label provided sentences to contribute training data.</p>
        </div>
      </div>
    </div>
  );
}
