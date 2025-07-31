import axios from 'axios';

/**
 * Fetch an Ethos user by Twitter handle using the v2 API.
 *
 * @param {string} handle - Twitter username without the @ symbol.
 * @returns {Promise<Object|null>} Parsed user data or null if not found.
 */
export async function fetchEthosUserByTwitter(handle) {
  const url = `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(handle)}`;
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}
