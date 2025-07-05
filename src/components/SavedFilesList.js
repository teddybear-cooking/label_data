export default function SavedFilesList({ savedFiles }) {
  if (!savedFiles || savedFiles.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1B3C53] rounded-lg shadow-xl p-4 border border-slate-500">
      <h3 className="text-lg font-semibold mb-3 text-white">
        Recent Submissions
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {savedFiles.map((file, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-slate-700 border border-slate-500 rounded gap-1 sm:gap-0">
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
  );
} 