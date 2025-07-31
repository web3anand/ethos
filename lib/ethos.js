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
    if (res.status === 200 && res.data) {
      return res.data.ethUsd;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all addresses associated with a user's profile.
 * @param {string|number} profileId The numeric profile ID.
 * @returns {Promise<Array>} Array of address objects or an empty array on error.
 */
export async function fetchUserAddresses(profileId) {
  if (!profileId) return [];
  try {
    const res = await axios.get(
      `https://api.ethos.network/api/v1/users/${encodeURIComponent(profileId)}/addresses`
    );
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch {
    return [];
  }
}
