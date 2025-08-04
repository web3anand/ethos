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
    const { data } = await res.json();
    return data;
  } catch {
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
    const priceData = await res.json();
    return priceData.data?.price ?? null;
  } catch {
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
    if (!res.ok) return [];
    const addrData = await res.json();
    return Array.isArray(addrData.data) ? addrData.data : [];
  } catch {
    return [];
  }
}
