'use client';

import { useState, useEffect } from 'react';
import NavigationToggle from '../../components/NavigationToggle';
import { usePagePersistence } from '../../components/PagePersistence';

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [savedParagraphs, setSavedParagraphs] = useState([]);

  // Use page persistence hook
  usePagePersistence('admin');

  // Load saved paragraphs on mount
  useEffect(() => {
    const saved = localStorage.getItem('adminParagraphs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedParagraphs(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error loading saved paragraphs:', e);
        setSavedParagraphs([]);
      }
    }
  }, []);

  // Save paragraphs to localStorage
  const saveParagraphToStorage = (text) => {
    const newParagraphs = [...savedParagraphs, { 
      id: Date.now(), 
      text, 
      timestamp: new Date().toISOString() 
    }];
    setSavedParagraphs(newParagraphs);
    localStorage.setItem('adminParagraphs', JSON.stringify(newParagraphs));
  };

  // Delete a paragraph
  const deleteParagraph = (id) => {
    const newParagraphs = savedParagraphs.filter(p => p.id !== id);
    setSavedParagraphs(newParagraphs);
    localStorage.setItem('adminParagraphs', JSON.stringify(newParagraphs));
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
        // Save to localStorage before clearing
        saveParagraphToStorage(cleanedText);
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
          <div className="mb-4">
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
              <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-right">
                Paragraphs will be split into individual sentences for labeling
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto transform ${
                !canSubmit 
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
        </div>

        {/* Saved Paragraphs Section */}
        {savedParagraphs.length > 0 && (
          <div className="mt-6 bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
              Saved Paragraphs
            </h2>
            <div className="space-y-4">
              {savedParagraphs.map((paragraph) => (
                <div key={paragraph.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm text-gray-300 flex-grow line-clamp-3">
                      {paragraph.text}
                    </p>
                    <button
                      onClick={() => deleteParagraph(paragraph.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                      title="Delete paragraph"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(paragraph.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Submit training paragraphs that will be used to generate sentences for labeling on the main page.</p>
        </div>
      </div>
    </div>
  );
} 