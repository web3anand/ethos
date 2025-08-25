import { useState, useEffect, useRef } from 'react';
import fetchUserSuggestions from '../utils/fetchUserSuggestions';

// Helper function to format numbers (e.g., 1000000 -> 1M)
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

export default function SearchBar({ username, setUsername, onSearch, loading, onSuggestionSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef();
  const debounceTimer = useRef();

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Show suggestions immediately if we have a query
    if (username && username.length >= 2) {
      setShowSuggestions(true);
      setIsLoading(true);
      
      // Reduced debounce time from 150ms to 100ms for faster response
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await fetchUserSuggestions(username);
          setSuggestions(results);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 100);
    } else {
      // Hide suggestions for empty or single character input
      setSuggestions([]);
      setSelectedIndex(-1);
      setShowSuggestions(false);
      setIsLoading(false);
    }

    // Cleanup timer
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [username]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selected = suggestions[selectedIndex];
          selectSuggestion(selected);
        } else {
          onSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    setUsername(suggestion.username);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSuggestionSelect) onSuggestionSelect(suggestion);
    inputRef.current.blur();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg gap-2 relative px-2 sm:px-0">
      <div className="flex items-center w-full gap-2">
        <div className="relative flex-grow w-full">
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={e => {
              setUsername(e.target.value);
              // Automatically show suggestions when typing (reduced from 1 to 2 characters)
              if (e.target.value.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onFocus={() => {
              // Show suggestions on focus if we have content (reduced from 1 to 2 characters)
              if (username && username.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search by Twitter Username or Name"
            className="w-full p-4 bg-gray-900/70 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all duration-300 placeholder-gray-400 text-white text-base"
            autoComplete="off"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 10px 40px rgba(0,0,0,0.4)',
            }}
          />
          
          {showSuggestions && (suggestions.length > 0 || isLoading) && (
            <div className="absolute top-full left-0 w-full bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl z-50 mt-2 max-h-[400px] overflow-y-auto" style={{
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              <style jsx>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-300 text-sm font-medium">Searching...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                  <div key={suggestion.username + index} className="px-2 py-1">
                  <div
                    className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all duration-200 ${
                      selectedIndex === index 
                        ? 'bg-blue-600/40 shadow-lg' 
                        : 'hover:bg-gray-700/50'
                    }`}
                    onMouseDown={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {suggestion.avatarUrl ? (
                        <img 
                          src={suggestion.avatarUrl} 
                          alt={suggestion.displayName || suggestion.username} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-600/80" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-600/80">
                          {(suggestion.displayName || suggestion.username)[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-base leading-tight truncate">
                          {suggestion.displayName || suggestion.username}
                        </span>
                        {suggestion.verified && (
                          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm truncate">
                        @{suggestion.username}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {suggestion.score && (
                        <div className="bg-green-500/20 text-green-300 text-xs font-bold px-2 py-1 rounded-md border border-green-500/30">
                          {suggestion.score}
                        </div>
                      )}
                      {suggestion.followers && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{formatNumber(suggestion.followers)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-gray-400 text-sm font-medium">No users found</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={onSearch}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-5 py-4 rounded-2xl hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-blue-500/30 transform hover:scale-105 flex-shrink-0"
          style={{
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              <span className="hidden sm:inline">Searching...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
