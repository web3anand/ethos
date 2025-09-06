import React from 'react';
import styles from './SearchBar.module.css';

const SearchBar = ({ query, onQueryChange, onClear, suggestions, onSelectSuggestion, showSuggestions, onFocus, onBlur }) => {
  return (
    <div className={styles.searchWrapper} onFocus={onFocus} onBlur={onBlur}>
      <input
        type="text"
        className={styles.searchInput}
        value={query}
        onChange={onQueryChange}
        placeholder="Search for an Ethos user by username, display name, or profile ID"
      />
      {query && (
        <button onClick={onClear} className={styles.clearButton}>×</button>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestionsList}>
          {suggestions.map((user) => (
            <div
              key={user.profileId}
              className={styles.suggestionItem}
              onMouseDown={() => onSelectSuggestion(user)}
            >
              <img src={user.avatarUrl || '/default-avatar.png'} alt={user.username} className={styles.avatar} />
              <div className={styles.userInfo}>
                <span className={styles.displayName}>{user.displayName || user.username}</span>
                <span className={styles.username}>@{user.username}</span>
              </div>
              <span className={styles.score}>Score: {user.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
