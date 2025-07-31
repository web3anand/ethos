import axios from 'axios';

export default async function fetchUserData(username) {
  const url = `https://api.ethos.network/api/v2/users?twitter=${encodeURIComponent(
    username
  )}`;
  const response = await axios.get(url);
  return response.data;
}
