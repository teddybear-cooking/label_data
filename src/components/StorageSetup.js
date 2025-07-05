import { useState } from 'react';

export default function StorageSetup() {
  const [storageSetup, setStorageSetup] = useState(null);
  const [isSettingUpStorage, setIsSettingUpStorage] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetupStorage = async () => {
    setIsSettingUpStorage(true);
    setMessage('');
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

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 border border-slate-500">
      <h2 className="text-lg font-semibold mb-3 text-white">
        Supabase Storage Setup
      </h2>
      <p className="text-sm text-gray-200 mb-4">
        Initialize Supabase storage buckets for CSV data and text files. Run this once after setting up your Supabase project.
      </p>
      
      {message && (
        <div className={`mb-3 p-2 rounded-lg text-sm ${
          message.includes('✅') 
            ? 'bg-green-900/80 border border-green-600 text-green-200' 
            : 'bg-red-900/80 border border-red-600 text-red-200'
        }`}>
          {message}
        </div>
      )}
      
      <button
        onClick={handleSetupStorage}
        disabled={isSettingUpStorage}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-600 text-sm w-full sm:w-auto"
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
        <div className="mt-4 p-2 rounded-lg bg-slate-700 border border-slate-500">
          <h4 className="text-sm font-semibold text-white mb-2">Setup Results:</h4>
          <div className="text-xs text-gray-300">
            <pre className="whitespace-pre-wrap overflow-auto max-h-24 bg-slate-800 p-2 rounded">
              {JSON.stringify(storageSetup, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 