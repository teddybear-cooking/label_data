'use client';

import { useState } from 'react';
import NavigationToggle from '../components/NavigationToggle';
import { usePagePersistence } from '../components/PagePersistence';
import TextInputForm from '../components/TextInputForm';
import SentenceLabeling from '../components/SentenceLabeling';

export default function Home() {
  const [error, setError] = useState('');

  // Use page persistence hook
  usePagePersistence('main');

  const handleError = (errorMessage) => {
    setError(errorMessage);
      setTimeout(() => setError(''), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header with Navigation Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Text Labeling Tool
          </h1>
          <NavigationToggle currentPage="main" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/80 border border-red-600 text-red-200 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

        {/* Main Form Section - User Input with Predictions */}
        <TextInputForm onError={handleError} />

        {/* Readonly Sentence Section - No Predictions */}
        <SentenceLabeling onError={handleError} />

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Write your own text or label provided sentences to contribute training data.</p>
        </div>
      </div>
    </div>
  );
}
