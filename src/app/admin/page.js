'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated, redirectToLogin, logout } from '../../utils/auth';

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated()) {
      redirectToLogin('/admin');
      return;
    }
    setCheckingAuth(false);
  }, []);

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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          text: textInput.trim(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save text');
      }

      const result = await response.json();
      setMessage(`✅ Text appended successfully to: ${result.filename}`);
      setSavedFiles(prev => [result, ...prev.slice(0, 4)]); // Keep only last 5 entries for display
      setTextInput(''); // Clear input after successful save
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

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">
          <span className="animate-spin mr-2">⟳</span>
          Checking authentication...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Interface
            </h1>
            <div className="flex gap-2">
              <a 
                href="/" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                ← Back to Main
              </a>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Submit text paragraphs and save them to files
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Text Submission
          </h2>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Text Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter text paragraph:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text paragraph here..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={8}
            />
            
            {/* Text Statistics */}
            <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Words: {wordCount}</span>
              <span>Characters: {charCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !textInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </span>
              ) : (
                'Submit & Save'
              )}
            </button>
            
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Saved Files List */}
        {savedFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Submissions (appended to saved_texts.txt)
            </h3>
                          <div className="space-y-2">
                {savedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {file.wordCount} words, {file.charCount} characters
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(file.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 