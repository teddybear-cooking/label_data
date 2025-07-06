import { useState, useEffect } from 'react';

export default function CsvDataDisplay({ refreshTrigger }) {
  const [csvStats, setCsvStats] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [isLoadingCsvStats, setIsLoadingCsvStats] = useState(false);
  const [isLoadingCsvData, setIsLoadingCsvData] = useState(false);
  const [csvCurrentPage, setCsvCurrentPage] = useState(1);
  const [csvError, setCsvError] = useState('');
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isClearingCsv, setIsClearingCsv] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timestamp;
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
      
    } catch (error) {
      console.error('Error downloading CSV file:', error);
      setCsvError('Failed to download CSV file');
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleClearCsv = async () => {
    // Show confirmation dialog
    const confirmClear = window.confirm(
      'Are you sure you want to clear all CSV data? This action cannot be undone.'
    );
    
    if (!confirmClear) {
      return;
    }

    setIsClearingCsv(true);
    setCsvError('');
    try {
      const response = await fetch('/api/clear-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear CSV file');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        console.log('CSV cleared successfully:', result);
        
        // Reset all local state immediately
        setCsvStats(null);
        setCsvData(null);
        setCsvCurrentPage(1);
        
        // Refresh the data after clearing
        await fetchCsvStats();
        setCsvError(''); // Clear any previous errors
        
        // Show temporary success message
        setCsvError('✅ CSV file cleared successfully!');
        setTimeout(() => {
          setCsvError('');
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to clear CSV file');
      }
      
    } catch (error) {
      console.error('Error clearing CSV file:', error);
      setCsvError('Failed to clear CSV file');
    } finally {
      setIsClearingCsv(false);
    }
  };

  // Load CSV stats on mount and when refreshTrigger changes
  useEffect(() => {
    fetchCsvStats();
  }, [refreshTrigger]);

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 lg:p-6 border border-slate-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4 sm:gap-0">
        <h2 className="text-lg lg:text-xl font-semibold text-white">
          CSV Training Data
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!csvStats?.exists || isDownloadingCsv || isLoadingCsvStats || isLoadingCsvData}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base w-full sm:w-auto"
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
            onClick={() => setShowTimestamps(!showTimestamps)}
            disabled={!csvStats?.exists || isLoadingCsvStats || isLoadingCsvData}
            className={`${showTimestamps ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'} disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base w-full sm:w-auto`}
          >
            {showTimestamps ? '🕐 Hide Timestamps' : '🕐 Show Timestamps'}
          </button>
          <button
            onClick={handleRefreshCsv}
            disabled={isLoadingCsvStats || isLoadingCsvData}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base w-full sm:w-auto"
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
          <button
            onClick={handleClearCsv}
            disabled={!csvStats?.exists || isClearingCsv || isLoadingCsvStats || isLoadingCsvData}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base w-full sm:w-auto"
          >
            {isClearingCsv ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⟳</span>
                Clearing...
              </span>
            ) : (
              '🗑️ Clear CSV'
            )}
          </button>
        </div>
      </div>

      {/* CSV Error/Success Display */}
      {csvError && (
        <div className={`mb-3 p-2 rounded-lg text-sm lg:text-base ${
          csvError.includes('✅') 
            ? 'bg-green-900/80 border border-green-600 text-green-200' 
            : 'bg-red-900/80 border border-red-600 text-red-200'
        }`}>
          {csvError}
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* CSV Statistics */}
        {csvStats && (
          <div className="mb-4">
            <h3 className="text-lg lg:text-xl font-semibold mb-3 text-white">
              File Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              <div className="bg-blue-700/50 border border-blue-600 p-2 rounded-lg text-center">
                <div className="text-lg lg:text-xl font-bold text-blue-300">
                  {csvStats.totalEntries || 0}
                </div>
                <div className="text-xs lg:text-sm text-gray-200">
                  Total Rows
                </div>
              </div>
              <div className="bg-green-700/50 border border-green-600 p-2 rounded-lg text-center">
                <div className="text-lg lg:text-xl font-bold text-green-300">
                  {csvStats.uniqueLabels || 0}
                </div>
                <div className="text-xs lg:text-sm text-gray-200">
                  Unique Labels
                </div>
              </div>
              <div className="bg-purple-700/50 border border-purple-600 p-2 rounded-lg text-center">
                <div className="text-lg lg:text-xl font-bold text-purple-300">
                  {csvStats.fileSize ? `${(csvStats.fileSize / 1024).toFixed(1)} KB` : '0 KB'}
                </div>
                <div className="text-xs lg:text-sm text-gray-200">
                  File Size
                </div>
              </div>
              <div className="bg-orange-700/50 border border-orange-600 p-2 rounded-lg text-center">
                <div className="text-lg lg:text-xl font-bold text-orange-300">
                  {csvStats.storage || 'N/A'}
                </div>
                <div className="text-xs lg:text-sm text-gray-200">
                  Storage
                </div>
              </div>
            </div>

            {/* Label Distribution */}
            {csvStats.labelCounts && Object.keys(csvStats.labelCounts).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm lg:text-base font-semibold mb-2 text-white">
                  Label Distribution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {Object.entries(csvStats.labelCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([label, count]) => {
                      const percentage = csvStats.totalEntries > 0 ? (count / csvStats.totalEntries * 100).toFixed(1) : 0;
                      return (
                        <div key={label} className="flex justify-between items-center p-2 bg-slate-700 border border-slate-500 rounded text-xs lg:text-sm">
                          <span className="font-medium text-gray-200 capitalize">
                            {label}
                          </span>
                          <span className="text-gray-300">
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
              <h3 className="text-sm lg:text-base font-semibold text-white">
                CSV Data (Page {csvData.page} of {csvData.totalPages})
              </h3>
              <div className="flex items-center space-x-2 justify-center sm:justify-end">
                <button
                  onClick={() => handleCsvPageChange(csvData.page - 1)}
                  disabled={!csvData.hasPrevPage || isLoadingCsvData}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs lg:text-sm transition-colors duration-200"
                >
                  ← Prev
                </button>
                <span className="text-xs lg:text-sm text-gray-300 px-2">
                  {csvData.page} / {csvData.totalPages}
                </span>
                <button
                  onClick={() => handleCsvPageChange(csvData.page + 1)}
                  disabled={!csvData.hasNextPage || isLoadingCsvData}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs lg:text-sm transition-colors duration-200"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-500 text-xs lg:text-sm">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="border border-slate-500 px-2 py-1 text-left font-semibold text-gray-200">
                      #
                    </th>
                    <th className="border border-slate-500 px-2 py-1 text-left font-semibold text-gray-200">
                      Text
                    </th>
                    <th className="border border-slate-500 px-2 py-1 text-left font-semibold text-gray-200">
                      Label
                    </th>
                    {showTimestamps && (
                      <th className="border border-slate-500 px-2 py-1 text-left font-semibold text-gray-200">
                        Timestamp
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {csvData.entries.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700'}>
                      <td className="border border-slate-500 px-2 py-1 text-gray-200">
                        {entry.id}
                      </td>
                      <td className="border border-slate-500 px-2 py-1 text-gray-200">
                        <div className="max-w-md lg:max-w-lg">
                          <div className="truncate" title={entry.text}>
                            {entry.textPreview}
                          </div>
                        </div>
                      </td>
                      <td className="border border-slate-500 px-2 py-1">
                        <span className="inline-block bg-blue-700/60 text-blue-200 px-2 py-1 rounded text-xs lg:text-sm font-medium capitalize border border-blue-600">
                          {entry.label}
                        </span>
                      </td>
                      {showTimestamps && (
                        <td className="border border-slate-500 px-2 py-1 text-gray-200">
                          <div className="text-xs lg:text-sm text-gray-300">
                            {entry.created_at ? formatTimestamp(entry.created_at) : 'N/A'}
                          </div>
                        </td>
                      )}
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
            <h3 className="text-lg lg:text-xl font-semibold mb-2">No CSV Data Yet</h3>
            <p className="text-sm lg:text-base">
              Start labeling text data to see it appear here.
            </p>
            <p className="text-xs lg:text-sm mt-2 opacity-75">
              Once you have data, you can download the CSV file using the download button above.
            </p>
          </div>
        )}

        {/* Download Info */}
        {csvStats && csvStats.exists && csvStats.totalEntries > 0 && (
          <div className="mt-4 p-2 bg-blue-700/50 border border-blue-600 rounded-lg">
            <div className="flex items-center text-xs lg:text-sm text-blue-200">
              <span className="mr-2">💡</span>
              <span>
                Download contains {csvStats.totalEntries} labeled text entries in tab-separated format. 
                Perfect for machine learning training datasets.
                {showTimestamps && (
                  <span className="ml-2 text-purple-200">
                    • Timestamps are displayed for saved entries
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 