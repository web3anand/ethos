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
    const res = await axios.get(
      'https://api.ethos.network/api/v1/exchange-rates/eth-price'
    );
    if (res.status === 200 && res.data) {
      const price =
        res.data.price ?? res.data.ethUsd ?? res.data.eth_usd ?? null;
      if (typeof price === 'number') {
        return price;
      }
    }
  } catch {
    // ignore errors
  }
  return null;
}

/**
 * Fetch addresses for a given profile ID.
 * @param {string|number} profileId Profile identifier
 * @returns {Promise<Array>} Array of address objects or [] on error.
 */
export async function fetchUserAddresses(profileId) {
  try {
    const url =
      `https://api.ethos.network/api/v1/addresses/profileId:${encodeURIComponent(
        profileId
      )}`;
    const res = await axios.get(url);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
  } catch {
    // ignore errors
  }
  return [];
}
