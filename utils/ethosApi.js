import axios from 'axios';

/**
 * Fetch an Ethos user record by Twitter handle, refreshing the data if it does
 * not already exist.
 *
 * The function performs the following steps:
 * 1. Attempt to GET `/api/v2/user/by/x/{handle}`.
 * 2. If that request returns 404, POST to `/api/v2/users/refresh/x` with the
 *    handle and retry the GET.
 * 3. If the retry also returns 404, `null` is returned.
 * 4. Any other HTTP or network error is rethrown.
 *
 * @param {string} handle - The Twitter username to look up, without the @ sign.
 * @returns {Promise<Object|null>} The user data object or `null` if not found.
 */
export default async function fetchEthosUserByTwitter(handle) {
  const base = 'https://api.ethos.network/api/v2';
  const userUrl = `${base}/user/by/x/${encodeURIComponent(handle)}`;

  try {
    // First attempt to fetch the user
    const { data } = await axios.get(userUrl);
    return data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      try {
        // Trigger a refresh for the given handle
        await axios.post(`${base}/users/refresh/x`, {
          accountIdsOrUsernames: [handle],
        });
        // Retry fetching the user after refresh
        const { data } = await axios.get(userUrl);
        return data;
      } catch (retryErr) {
        if (retryErr.response && retryErr.response.status === 404) {
          return null; // user does not exist
        }
        throw retryErr;
      }
    }

    throw err;
  }
}
