import { useState } from 'react';
import { fetchEthosUserByTwitter } from '../lib/ethos';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import UserResults from '../components/UserResults';
import { useState } from 'react';
import fetchUserData from '../utils/ethosApi';


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
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserData(username);
      setUserData(data);
    } catch (err) {
      console.error(err);
      setError('User not found or API error.');
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
    <>
      <Head>
        <title>Ethos Network Explorer</title>
        <meta
          name="description"
          content="Explore decentralized reputation on Ethos Network"
        />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
        <Navbar />
        <main className="flex flex-col items-center justify-start py-10 px-4">
          <h1 className="text-3xl sm:text-5xl font-bold text-center mb-6">
            Decentralizing trust & reputation.
          </h1>
          <SearchBar
            username={username}
            setUsername={setUsername}
            onSearch={handleSearch}
            loading={loading}
          />
          {error && (
            <p className="text-red-500 mt-4" data-testid="error-message">
              {error}
            </p>
          )}
          {userData && <UserResults data={userData} />}
        </main>
      </div>
    </>
  );
}
