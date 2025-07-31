export default function SearchBar({ username, setUsername, onSearch, loading }) {
  return (
    <div className="flex items-center w-full max-w-md gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Search by Twitter Username"
        className="flex-grow p-2 border border-gray-300 rounded-md"
      />
      <button
        onClick={onSearch}
        disabled={loading}
        className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Search'}
      </button>
    </div>
  );
}
