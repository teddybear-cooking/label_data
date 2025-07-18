import { useState, useEffect, useCallback, useRef } from 'react';
import CategoryDisplay from './CategoryDisplay';

const TextInputForm = ({ onError }) => {
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
  const [isSaving, setIsSaving] = useState(false);

  // Performance optimizations
  const cache = useRef(new Map()); // Cache for responses
  const currentRequest = useRef(null); // Track current request for cancellation
  const debounceTimeout = useRef(null); // Debounce timeout reference

  const categories = [
    'normal',
    'hate speech',
    'offensive',
    'religious hate',
    'political hate'
  ];

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
      onError('Failed to get predictions. Please try again.');
    } finally {
      setIsLoading(false);
      currentRequest.current = null;
    }
  }, [onError]);

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

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleSubmit = async () => {
    if (!textInput.trim()) {
      onError('⚠️ Please enter some text before saving.');
      return;
    }
    
    if (!selectedCategory) {
      onError('⚠️ Please select a category before saving.');
      return;
    }

    // Set loading state immediately for smooth UX
    setIsSaving(true);
    
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
      onError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
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

  const canSubmit = textInput.trim() && selectedCategory && !isSaving;

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500 mb-4 sm:mb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Write anything under these categories
        </h2>
      </div>

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
          placeholder="write offensive words for a sentence"
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
            disabled={isSaving}
            className={`font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto transform ${
              isSaving 
                ? 'bg-blue-400 cursor-not-allowed scale-95' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
            } text-white`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Saving...
              </span>
            ) : (
              'Save to CSV'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TextInputForm; 