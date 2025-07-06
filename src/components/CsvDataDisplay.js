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
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleDeleteRow = async (id) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this row? This action cannot be undone.'
    );
    
    if (!confirmDelete) {
      return;
    }

    setIsDeletingRow(true);
    try {
      const response = await fetch('/api/delete-row', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        throw new Error('Failed to delete row');
      }

      // Show success message
      setSuccessMessage('Row deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh data
      await fetchCsvStats();
    } catch (error) {
      console.error('Error deleting row:', error);
      setCsvError('Failed to delete row');
    } finally {
      setIsDeletingRow(false);
    }
  };

  const filterEntriesByDate = (entries) => {
    if (!entries || dateFilter === 'all') return entries;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      switch (dateFilter) {
        case 'today':
          return entryDate >= today;
        case 'week':
          return entryDate >= weekAgo;
        case 'month':
          return entryDate >= monthAgo;
        default:
          return true;
      }
    });
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

  const filteredEntries = csvData ? filterEntriesByDate(csvData.entries) : [];

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 lg:p-6 border border-slate-500 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4 sm:gap-0">
        <h2 className="text-lg lg:text-xl font-semibold text-white">
          Training Data
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!csvStats?.exists || isDownloadingCsv || isLoadingCsvStats || isLoadingCsvData}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base"
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
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base"
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
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm lg:text-base"
          >
            {isClearingCsv ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⟳</span>
                Clearing...
              </span>
            ) : (
              '🗑️ Clear All'
            )}
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-slate-700 text-white border border-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        {csvStats && (
          <div className="text-gray-300 text-sm flex items-center">
            {filteredEntries.length} entries shown
          </div>
        )}
      </div>

      {/* Messages */}
      {(csvError || successMessage) && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          successMessage 
            ? 'bg-green-900/80 border border-green-600 text-green-200' 
            : 'bg-red-900/80 border border-red-600 text-red-200'
        }`}>
          {successMessage || csvError}
        </div>
      )}

      {/* Data Table */}
      <div className="flex-grow overflow-auto">
        {csvData && csvData.entries.length > 0 ? (
          <div className="min-w-full divide-y divide-slate-600 border border-slate-600 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-slate-700 text-white">
              <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-4 p-3 text-sm font-semibold">
                <div>Text</div>
                <div>Label</div>
                <div>Date</div>
                <div>Actions</div>
              </div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-slate-600 bg-slate-800/50">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[1fr,1fr,auto,auto] gap-4 p-3 text-sm hover:bg-slate-700/50 transition-colors">
                  <div className="text-gray-300 break-words">{entry.textPreview}</div>
                  <div className="text-gray-300">{entry.label}</div>
                  <div className="text-gray-400 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteRow(entry.id)}
                      disabled={isDeletingRow}
                      className="text-red-400 hover:text-red-300 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                      title="Delete row"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            {isLoadingCsvData ? (
              <div className="flex items-center justify-center">
                <span className="animate-spin mr-2">⟳</span>
                Loading data...
              </div>
            ) : (
              'No training data available'
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {csvData && csvData.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => handleCsvPageChange(csvCurrentPage - 1)}
            disabled={!csvData.hasPrevPage || isLoadingCsvData}
            className="px-3 py-1 rounded-lg bg-slate-700 text-white disabled:bg-slate-600 disabled:text-gray-400 text-sm"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-300 text-sm">
            Page {csvCurrentPage} of {csvData.totalPages}
          </span>
          <button
            onClick={() => handleCsvPageChange(csvCurrentPage + 1)}
            disabled={!csvData.hasNextPage || isLoadingCsvData}
            className="px-3 py-1 rounded-lg bg-slate-700 text-white disabled:bg-slate-600 disabled:text-gray-400 text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 