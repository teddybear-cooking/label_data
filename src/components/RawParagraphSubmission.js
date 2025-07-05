import { useState } from 'react';

export default function RawParagraphSubmission({ onSubmissionSuccess }) {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!textInput.trim()) {
      setMessage('Please enter some text');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/save-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: textInput.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save text');
      }

      const result = await response.json();
      setMessage(`✅ Text appended successfully to: ${result.filename} (Storage: ${result.storage || 'local'})`);
      setTextInput(''); // Clear input after successful save
      
      // Notify parent component about successful submission
      if (onSubmissionSuccess) {
        onSubmissionSuccess(result);
      }
      
    } catch (error) {
      console.error('Error saving text:', error);
      setMessage('❌ Failed to save text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setTextInput('');
    setMessage('');
  };

  const wordCount = textInput.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = textInput.length;

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 border border-slate-500 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-white">
        Raw Paragraph Submission
      </h2>

      {/* Message Display */}
      {message && (
        <div className={`mb-3 p-2 rounded-lg text-sm ${
          message.includes('✅') 
            ? 'bg-green-900/80 border border-green-600 text-green-200' 
            : 'bg-red-900/80 border border-red-600 text-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Text Input */}
      <div className="mb-4 flex-1 flex flex-col min-h-0">
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Enter raw text paragraph (will be saved as-is):
        </label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter your raw text paragraph here. It will be saved exactly as you type it, with no timestamps or formatting."
          className="w-full p-3 border border-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black placeholder-gray-500 text-sm flex-1 min-h-0"
        />
        
        {/* Text Statistics */}
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-300">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-600">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !textInput.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm flex-1"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⟳</span>
              Saving...
            </span>
          ) : (
            'Save Raw Paragraph'
          )}
        </button>
        
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:w-auto"
        >
          Clear
        </button>
      </div>
    </div>
  );
} 