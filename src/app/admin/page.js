'use client';

import { useState, useEffect } from 'react';
import NavigationToggle from '../../components/NavigationToggle';
import { usePagePersistence } from '../../components/PagePersistence';

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Use page persistence hook
  usePagePersistence('admin');

  const handleSubmit = async () => {
    if (!textInput.trim()) {
      setMessage('⚠️ Please enter some text before submitting.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/save-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textInput.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save text');
      }

      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ Text submitted successfully!');
        setTextInput(''); // Clear the form
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Submit operation failed');
      }
      
    } catch (error) {
      console.error('Error submitting text:', error);
      setMessage('❌ Failed to submit text. Please try again.');
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
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-400">
                {textInput.length} characters • {textInput.trim().split(/\s+/).filter(w => w.length > 0).length} words
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                Paragraphs will be split into individual sentences for labeling
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