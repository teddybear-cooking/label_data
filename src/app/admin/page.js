'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated, redirectToLogin, logout } from '../../utils/auth';

export default function AdminPage() {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
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
    // Check authentication on mount
    if (!isAuthenticated()) {
      redirectToLogin('/admin');
      return;
    }
    setCheckingAuth(false);
    
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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
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
      const response = await fetch('/api/csv-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

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
      const response = await fetch(`/api/csv-data?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

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
      const response = await fetch('/api/download-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
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
            Submit text paragraphs and save them to Supabase storage
          </p>
        </div>

        {/* Storage Setup Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Supabase Storage Setup
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Initialize Supabase storage buckets for CSV data and text files. Run this once after setting up your Supabase project.
          </p>
          
          <button
            onClick={handleSetupStorage}
            disabled={isSettingUpStorage}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            {isSettingUpStorage ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⟳</span>
                Setting up storage...
              </span>
            ) : (
              'Setup Storage Buckets'
            )}
          </button>

          {storageSetup && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Setup Results:</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                  {JSON.stringify(storageSetup, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Raw Paragraph Submission
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
              Enter raw text paragraph (will be saved as-is):
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your raw text paragraph here. It will be saved exactly as you type it, with no timestamps or formatting."
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
                'Save Raw Paragraph'
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

        {/* CSV Data Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              CSV Training Data
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCsv}
                disabled={!csvStats?.exists || isDownloadingCsv || isLoadingCsvStats || isLoadingCsvData}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                {isDownloadingCsv ? (
                  <span className="flex items-center">
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
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                {isLoadingCsvStats || isLoadingCsvData ? (
                  <span className="flex items-center">
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
            <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {csvError}
            </div>
          )}

          {/* CSV Statistics */}
          {csvStats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                File Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {csvStats.totalEntries || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Rows
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {csvStats.uniqueLabels || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Unique Labels
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {csvStats.fileSize ? `${(csvStats.fileSize / 1024).toFixed(1)} KB` : '0 KB'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    File Size
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {csvStats.storage || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Storage
                  </div>
                </div>
              </div>

              {/* Label Distribution */}
              {csvStats.labelCounts && Object.keys(csvStats.labelCounts).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">
                    Label Distribution
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(csvStats.labelCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([label, count]) => {
                        const percentage = csvStats.totalEntries > 0 ? (count / csvStats.totalEntries * 100).toFixed(1) : 0;
                        return (
                          <div key={label} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                              {label}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  CSV Data (Page {csvData.page} of {csvData.totalPages})
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCsvPageChange(csvData.page - 1)}
                    disabled={!csvData.hasPrevPage || isLoadingCsvData}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
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
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        #
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Text
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Label
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.entries.map((entry, index) => (
                      <tr key={entry.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {entry.id}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          <div className="max-w-md">
                            <div className="truncate" title={entry.text}>
                              {entry.textPreview}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                          <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium capitalize">
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Submissions (saved to Supabase storage)
            </h3>
                          <div className="space-y-2">
                {savedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {file.wordCount} words, {file.charCount} characters
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
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