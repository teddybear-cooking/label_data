'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated, redirectToLogin, logout } from '../../utils/auth';

export default function DownloadPage() {
  const [fileStats, setFileStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated()) {
      redirectToLogin('/download');
      return;
    }
    setCheckingAuth(false);
    fetchFileStats();
  }, []);

  const fetchFileStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/csv-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch file statistics');
      }
      const data = await response.json();
      setFileStats(data);
    } catch (err) {
      console.error('Error fetching file stats:', err);
      setError('Failed to load file statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Use the new download API that works with Supabase storage
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
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download CSV file');
    }
  };

  const handleClearCSV = async () => {
    if (!confirm('Are you sure you want to clear all training data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/clear-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear CSV file');
      }
      
      // Refresh statistics to show empty state
      await fetchFileStats();
    } catch (err) {
      console.error('Error clearing CSV file:', err);
      setError('Failed to clear CSV file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
              Download Training Data
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
            View statistics and download your collected training data
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin mr-3">⟳</span>
              Loading file statistics...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              {error}
            </div>
          </div>
        )}

        {/* File Statistics */}
        {fileStats && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                File Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {fileStats.totalEntries}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Sentences
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Object.keys(fileStats.labelCounts || {}).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Unique Labels
                  </div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatFileSize(fileStats.fileSize)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    File Size
                  </div>
                </div>
              </div>
            </div>

            {/* Label Distribution */}
            {fileStats.labelCounts && Object.keys(fileStats.labelCounts).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Label Distribution
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(fileStats.labelCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([label, count]) => {
                      const percentage = fileStats.totalEntries > 0 ? (count / fileStats.totalEntries * 100).toFixed(1) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="capitalize font-medium text-gray-700 dark:text-gray-300">
                              {label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {percentage}%
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Download Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Download Options
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDownload}
                  disabled={!fileStats.exists || fileStats.totalEntries === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Download CSV File
                </button>
                
                <button
                  onClick={fetchFileStats}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Refresh Statistics
                </button>

                <button
                  onClick={handleClearCSV}
                  disabled={!fileStats.exists || fileStats.totalEntries === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Clear CSV Data
                </button>
              </div>
              
              {fileStats.totalEntries === 0 && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                  No training data available. Start collecting data through the main interface.
                </div>
              )}
            </div>

            {/* File Preview */}
            {fileStats.sampleEntries && fileStats.sampleEntries.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Sample Data (First 5 entries)
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Text</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileStats.sampleEntries.map((entry, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 max-w-md truncate">
                            {entry.text}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white capitalize">
                            {entry.label}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 