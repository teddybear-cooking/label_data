import { useState, useEffect } from 'react';

export default function SentenceLabeling({ onSubmissionSuccess }) {
  const [readonlyText, setReadonlyText] = useState('');
  const [readonlyCategory, setReadonlyCategory] = useState('');
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);

  const categories = [
    'normal',
    'hate speech',
    'offensive',
    'religious hate',
    'political hate'
  ];

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
        
        // Notify parent component about successful submission
        if (onSubmissionSuccess) {
          onSubmissionSuccess(result);
        }
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

  const canSubmitReadonly = readonlyText.trim() && 
                           readonlyCategory && 
                           !readonlyText.includes('No sentences available') && 
                           !readonlyText.includes('Unable to load sentence');

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 lg:p-6 border border-slate-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
        <h2 className="text-lg lg:text-xl font-semibold text-white">
          Label this sentence
        </h2>
        <button
          onClick={fetchNewSentence}
          disabled={isLoadingSentence}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base w-full sm:w-auto"
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
      <div className="mb-4 flex-1 flex flex-col min-h-0">
        <textarea
          value={readonlyText}
          readOnly
          placeholder="Click 'Get New Sentence' to load text for labeling..."
          className="w-full p-3 border border-gray-400 rounded-lg resize-none bg-white text-black cursor-default text-sm lg:text-base flex-1 min-h-0"
        />
      </div>

      {/* Category Selection for Readonly */}
      <div className="mb-4">
        <p className="text-sm lg:text-base font-medium text-gray-200 mb-3">
          Select a category for this sentence:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((category) => (
            <label
              key={category}
              className="flex items-center space-x-3 cursor-pointer hover:bg-[#254761] p-2 rounded-lg border border-slate-400 bg-[#1e4558]/70 transition-colors"
            >
              <input
                type="checkbox"
                checked={readonlyCategory === category}
                onChange={() => handleReadonlyCategoryChange(category)}
                className="w-4 h-4 text-blue-400 bg-white border-gray-400 rounded focus:ring-blue-400 focus:ring-2"
              />
              <span className="text-sm lg:text-base font-medium text-gray-200 capitalize flex-1">
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button for Readonly */}
      {canSubmitReadonly && (
        <div className="flex justify-center pt-2 border-t border-slate-600">
          <button
            onClick={handleReadonlySubmit}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm lg:text-base w-full"
          >
            Save Label
          </button>
        </div>
      )}
    </div>
  );
} 