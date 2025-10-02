'use client';

import { useState, useEffect } from 'react';
import { api, type SearchResult } from '@/lib/api';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onClose: () => void;
  onSelect: (noteName: string) => void;
}

export default function SearchBar({ onClose, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const searchDebounced = setTimeout(() => {
      if (query.length > 1) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const data = await api.search(q);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            query.length > 1 ? (
              <div className="p-8 text-center text-gray-500">No results found</div>
            ) : (
              <div className="p-8 text-center text-gray-500">Type to search</div>
            )
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result: SearchResult) => (
                <button
                  key={result.name}
                  onClick={() => onSelect(result.name)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium mb-1">
                    {result.title || result.name}
                  </div>
                  <div
                    className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                  {result.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {result.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
