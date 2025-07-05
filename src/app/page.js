'use client';

import { useState } from 'react';
import StorageSetup from '../components/StorageSetup';
import RawParagraphSubmission from '../components/RawParagraphSubmission';
import TextInputForm from '../components/TextInputForm';
import SentenceLabeling from '../components/SentenceLabeling';
import CsvDataDisplay from '../components/CsvDataDisplay';
import SavedFilesList from '../components/SavedFilesList';

export default function Home() {
  const [savedFiles, setSavedFiles] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('collection');

  const handleSubmissionSuccess = (result) => {
    // Add to saved files list for display
    setSavedFiles(prev => [result, ...prev.slice(0, 4)]); // Keep only last 5 entries
    
    // Trigger CSV data refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'collection', label: 'Data Collection', icon: '📝' },
    { id: 'admin', label: 'Admin Tools', icon: '⚙️' },
    { id: 'data', label: 'Data Management', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="container mx-auto px-4 py-4 max-w-7xl flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2">
            collecting sentences to train the model
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Write your own text or label provided sentences to contribute training data
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-[#1e4558]/50 p-1 rounded-lg border border-slate-500 w-full sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-[#254761]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'collection' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
              {/* Left Column - Text Input */}
              <div className="flex flex-col min-h-0 h-full lg:h-auto">
                <div className="flex-1 min-h-96 lg:min-h-0">
                  <TextInputForm onSubmissionSuccess={handleSubmissionSuccess} />
                </div>
              </div>
              
              {/* Right Column - Sentence Labeling */}
              <div className="flex flex-col min-h-0 h-full lg:h-auto">
                <div className="flex-1 min-h-96 lg:min-h-0">
                  <SentenceLabeling onSubmissionSuccess={handleSubmissionSuccess} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
              {/* Left Column - Storage Setup */}
              <div className="flex flex-col min-h-0 order-1 lg:order-none">
                <div className="h-fit">
                  <StorageSetup />
                </div>
              </div>
              
              {/* Right Column - Raw Paragraph Submission */}
              <div className="flex flex-col min-h-0 h-full lg:h-auto order-2 lg:order-none">
                <div className="flex-1 min-h-96 lg:min-h-0">
                  <RawParagraphSubmission onSubmissionSuccess={handleSubmissionSuccess} />
                </div>
                {/* Saved Files List */}
                <div className="mt-4 order-3 lg:order-none">
                  <SavedFilesList savedFiles={savedFiles} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="h-full min-h-96">
              <CsvDataDisplay refreshTrigger={refreshTrigger} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
