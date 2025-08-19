// Fetch user suggestions by partial username or display name
// Returns an array of { username, displayName, avatarUrl }

export default async function fetchUserSuggestions(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = `https://api.ethos.network/api/v2/users/suggest?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    // Expecting json.data to be an array of user objects
    return Array.isArray(json.data)
      ? json.data.map(u => ({
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        }))
      : [];
  } catch (err) {
    console.error('fetchUserSuggestions error:', err);
    return [];
  }
}
