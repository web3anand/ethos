import Head from 'next/head';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import UserResults from '../components/UserResults';
import { useState } from 'react';
import fetchEthosUserByTwitter from '../utils/ethosApi';

import fetchUserData from '../utils/ethosApi';


export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEthosUserByTwitter(username);
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
