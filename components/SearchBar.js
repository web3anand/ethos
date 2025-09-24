import { useState, useEffect, useRef } from 'react';
import fetchUserSuggestions from '../utils/fetchUserSuggestions';
import LoadingBars from './LoadingBars';
import styles from './SearchBar.module.css';

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
    <div className={styles.searchContainer}>
      <div className={styles.searchInputContainer}>
        <div className={styles.inputWrapper}>
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
            className={styles.searchInput}
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
              className={styles.clearButton}
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
          className={styles.searchButton}
        >
          {isSearching || loading ? (
            <div className={styles.searchButtonContent}>
              <LoadingBars size="small" color="white" />
              <span>Searching...</span>
            </div>
          ) : (
            'Search'
          )}
        </button>
      </div>
      
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className={styles.suggestionsContainer} style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          <style jsx>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          <div className={styles.suggestionsContent}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingBars size="small" color="blue" className="mr-3" />
                <span className={styles.loadingText}>Searching...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div key={suggestion.username + index} className={styles.suggestionItem} style={{ animationDelay: `${index * 50}ms` }}>
                  <div
                    className={`${styles.suggestionContent} ${
                      selectedIndex === index ? styles.selected : ''
                    }`}
                    onMouseDown={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Avatar */}
                    <div className={styles.avatarContainer}>
                      {suggestion.avatarUrl ? (
                        <img 
                          src={suggestion.avatarUrl} 
                          alt={suggestion.displayName || suggestion.username} 
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {(suggestion.displayName || suggestion.username)[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className={styles.userInfo}>
                      <div className={styles.userNameContainer}>
                        <span className={styles.userName}>
                          {suggestion.displayName || suggestion.username}
                        </span>
                        {suggestion.verified && (
                          <svg className={styles.verifiedIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                          </svg>
                        )}
                      </div>
                      <div className={styles.username}>
                        @{suggestion.username}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsContainer}>
                      {suggestion.score && (
                        <div className={styles.scoreBadge}>
                          {suggestion.score}
                        </div>
                      )}
                      {suggestion.followers && (
                        <div className={styles.followersContainer}>
                          <svg className={styles.followersIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className={styles.noResultsContainer}>
                <span className={styles.noResultsText}>No users found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}