'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);
  const [storageSetup, setStorageSetup] = useState(null);
  const [isSettingUpStorage, setIsSettingUpStorage] = useState(false);
  
  // CSV Data states
  const [csvStats, setCsvStats] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [isLoadingCsvStats, setIsLoadingCsvStats] = useState(false);
  const [isLoadingCsvData, setIsLoadingCsvData] = useState(false);
  const [csvCurrentPage, setCsvCurrentPage] = useState(1);
  const [csvError, setCsvError] = useState('');
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  useEffect(() => {
    // Load CSV stats on mount
    fetchCsvStats();
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
      setSavedFiles(prev => [result, ...prev.slice(0, 4)]); // Keep only last 5 entries for display
      setTextInput(''); // Clear input after successful save
      
      // Refresh CSV data if it exists to show updated counts
      if (csvStats && csvStats.exists) {
        setTimeout(() => fetchCsvStats(), 1000); // Small delay to ensure data is processed
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

  const handleSetupStorage = async () => {
    setIsSettingUpStorage(true);
    try {
      const response = await fetch('/api/setup-storage', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to setup storage');
      }

      const result = await response.json();
      setStorageSetup(result);
      
      if (result.success) {
        setMessage('✅ Supabase storage buckets setup completed successfully!');
      } else {
        setMessage('⚠️ Storage setup completed with some issues. Check console for details.');
      }
    } catch (error) {
      console.error('Error setting up storage:', error);
      setMessage('❌ Failed to setup Supabase storage. Please check your configuration.');
      setStorageSetup({ success: false, error: error.message });
    } finally {
      setIsSettingUpStorage(false);
    }
  };

  const fetchCsvStats = async () => {
    setIsLoadingCsvStats(true);
    setCsvError('');
    try {
      const response = await fetch('/api/csv-stats');

      if (!response.ok) {
        throw new Error('Failed to fetch CSV statistics');
      }

      const data = await response.json();
      setCsvStats(data);
      
      // Also fetch first page of data if CSV exists
      if (data.exists) {
        fetchCsvData(1);
      }
    } catch (error) {
      console.error('Error fetching CSV stats:', error);
      setCsvError('Failed to load CSV statistics');
    } finally {
      setIsLoadingCsvStats(false);
    }
  };

  const fetchCsvData = async (page = 1) => {
    setIsLoadingCsvData(true);
    setCsvError('');
    try {
      const response = await fetch(`/api/csv-data?page=${page}&limit=20`);

      if (!response.ok) {
        throw new Error('Failed to fetch CSV data');
      }

      const data = await response.json();
      setCsvData(data);
      setCsvCurrentPage(page);
    } catch (error) {
      console.error('Error fetching CSV data:', error);
      setCsvError('Failed to load CSV data');
    } finally {
      setIsLoadingCsvData(false);
    }
  };

  const handleRefreshCsv = () => {
    fetchCsvStats();
  };

  const handleCsvPageChange = (newPage) => {
    if (newPage >= 1 && csvData && newPage <= csvData.totalPages) {
      fetchCsvData(newPage);
    }
  };

  const handleDownloadCsv = async () => {
    setIsDownloadingCsv(true);
    setCsvError('');
    try {
      const response = await fetch('/api/download-csv');
      
      if (!response.ok) {
        throw new Error('Failed to download CSV file');
      }
      
      // Get the blob data and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'training_data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage('✅ CSV file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading CSV file:', error);
      setCsvError('Failed to download CSV file');
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const wordCount = textInput.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = textInput.length;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Admin Interface
            </h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <a 
                href="/" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-center text-sm sm:text-base"
              >
                ← Back to Main
              </a>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base">
            Submit text paragraphs and save them to Supabase storage
          </p>
        </div>

        {/* Storage Setup Section */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
            Supabase Storage Setup
          </h2>
          <p className="text-sm text-gray-200 mb-4">
            Initialize Supabase storage buckets for CSV data and text files. Run this once after setting up your Supabase project.
          </p>
          
          <button
            onClick={handleSetupStorage}
            disabled={isSettingUpStorage}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
          >
            {isSettingUpStorage ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⟳</span>
                Setting up storage...
              </span>
            ) : (
              'Setup Storage Buckets'
            )}
          </button>

          {storageSetup && (
            <div className="mt-4 p-3 rounded-lg bg-slate-700 border border-slate-500">
              <h4 className="text-sm font-semibold text-white mb-2">Setup Results:</h4>
              <div className="text-xs text-gray-300">
                <pre className="whitespace-pre-wrap overflow-auto max-h-32 bg-slate-800 p-2 rounded">
                  {JSON.stringify(storageSetup, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
            Raw Paragraph Submission
          </h2>

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
            <label className="block text-sm sm:text-base font-medium text-gray-200 mb-2">
              Enter raw text paragraph (will be saved as-is):
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your raw text paragraph here. It will be saved exactly as you type it, with no timestamps or formatting."
              className="w-full p-3 sm:p-4 border border-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black placeholder-gray-500 text-sm sm:text-base"
              rows={8}
            />
            
            {/* Text Statistics */}
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm text-gray-300">
              <span>Words: {wordCount}</span>
              <span>Characters: {charCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !textInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
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
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
            >
              Clear
            </button>
          </div>
        </div>

        {/* CSV Data Display */}
        <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              CSV Training Data
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDownloadCsv}
                disabled={!csvStats?.exists || isDownloadingCsv || isLoadingCsvStats || isLoadingCsvData}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm w-full sm:w-auto"
              >
                {isDownloadingCsv ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Downloading...
                  </span>
                ) : (
                  '📥 Download CSV'
                )}
              </button>
              <button
                onClick={handleRefreshCsv}
                disabled={isLoadingCsvStats || isLoadingCsvData}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm w-full sm:w-auto"
              >
                {isLoadingCsvStats || isLoadingCsvData ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Loading...
                  </span>
                ) : (
                  '🔄 Refresh'
                )}
              </button>
            </div>
          </div>

          {/* CSV Error Display */}
          {csvError && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/80 border border-red-600 text-red-200 text-sm sm:text-base">
              {csvError}
            </div>
          )}

          {/* CSV Statistics */}
          {csvStats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-white">
                File Statistics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-700/50 border border-blue-600 p-3 sm:p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-300">
                    {csvStats.totalEntries || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    Total Rows
                  </div>
                </div>
                <div className="bg-green-700/50 border border-green-600 p-3 sm:p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-300">
                    {csvStats.uniqueLabels || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    Unique Labels
                  </div>
                </div>
                <div className="bg-purple-700/50 border border-purple-600 p-3 sm:p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-300">
                    {csvStats.fileSize ? `${(csvStats.fileSize / 1024).toFixed(1)} KB` : '0 KB'}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    File Size
                  </div>
                </div>
                <div className="bg-orange-700/50 border border-orange-600 p-3 sm:p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-300">
                    {csvStats.storage || 'N/A'}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    Storage
                  </div>
                </div>
              </div>

              {/* Label Distribution */}
              {csvStats.labelCounts && Object.keys(csvStats.labelCounts).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2 text-white">
                    Label Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(csvStats.labelCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([label, count]) => {
                        const percentage = csvStats.totalEntries > 0 ? (count / csvStats.totalEntries * 100).toFixed(1) : 0;
                        return (
                          <div key={label} className="flex justify-between items-center p-2 bg-slate-700 border border-slate-500 rounded">
                            <span className="text-sm font-medium text-gray-200 capitalize">
                              {label}
                            </span>
                            <span className="text-sm text-gray-300">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSV Data Table */}
          {csvData && csvData.exists && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2 sm:gap-0">
                <h3 className="text-lg font-semibold text-white">
                  CSV Data (Page {csvData.page} of {csvData.totalPages})
                </h3>
                <div className="flex items-center space-x-2 justify-center sm:justify-end">
                  <button
                    onClick={() => handleCsvPageChange(csvData.page - 1)}
                    disabled={!csvData.hasPrevPage || isLoadingCsvData}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-300 px-2">
                    {csvData.page} / {csvData.totalPages}
                  </span>
                  <button
                    onClick={() => handleCsvPageChange(csvData.page + 1)}
                    disabled={!csvData.hasNextPage || isLoadingCsvData}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-500">
                  <thead>
                    <tr className="bg-slate-700">
                      <th className="border border-slate-500 px-2 sm:px-4 py-2 text-left text-sm font-semibold text-gray-200">
                        #
                      </th>
                      <th className="border border-slate-500 px-2 sm:px-4 py-2 text-left text-sm font-semibold text-gray-200">
                        Text
                      </th>
                      <th className="border border-slate-500 px-2 sm:px-4 py-2 text-left text-sm font-semibold text-gray-200">
                        Label
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.entries.map((entry, index) => (
                      <tr key={entry.id} className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700'}>
                        <td className="border border-slate-500 px-2 sm:px-4 py-2 text-sm text-gray-200">
                          {entry.id}
                        </td>
                        <td className="border border-slate-500 px-2 sm:px-4 py-2 text-sm text-gray-200">
                          <div className="max-w-md">
                            <div className="truncate" title={entry.text}>
                              {entry.textPreview}
                            </div>
                          </div>
                        </td>
                        <td className="border border-slate-500 px-2 sm:px-4 py-2">
                          <span className="inline-block bg-blue-700/60 text-blue-200 px-2 py-1 rounded text-xs font-medium capitalize border border-blue-600">
                            {entry.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {csvStats && !csvStats.exists && (
            <div className="text-center py-8 text-gray-300">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">No CSV Data Yet</h3>
              <p className="text-sm">
                Start labeling text data on the main page to see it appear here.
              </p>
              <p className="text-xs mt-2 opacity-75">
                Once you have data, you can download the CSV file using the download button above.
              </p>
            </div>
          )}

          {/* Download Info */}
          {csvStats && csvStats.exists && csvStats.totalEntries > 0 && (
            <div className="mt-4 p-3 bg-blue-700/50 border border-blue-600 rounded-lg">
              <div className="flex items-center text-sm text-blue-200">
                <span className="mr-2">💡</span>
                <span>
                  Download contains {csvStats.totalEntries} labeled text entries in tab-separated format. 
                  Perfect for machine learning training datasets.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Saved Files List */}
        {savedFiles.length > 0 && (
          <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500 mt-4 sm:mt-6">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Recent Submissions (saved to Supabase storage)
            </h3>
            <div className="space-y-2">
              {savedFiles.map((file, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-slate-700 border border-slate-500 rounded gap-2 sm:gap-0">
                  <span className="text-sm text-gray-200">
                    {file.wordCount} words, {file.charCount} characters
                  </span>
                  <span className="text-xs text-gray-300">
                    Raw paragraph saved
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