import { useState, useEffect } from 'react';

const SentenceLabeling = ({ onError }) => {
  const [readonlyText, setReadonlyText] = useState('');
  const [readonlyCategory, setReadonlyCategory] = useState('');
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [currentSentenceId, setCurrentSentenceId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    'normal',
    'hate speech',
    'offensive',
    'religious hate',
    'political hate'
  ];

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

  // Load initial sentence when component mounts (only if not already loaded from localStorage)
  useEffect(() => {
    if (!readonlyText && !currentSentenceId) {
      fetchInitialSentence();
    }
  }, []);

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
        handleSentenceError(result);
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
      setCurrentSentenceId(null);
    } finally {
      setIsLoadingSentence(false);
    }
  };

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
        handleSentenceError(result);
      }
    } catch (error) {
      console.error('Error fetching initial sentence:', error);
      setReadonlyText('Unable to load sentence. Please try again.');
      setCurrentSentenceId(null);
    } finally {
      setIsLoadingSentence(false);
    }
  };

  // Helper function to handle sentence errors
  const handleSentenceError = (result) => {
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
  };

  const handleReadonlyCategoryChange = (category) => {
    setReadonlyCategory(category);
  };

  const handleReadonlySubmit = async () => {
    if (!readonlyText.trim() || readonlyText.includes('No sentences available') || readonlyText.includes('Unable to load sentence')) {
      onError('⚠️ No valid text to save. Please fetch a sentence first.');
      return;
    }
    
    if (!readonlyCategory) {
      onError('⚠️ Please select a category before saving.');
      return;
    }

    // Set loading state immediately for smooth UX
    setIsSaving(true);
    
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
          handleSentenceError(nextSentenceResult);
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
      onError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmitReadonly = readonlyText.trim() && 
                           readonlyCategory && 
                           currentSentenceId &&
                           !readonlyText.includes('No sentences available') && 
                           !readonlyText.includes('Unable to load sentence') &&
                           !readonlyText.includes('Database setup required') &&
                           !isSaving;

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Label this sentence
        </h2>
        <button
          onClick={fetchNewSentence}
          disabled={isLoadingSentence}
          className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base w-full sm:w-auto transform ${
            isLoadingSentence 
              ? 'bg-gray-400 cursor-not-allowed scale-95' 
              : 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'
          } text-white`}
        >
          {isLoadingSentence ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
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
            disabled={isSaving}
            className={`font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto transform ${
              isSaving 
                ? 'bg-purple-400 cursor-not-allowed scale-95' 
                : 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95'
            } text-white`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Saving...
              </span>
            ) : (
              'Save Label'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SentenceLabeling; 