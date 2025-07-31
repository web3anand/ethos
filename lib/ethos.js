import axios from 'axios';

/**
 * Fetch Ethos user data by Twitter handle.
 * @param {string} handle Twitter handle without @
 * @returns {Promise<Object|null>} The user data or null if not found.
 */
export async function fetchUserByTwitter(handle) {
  try {
    const url = `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(handle)}`;
    const res = await axios.get(url);
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Fetch the current ETH to USD exchange rate.
 * @returns {Promise<number|null>} ETH price in USD or null on error.
 */
export async function fetchExchangeRate() {
  try {
    const res = await axios.get('https://api.ethos.network/api/v1/exchange-rates');
    if (res.status === 200 && res.data && typeof res.data.ethUsd === 'number') {
      return res.data.ethUsd;
    }
  } catch {
    // ignore and fall back
  }

  try {
    const cgRes = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      { params: { ids: 'ethereum', vs_currencies: 'usd' } }
    );
    if (cgRes.status === 200 && cgRes.data?.ethereum?.usd != null) {
      return cgRes.data.ethereum.usd;
    }
  } catch {
    // ignore
  }

  return null;
}
