// Ethos Contract API client for getting all staker addresses
class EthosContractApi {
  constructor() {
    // Using public RPC endpoints (you can add your own API key for better performance)
    this.rpcUrl = 'https://eth-mainnet.public.blastapi.io';
    this.backupRpcUrls = [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.llamarpc.com'
    ];
    
    // Ethos contract addresses (we'll need to find the actual ones)
    this.ethosStakingContract = '0x1234567890123456789012345678901234567890'; // Placeholder
    this.ethosTokenContract = '0x1234567890123456789012345678901234567890'; // Placeholder
    
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes for blockchain data
  }

  // Initialize the contract connection
  async initialize() {
    try {
      console.log('[Contract API] Initializing blockchain connection...');
      
      // Test RPC connection
      const testUrl = this.rpcUrl;
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const blockNumber = parseInt(data.result, 16);
        console.log(`[Contract API] ✅ Connected to Ethereum mainnet, block: ${blockNumber.toLocaleString()}`);
        return true;
      } else {
        throw new Error(`RPC connection failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('[Contract API] ❌ Failed to initialize:', error);
      return false;
    }
  }

  // Make RPC call to Ethereum network
  async makeRpcCall(method, params = []) {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    };

    for (const rpcUrl of [this.rpcUrl, ...this.backupRpcUrls]) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            throw new Error(`RPC Error: ${data.error.message}`);
          }
          return data.result;
        }
      } catch (error) {
        console.warn(`[Contract API] RPC call failed on ${rpcUrl}:`, error.message);
        continue;
      }
    }
    
    throw new Error('All RPC endpoints failed');
  }

  // Get transaction logs for a specific contract and topic
  async getLogs(contractAddress, topics, fromBlock = '0x0', toBlock = 'latest') {
    const cacheKey = `logs:${contractAddress}:${topics.join(',')}:${fromBlock}:${toBlock}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('[Contract API] Cache hit for contract logs');
      return cached.data;
    }

    try {
      console.log(`[Contract API] Fetching logs for contract ${contractAddress}...`);
      
      const logs = await this.makeRpcCall('eth_getLogs', [{
        address: contractAddress,
        fromBlock,
        toBlock,
        topics
      }]);

      console.log(`[Contract API] Found ${logs.length} log entries`);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: logs,
        timestamp: Date.now()
      });

      return logs;
    } catch (error) {
      console.error('[Contract API] Error fetching logs:', error);
      throw error;
    }
  }

  // Get all Transfer events from Ethos token contract to find stakers
  async getAllEthosTokenHolders() {
    try {
      console.log('[Contract API] 🔍 Scanning for Ethos token transfers...');
      
      // ERC20 Transfer event signature: Transfer(address,address,uint256)
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      // Get all transfer logs (this might take a while for popular tokens)
      const logs = await this.getLogs(
        this.ethosTokenContract,
        [transferTopic],
        '0x0', // From genesis
        'latest'
      );

      // Extract unique addresses from logs
      const addresses = new Set();
      
      logs.forEach(log => {
        if (log.topics && log.topics.length >= 3) {
          // Topic 1: from address (32 bytes -> 20 bytes address)
          const fromAddress = '0x' + log.topics[1].slice(-40);
          // Topic 2: to address
          const toAddress = '0x' + log.topics[2].slice(-40);
          
          // Add both addresses (holders have either sent or received tokens)
          if (fromAddress !== '0x0000000000000000000000000000000000000000') {
            addresses.add(fromAddress.toLowerCase());
          }
          if (toAddress !== '0x0000000000000000000000000000000000000000') {
            addresses.add(toAddress.toLowerCase());
          }
        }
      });

      const uniqueAddresses = Array.from(addresses);
      console.log(`[Contract API] ✅ Found ${uniqueAddresses.length} unique Ethos token addresses`);
      
      return uniqueAddresses;
      
    } catch (error) {
      console.error('[Contract API] Error getting token holders:', error);
      throw error;
    }
  }

  // Alternative: Get addresses from staking events (if we find the staking contract)
  async getStakingEventAddresses() {
    try {
      console.log('[Contract API] 🔍 Scanning for staking events...');
      
      // Common staking event signatures
      const stakingTopics = [
        '0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15', // Stake(address,uint256)
        '0x1449c6dd7851abc30abf37f57715f492010519147cc2652fbc38202c18a6ee90', // Staked(address,uint256)
        '0x5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f62'  // StakeDeposited(address,uint256)
      ];

      const allAddresses = new Set();

      for (const topic of stakingTopics) {
        try {
          const logs = await this.getLogs(
            this.ethosStakingContract,
            [topic],
            '0x0',
            'latest'
          );

          logs.forEach(log => {
            if (log.topics && log.topics.length >= 2) {
              const stakerAddress = '0x' + log.topics[1].slice(-40);
              allAddresses.add(stakerAddress.toLowerCase());
            }
          });

        } catch (error) {
          console.warn(`[Contract API] Failed to get logs for topic ${topic}:`, error.message);
        }
      }

      const uniqueAddresses = Array.from(allAddresses);
      console.log(`[Contract API] ✅ Found ${uniqueAddresses.length} staker addresses from events`);
      
      return uniqueAddresses;
      
    } catch (error) {
      console.error('[Contract API] Error getting staking addresses:', error);
      throw error;
    }
  }

  // Get current token balance for an address
  async getTokenBalance(tokenContract, address) {
    try {
      // ERC20 balanceOf function signature
      const balanceOfSignature = '0x70a08231'; // balanceOf(address)
      const paddedAddress = address.replace('0x', '').padStart(64, '0');
      const data = balanceOfSignature + paddedAddress;

      const result = await this.makeRpcCall('eth_call', [{
        to: tokenContract,
        data: data
      }, 'latest']);

      // Convert hex result to decimal
      const balance = parseInt(result, 16);
      return balance;
      
    } catch (error) {
      console.warn(`[Contract API] Error getting balance for ${address}:`, error.message);
      return 0;
    }
  }

  // Batch get balances for multiple addresses
  async batchGetBalances(addresses, batchSize = 50) {
    console.log(`[Contract API] 📊 Getting balances for ${addresses.length} addresses...`);
    
    const results = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address) => {
        const balance = await this.getTokenBalance(this.ethosTokenContract, address);
        return {
          address,
          balance,
          hasBalance: balance > 0
        };
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`[Contract API] Processed ${Math.min(i + batchSize, addresses.length)}/${addresses.length} balances`);
        
        // Rate limiting to avoid overwhelming RPC
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[Contract API] Error processing balance batch ${i}-${i + batchSize}:`, error);
        // Continue with next batch even if one fails
      }
    }

    const activeAddresses = results.filter(r => r.hasBalance);
    console.log(`[Contract API] ✅ Found ${activeAddresses.length} addresses with token balances`);
    
    return results;
  }

  // Main method to get all Ethos-related addresses
  async getAllEthosAddresses() {
    try {
      console.log('[Contract API] 🚀 Starting comprehensive address discovery...');
      
      let allAddresses = new Set();

      // Method 1: Try to get token holders
      try {
        const tokenHolders = await this.getAllEthosTokenHolders();
        tokenHolders.forEach(addr => allAddresses.add(addr));
        console.log(`[Contract API] Added ${tokenHolders.length} addresses from token transfers`);
      } catch (error) {
        console.warn('[Contract API] Token holder discovery failed:', error.message);
      }

      // Method 2: Try to get staking addresses
      try {
        const stakers = await this.getStakingEventAddresses();
        stakers.forEach(addr => allAddresses.add(addr));
        console.log(`[Contract API] Added ${stakers.length} addresses from staking events`);
      } catch (error) {
        console.warn('[Contract API] Staking address discovery failed:', error.message);
      }

      const uniqueAddresses = Array.from(allAddresses);
      
      if (uniqueAddresses.length === 0) {
        console.log('[Contract API] ⚠️ No addresses found via contract methods, using fallback...');
        return await this.getFallbackAddresses();
      }

      // Get current balances to filter active users
      const addressesWithBalances = await this.batchGetBalances(uniqueAddresses);
      
      console.log(`[Contract API] ✅ Discovery complete: ${addressesWithBalances.length} total addresses`);
      return addressesWithBalances;
      
    } catch (error) {
      console.error('[Contract API] Error in address discovery:', error);
      return await this.getFallbackAddresses();
    }
  }

  // Fallback method if contract discovery fails
  async getFallbackAddresses() {
    console.log('[Contract API] 🔄 Using fallback address discovery...');
    
    // Return some known Ethereum addresses for testing
    const knownAddresses = [
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik
      '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', // Binance
      '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', // Binance 2
      '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a', // Bitfinex
      '0x742b15dc4E4C379C67C16d124d7C3C1276bcba33'  // Example address
    ];

    return knownAddresses.map(address => ({
      address: address.toLowerCase(),
      balance: 1000000, // Mock balance
      hasBalance: true
    }));
  }

  // Clear cache (for testing)
  clearCache() {
    this.cache.clear();
    console.log('[Contract API] Cache cleared');
  }
}

export default EthosContractApi;
