import axios from 'axios';

export default async function fetchEthPrice() {
  // Use CoinGecko API for live ETH price in USD
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
  const response = await axios.get(url);
  return response.data.ethereum.usd;
}
