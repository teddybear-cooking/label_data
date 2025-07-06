'use client';

import { useState, useEffect } from 'react';
import NavigationToggle from '../../components/NavigationToggle';
import { usePagePersistence } from '../../components/PagePersistence';

export default function DownloadPage() {
  const [fileStats, setFileStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupSql, setSetupSql] = useState('');

  // Use page persistence hook
  usePagePersistence('data');

  useEffect(() => {
    fetchFileStats();
  }, []);

  const fetchFileStats = async () => {
    setIsLoading(true);
    setError('');
    setSetupSql('');
    
    try {
      const response = await fetch('/api/csv-stats');
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'Database table not found') {
          setError(data.message || 'Database table not found. Please create the training_data table in your Supabase SQL editor.');
          if (data.sql) {
            setSetupSql(data.sql);
          }
        } else {
          setError(data.error || 'Failed to fetch file statistics');
        }
        return;
      }
      
      setFileStats(data);
    } catch (err) {
      console.error('Error fetching file stats:', err);
      setError('Failed to load file statistics. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

    const handleDownload = async () => {
    try {
      // Use the new download API that works with Supabase storage
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



  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header with Navigation Toggle */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              View Training Data
            </h1>
            <NavigationToggle currentPage="data" />
          </div>
          <p className="text-gray-300 text-sm sm:text-base">
            View statistics and download your collected training data
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin mr-3">⟳</span>
              <span className="text-gray-200">Loading file statistics...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
            <div className="text-red-200 text-center py-4">
              <h3 className="text-lg font-semibold mb-2">⚠️ Setup Required</h3>
              <p className="mb-4">{error}</p>
              {setupSql && (
                <div className="text-left bg-gray-800 p-4 rounded-lg border">
                  <p className="text-yellow-300 mb-2 text-sm">Run this SQL in your Supabase SQL editor:</p>
                  <pre className="text-green-300 text-xs overflow-x-auto whitespace-pre-wrap">
                    {setupSql.trim()}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(setupSql.trim())}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                  >
                    📋 Copy SQL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Statistics */}
        {fileStats && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
                File Overview
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-3 sm:p-4 bg-blue-700/50 border border-blue-600 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-blue-300">
                    {fileStats.totalEntries}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    Total Sentences
                  </div>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-green-700/50 border border-green-600 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-300">
                    {Object.keys(fileStats.labelCounts || {}).length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    Unique Labels
                  </div>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-purple-700/50 border border-purple-600 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-purple-300">
                    {formatFileSize(fileStats.fileSize)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200">
                    File Size
                  </div>
                </div>
              </div>
            </div>

            {/* Label Distribution */}
            {fileStats.labelCounts && Object.keys(fileStats.labelCounts).length > 0 && (
              <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
                  Label Distribution
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(fileStats.labelCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([label, count]) => {
                      const percentage = fileStats.totalEntries > 0 ? (count / fileStats.totalEntries * 100).toFixed(1) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between p-3 bg-slate-700 border border-slate-500 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="capitalize font-medium text-gray-200">
                              {label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-300">
                              {percentage}%
                            </div>
                            <div className="font-semibold text-gray-200">
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
            <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
                Download Options
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleDownload}
                  disabled={!fileStats.exists || fileStats.totalEntries === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
                >
                  Download CSV File
                </button>
                
                <button
                  onClick={fetchFileStats}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
                >
                  Refresh Statistics
                </button>

                <button
                  onClick={handleClearCSV}
                  disabled={!fileStats.exists || fileStats.totalEntries === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm sm:text-base w-full sm:w-auto"
                >
                  Clear CSV Data
                </button>
              </div>
              
              {fileStats.totalEntries === 0 && (
                <div className="mt-4 p-3 bg-yellow-700/50 border border-yellow-600 text-yellow-200 rounded-lg text-sm sm:text-base">
                  No training data available. Start collecting data through the main interface.
                </div>
              )}
            </div>

            {/* File Preview */}
            {fileStats.sampleEntries && fileStats.sampleEntries.length > 0 && (
              <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 sm:p-6 border border-slate-500">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">
                  Sample Data (First 5 entries)
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-500">
                        <th className="text-left py-2 px-3 font-medium text-gray-200">Text</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-200">Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileStats.sampleEntries.map((entry, index) => (
                        <tr key={index} className="border-b border-slate-500">
                          <td className="py-2 px-3 text-gray-300 max-w-md truncate">
                            {entry.text}
                          </td>
                          <td className="py-2 px-3 text-gray-200 capitalize">
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