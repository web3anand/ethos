// Utility helpers for Ethos API calls using fetch.

/**
 * Fetch Ethos user data by Twitter handle.
 * @param {string} handle Twitter handle without @
 * @returns {Promise<Object|null>} The user data or null if not found.
 */
export async function fetchUserByTwitter(handle) {
  try {
    const url = `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(
      handle
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchUserByTwitter:', json);
    return json;
  } catch (err) {
    console.error('fetchUserByTwitter error:', err);
    return null;
  }
}

/**
 * Fetch the current ETH to USD exchange rate.
 * @returns {Promise<number|null>} ETH price in USD or null on error.
 */
export async function fetchExchangeRate() {
  try {
    const res = await fetch(
      'https://api.ethos.network/api/v1/exchange-rates/eth-price'
    );
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchExchangeRate:', json);
    return json?.data?.price ?? null;
  } catch (err) {
    console.error('fetchExchangeRate error:', err);
    return null;
  }
}

/**
 * Fetch addresses for a given profile ID.
 * @param {string|number} profileId Profile identifier
 * @returns {Promise<Array>} Array of address objects or [] on error.
 */
export async function fetchUserAddresses(profileId) {
  try {
    const url = `https://api.ethos.network/api/v1/addresses/profileId:${encodeURIComponent(
      profileId
    )}`;
    const res = await fetch(url);
    if (!res.ok) return { primaryAddress: null, allAddresses: [] };
    const json = await res.json();
    console.log('fetchUserAddresses:', json);
    // The API returns { data: { profileId, primaryAddress, allAddresses } }
    return {
      primaryAddress: json?.data?.primaryAddress || null,
      allAddresses: Array.isArray(json?.data?.allAddresses) ? json.data.allAddresses : [],
    };
  } catch (err) {
    console.error('fetchUserAddresses error:', err);
    return { primaryAddress: null, allAddresses: [] };
  }
}

/**
 * Fetch user stats, including influence score.
 * @param {string} userKey The user key (e.g., `profileId:123` or `service:x.com:username`)
 * @returns {Promise<Object|null>}
 */
export async function fetchUserStats(userKey) {
  try {
    const url = `https://api.ethos.network/api/v1/stats/${encodeURIComponent(userKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchUserStats:', json);
    return json.data;
  } catch (err) {
    console.error('fetchUserStats error:', err);
    return null;
  }
}
