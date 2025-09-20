import { useState, useEffect, useRef } from 'react';
import fetchUserSuggestions from '../utils/fetchUserSuggestions';
import LoadingBars from './LoadingBars';

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
  const [isSearching, setIsSearching] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef();
  const debounceTimer = useRef();
  const searchTimeoutRef = useRef();

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Show suggestions immediately if we have a query
    if (username && username.length >= 2) {
      setShowSuggestions(true);
      setIsLoading(true);
      setIsAnimating(true);
      
      // Reduced debounce time to 50ms for much faster response
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
          // Small delay to allow animations to complete
          setTimeout(() => setIsAnimating(false), 100);
        }
      }, 50); // Much faster - 50ms
    } else {
      // Hide suggestions for empty or single character input
      setSuggestions([]);
      setSelectedIndex(-1);
      setShowSuggestions(false);
      setIsLoading(false);
      setIsAnimating(false);
    }

    // Cleanup timer
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [username]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
        } else if (username.trim()) {
          triggerSearch(username.trim());
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

  // Manual search function - only triggered by user action
  const triggerSearch = (searchTerm) => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      setShowSuggestions(false);
      
      // Add 300ms delay before showing results
      const searchTimeout = setTimeout(() => {
        onSearch(searchTerm.trim());
        setIsSearching(false);
      }, 300);
      
      // Store timeout reference for cleanup
      searchTimeoutRef.current = searchTimeout;
    }
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
              const value = e.target.value;
              setUsername(value);
              // Automatically show suggestions when typing (reduced from 1 to 2 characters)
              if (value.length >= 2) {
                setShowSuggestions(true);
              }
              // Clear any existing search state when typing
              setIsSearching(false);
            }}
            onFocus={() => {
              // Show suggestions on focus if we have content (reduced from 1 to 2 characters)
              if (username && username.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search by Twitter Username or Name"
            className="w-full p-4 pr-12 bg-gray-900/70 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all duration-300 placeholder-gray-400 text-white text-base"
            autoComplete="off"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 10px 40px rgba(0,0,0,0.4)',
            }}
          />
          
          {isSearching ? (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <LoadingBars size="small" color="gray" />
            </div>
          ) : username ? (
            <button
              onClick={() => {
                setUsername('');
                setShowSuggestions(false);
                setSuggestions([]);
                setIsSearching(false);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
              type="button"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        
        {/* Search Button */}
        <button
          onClick={() => triggerSearch(username.trim())}
          disabled={!username.trim() || isSearching || loading}
          className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          {isSearching || loading ? (
            <div className="flex items-center gap-2">
              <LoadingBars size="small" color="white" />
              <span>Searching...</span>
            </div>
          ) : (
            'Search'
          )}
        </button>
      </div>
      
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 w-full bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl z-50 mt-2 max-h-[400px] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200" style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          <style jsx>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 animate-in fade-in-0 duration-200">
                <LoadingBars size="small" color="blue" className="mr-3" />
                <span className="text-gray-300 text-sm font-medium">Searching...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div key={suggestion.username + index} className="px-2 py-1 animate-in fade-in-0 slide-in-from-left-1 duration-150" style={{ animationDelay: `${index * 50}ms` }}>
                  <div
                    className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all duration-150 ${
                      selectedIndex === index 
                        ? 'bg-blue-600/40 shadow-lg scale-[1.02]' 
                        : 'hover:bg-gray-700/50 hover:scale-[1.01]'
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
  );
}