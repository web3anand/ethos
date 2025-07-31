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
      // Successful response – return the full payload
      return res.data;
    }

    // Any non-200 status (except 404 handled below) is unexpected
    return null;
  } catch (err) {
    // Return null specifically for 404s (user not found)
    if (err.response && err.response.status === 404) {
      return null;
    }
    // Propagate other errors so the caller can surface them
    throw err;
  }
}
