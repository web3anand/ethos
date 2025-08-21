import { useState, useEffect, useRef } from 'react';
import fetchUserSuggestions from '../utils/fetchUserSuggestions';

export default function SearchBar({ username, setUsername, onSearch, loading, onSuggestionSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    let active = true;
    if (username && username.length > 1) {
      fetchUserSuggestions(username).then(s => {
        if (active) setSuggestions(s);
      });
    } else {
      setSuggestions([]);
    }
    return () => { active = false; };
  }, [username]);

  return (
    <div className="flex flex-col items-center w-full max-w-md gap-2 relative">
      <div className="flex items-center w-full gap-2">
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={e => {
            setUsername(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          placeholder="Search by Twitter Username or Name"
          className="flex-grow p-2 border border-gray-300 rounded-md"
          autoComplete="off"
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-md shadow z-10 mt-1 max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.username + i}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => {
                setUsername(s.username);
                setShowSuggestions(false);
                if (onSuggestionSelect) onSuggestionSelect(s);
                inputRef.current.blur();
              }}
            >
              {s.avatarUrl && (
                <img src={s.avatarUrl} alt={s.displayName || s.username} className="w-7 h-7 rounded-full object-cover" />
              )}
              <span className="font-semibold">{s.displayName || s.username}</span>
              <span className="text-gray-500 text-xs">@{s.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
