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
