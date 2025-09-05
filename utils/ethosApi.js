import axios from 'axios';

export default async function fetchUserData(username) {
  try {
    // Try the v2 search endpoint first
    const searchUrl = `https://api.ethos.network/api/v2/users/search?query=${encodeURIComponent(username)}&limit=10`;
    
    try {
      const searchResponse = await axios.get(searchUrl);
      if (searchResponse.data && searchResponse.data.values && searchResponse.data.values.length > 0) {
        return { users: searchResponse.data.values };
      }
    } catch (searchError) {
      console.warn('V2 search failed, trying username lookup:', searchError);
    }

    // Try direct username lookup
    const usernameUrl = `https://api.ethos.network/api/v2/user/by/username/${encodeURIComponent(username)}`;
    
    try {
      const usernameResponse = await axios.get(usernameUrl);
      if (usernameResponse.data) {
        return { users: [usernameResponse.data] };
      }
    } catch (usernameError) {
      console.warn('Username lookup failed, trying X username:', usernameError);
    }

    // Try X username lookup
    const xUsernameUrl = `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(username)}`;
    
    try {
      const xResponse = await axios.get(xUsernameUrl);
      if (xResponse.data) {
        return { users: [xResponse.data] };
      }
    } catch (xError) {
      console.warn('X username lookup failed:', xError);
    }

    // If all methods fail, return empty result
    return { users: [] };
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}
