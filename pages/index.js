import { useState } from 'react';
import { fetchEthosUserByTwitter } from '../lib/ethos';

export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEthosUserByTwitter(username.trim());
      if (result === null) {
        setError('User not found');
        setUserData(null);
      } else {
        setUserData(result);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Ethos Search</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Twitter handle"
          className="border p-2 rounded"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Search
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {userData && (
        <pre className="bg-gray-100 p-4 rounded w-full overflow-auto">
          {JSON.stringify(userData, null, 2)}
        </pre>
      )}
    </div>
  );
}
