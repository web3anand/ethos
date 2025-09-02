// Base Network Ethos Vouching Contract API using Basescan API
class BaseEthosContractApi {
  constructor() {
    // Ethos Vouching Contract on Base Network
    this.contractAddress = '0xD89E6B7687f862dd6D24B3B2D4D0dec6A89A6fdd';
    
    // Basescan API endpoints (Base network explorer)
    this.basescanApiUrl = 'https://api.basescan.org/api';
    this.basescanApiKeys = [
      'YourApiKeyHere', // Replace with actual API key for better rate limits
      'free' // Free tier has rate limits but works for testing
    ];
    
    // Base network RPC endpoints (fallback)
    this.rpcUrls = [
      'https://mainnet.base.org',
      'https://base-mainnet.public.blastapi.io',
      'https://base.gateway.tenderly.co',
      'https://base-rpc.publicnode.com'
    ];
    
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
    this.currentApiKeyIndex = 0;
  }

  // Initialize connection to Base network
  async initialize() {
    console.log('[Base Contract API] Initializing Base network connection...');
    
    try {
      // Test Basescan API connection
      const testUrl = `${this.basescanApiUrl}?module=proxy&action=eth_blockNumber&apikey=${this.getCurrentApiKey()}`;
      const response = await fetch(testUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        const blockNumber = parseInt(data.result, 16);
        console.log(`[Base Contract API] ✅ Connected via Basescan API, block: ${blockNumber.toLocaleString()}`);
        
        // Verify contract exists
        await this.verifyContract();
        return true;
      } else {
        throw new Error('Basescan API returned error');
      }
      
    } catch (error) {
      console.warn('[Base Contract API] Basescan API failed, trying RPC fallback...', error.message);
      return await this.initializeRpcFallback();
    }
  }

  // Get current API key
  getCurrentApiKey() {
    return this.basescanApiKeys[this.currentApiKeyIndex] || 'free';
  }

  // Verify contract exists
  async verifyContract() {
    try {
      const url = `${this.basescanApiUrl}?module=proxy&action=eth_getCode&address=${this.contractAddress}&tag=latest&apikey=${this.getCurrentApiKey()}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result && data.result !== '0x') {
        console.log(`[Base Contract API] ✅ Contract verified at ${this.contractAddress}`);
        return true;
      } else {
        console.warn(`[Base Contract API] No contract found at ${this.contractAddress}`);
        return false;
      }
    } catch (error) {
      console.warn('[Base Contract API] Contract verification failed:', error.message);
      return false;
    }
  }

  // Fallback RPC initialization
  async initializeRpcFallback() {
    console.log('[Base Contract API] Trying RPC fallback...');
    
    for (const rpcUrl of this.rpcUrls) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        });
        
        const data = await response.json();
        const chainId = parseInt(data.result, 16);
        
        if (chainId === 8453) { // Base mainnet
          console.log(`[Base Contract API] ✅ RPC fallback connected to Base network`);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    console.error('[Base Contract API] ❌ All connection methods failed');
    return false;
  }

  // Get current RPC URL
  getCurrentRpcUrl() {
    return this.rpcUrls[this.currentRpcIndex];
  }

  // Make RPC call with automatic failover
  async makeRpcCall(method, params, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const rpcUrl = this.getCurrentRpcUrl();
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }

        return data.result;
        
      } catch (error) {
        console.warn(`[Base Contract API] RPC call failed (attempt ${attempt + 1}):`, error.message);
        
        // Try next RPC on failure
        this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
        
        if (attempt === retries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // Get all addresses that sent vouching transactions to the contract
  async getAllVouchingAddresses(progressCallback = null) {
    const cacheKey = 'vouching-addresses:v5';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[Base Contract API] Cache hit for vouching addresses (${cached.data.length} addresses)`);
      if (progressCallback) {
        progressCallback({
          stage: 'Loaded from cache',
          current: cached.data.length,
          total: cached.data.length,
          percentage: 100
        });
      }
      return cached.data;
    }

    try {
      console.log('[Base Contract API] 🔍 Getting all vouching addresses (incoming vouch transactions)...');
      
      if (progressCallback) {
        progressCallback({
          stage: 'Scanning for vouching transactions...',
          current: 0,
          total: 100,
          percentage: 10
        });
      }

      const uniqueAddresses = new Set();

      // Method 1: Scan for incoming vouching transactions using comprehensive RPC
      try {
        const currentBlockHex = await this.makeRpcCall('eth_blockNumber', []);
        const currentBlock = parseInt(currentBlockHex, 16);
        
        // Scan large historical range to find all vouchers (Base network has been active)
        const historicalBlocks = 2000000; // Scan 2M blocks for comprehensive coverage
        const startBlock = Math.max(1, currentBlock - historicalBlocks);
        
        console.log(`[Base Contract API] Scanning for vouch transactions from block ${startBlock.toLocaleString()} to ${currentBlock.toLocaleString()}`);

        if (progressCallback) {
          progressCallback({
            stage: `Scanning ${historicalBlocks.toLocaleString()} blocks for vouching...`,
            current: 20,
            total: 100,
            percentage: 20
          });
        }

        // Get ALL logs for the contract (this captures all vouching events)
        const logs = await this.makeRpcCall('eth_getLogs', [{
          fromBlock: `0x${startBlock.toString(16)}`,
          toBlock: 'latest',
          address: this.contractAddress
        }]);

        console.log(`[Base Contract API] Found ${logs.length} total contract logs`);

        if (progressCallback) {
          progressCallback({
            stage: `Processing ${logs.length} contract events...`,
            current: 40,
            total: 100,
            percentage: 40
          });
        }

        // Process all logs to extract vouching addresses
        const batchSize = 200;
        let processedLogs = 0;
        
        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);
          
          const txPromises = batch.map(async (log) => {
            try {
              if (log.transactionHash) {
                const tx = await this.makeRpcCall('eth_getTransactionByHash', [log.transactionHash]);
                if (tx && tx.from && tx.to && 
                    tx.to.toLowerCase() === this.contractAddress.toLowerCase() &&
                    tx.value && parseInt(tx.value, 16) > 0) { // Only transactions with ETH value (vouching)
                  return tx.from.toLowerCase();
                }
              }
              return null;
            } catch (error) {
              return null;
            }
          });

          const addresses = await Promise.all(txPromises);
          addresses.forEach(addr => {
            if (addr) uniqueAddresses.add(addr);
          });

          processedLogs += batch.length;
          
          if (progressCallback && i % 1000 === 0) {
            const percentage = 40 + (processedLogs / logs.length) * 40;
            progressCallback({
              stage: `Processed ${processedLogs}/${logs.length} events... (${uniqueAddresses.size} vouchers found)`,
              current: processedLogs,
              total: logs.length,
              percentage: Math.min(percentage, 80)
            });
          }

          // Rate limiting to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`[Base Contract API] Extracted ${uniqueAddresses.size} vouching addresses from contract events`);

      } catch (error) {
        console.warn('[Base Contract API] Error with contract logs method:', error.message);
      }

      // Method 2: Direct block scanning for vouching transactions (if we need more)
      if (uniqueAddresses.size < 1000) { // Expected more vouchers
        console.log('[Base Contract API] Running direct block scan to find more vouching transactions...');
        
        if (progressCallback) {
          progressCallback({
            stage: 'Direct block scanning for vouching transactions...',
            current: 85,
            total: 100,
            percentage: 85
          });
        }

        try {
          const currentBlockHex = await this.makeRpcCall('eth_blockNumber', []);
          const currentBlock = parseInt(currentBlockHex, 16);
          
          // Scan recent blocks in detail for direct vouching transactions
          const detailedScanBlocks = 100000; // Last 100K blocks in detail
          const detailedStartBlock = Math.max(1, currentBlock - detailedScanBlocks);
          
          console.log(`[Base Contract API] Detail scanning blocks ${detailedStartBlock.toLocaleString()} to ${currentBlock.toLocaleString()}`);

          for (let blockNum = detailedStartBlock; blockNum <= currentBlock; blockNum += 500) {
            try {
              const endBlockNum = Math.min(blockNum + 499, currentBlock);
              
              // Get all blocks in this range
              for (let b = blockNum; b <= endBlockNum; b += 50) {
                const batchEnd = Math.min(b + 49, endBlockNum);
                
                const blockPromises = [];
                for (let blockId = b; blockId <= batchEnd; blockId++) {
                  blockPromises.push(
                    this.makeRpcCall('eth_getBlockByNumber', [`0x${blockId.toString(16)}`, true])
                      .catch(() => null)
                  );
                }
                
                const blocks = await Promise.all(blockPromises);
                
                blocks.forEach(block => {
                  if (block && block.transactions) {
                    // Filter for transactions TO our contract with ETH value (vouching)
                    const vouchingTxs = block.transactions.filter(tx => 
                      tx && tx.to && tx.from &&
                      tx.to.toLowerCase() === this.contractAddress.toLowerCase() &&
                      tx.value && parseInt(tx.value, 16) > 0 // Has ETH value = vouching
                    );
                    
                    vouchingTxs.forEach(tx => {
                      uniqueAddresses.add(tx.from.toLowerCase());
                    });
                  }
                });
              }

              // Progress update every 10K blocks
              if (blockNum % 10000 === 0) {
                console.log(`[Base Contract API] Scanned to block ${blockNum.toLocaleString()}, found ${uniqueAddresses.size} vouchers`);
              }

              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (error) {
              console.warn(`[Base Contract API] Error scanning blocks ${blockNum}-${endBlockNum}:`, error.message);
              continue;
            }
          }

        } catch (error) {
          console.warn('[Base Contract API] Error with direct block scanning:', error.message);
        }
      }

      // Method 3: Basescan API for incoming transactions (if API works)
      if (uniqueAddresses.size < 5000) { // Still looking for more
        console.log('[Base Contract API] Trying Basescan API for incoming vouching transactions...');
        
        if (progressCallback) {
          progressCallback({
            stage: 'Checking Basescan API for vouching transactions...',
            current: 95,
            total: 100,
            percentage: 95
          });
        }

        try {
          // Focus on incoming transactions with value (vouching)
          let page = 1;
          const offset = 10000;
          let hasMoreTransactions = true;

          while (hasMoreTransactions && page <= 20) { // More pages for comprehensive coverage
            const url = `${this.basescanApiUrl}?module=account&action=txlist&address=${this.contractAddress}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${this.getCurrentApiKey()}`;
            
            try {
              const response = await fetch(url);
              const data = await response.json();
              
              if (data.status === '1' && data.result && Array.isArray(data.result)) {
                const transactions = data.result;
                
                // Filter for vouching transactions (incoming with ETH value)
                const vouchingTxs = transactions.filter(tx => 
                  tx.from && tx.to && 
                  tx.to.toLowerCase() === this.contractAddress.toLowerCase() &&
                  tx.value && parseInt(tx.value) > 0 // Has ETH value = vouching
                );
                
                console.log(`[Base Contract API] Page ${page}: ${vouchingTxs.length} vouching transactions out of ${transactions.length} total`);
                
                vouchingTxs.forEach(tx => {
                  uniqueAddresses.add(tx.from.toLowerCase());
                });
                
                if (transactions.length < offset) {
                  hasMoreTransactions = false;
                } else {
                  page++;
                }
                
              } else if (data.status === '0' && data.message === 'No transactions found') {
                hasMoreTransactions = false;
              } else {
                console.warn('[Base Contract API] API error:', data.message);
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 200));
              
            } catch (fetchError) {
              console.warn(`[Base Contract API] API fetch error page ${page}:`, fetchError.message);
              break;
            }
          }

        } catch (error) {
          console.warn('[Base Contract API] Basescan API method failed:', error.message);
        }
      }

      const addressArray = Array.from(uniqueAddresses);
      
      if (progressCallback) {
        progressCallback({
          stage: 'Complete!',
          current: addressArray.length,
          total: addressArray.length,
          percentage: 100
        });
      }

      console.log(`[Base Contract API] ✅ Found ${addressArray.length} unique vouching addresses`);
      
      if (addressArray.length < 1000) {
        console.log('[Base Contract API] ⚠️ Lower than expected vouching addresses found');
        console.log('Consider:');
        console.log('  - Expanding block scan range');
        console.log('  - Checking if contract address is correct');
        console.log('  - Verifying vouching function signature');
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: addressArray,
        timestamp: Date.now()
      });
      
      return addressArray;
      
    } catch (error) {
      console.error('[Base Contract API] Error getting vouching addresses:', error);
      throw error;
    }
  }

  // Make RPC call to Base network
  async makeRpcCall(method, params, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const rpcUrl = this.rpcUrls[0]; // Use first working RPC
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }

        return data.result;
        
      } catch (error) {
        console.warn(`[Base Contract API] RPC call failed (attempt ${attempt + 1}):`, error.message);
        
        if (attempt === retries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // Get address info (ETH balance, transaction count)
  async getAddressInfo(address) {
    try {
      const [balance, txCount] = await Promise.all([
        this.makeRpcCall('eth_getBalance', [address, 'latest']),
        this.makeRpcCall('eth_getTransactionCount', [address, 'latest'])
      ]);

      return {
        address: address.toLowerCase(),
        balance: balance,
        transactionCount: parseInt(txCount, 16),
        hasActivity: parseInt(txCount, 16) > 0
      };
      
    } catch (error) {
      console.warn(`[Base Contract API] Error getting address info for ${address}:`, error.message);
      return {
        address: address.toLowerCase(),
        balance: '0x0',
        transactionCount: 0,
        hasActivity: false
      };
    }
  }

  // Batch get address info
  async batchGetAddressInfo(addresses, progressCallback = null) {
    console.log(`[Base Contract API] Getting info for ${addresses.length} addresses...`);
    
    const results = [];
    const batchSize = 10; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(address => this.getAddressInfo(address));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        if (progressCallback) {
          progressCallback({
            stage: 'Getting address info...',
            current: Math.min(i + batchSize, addresses.length),
            total: addresses.length,
            percentage: ((Math.min(i + batchSize, addresses.length)) / addresses.length) * 100
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`[Base Contract API] Error processing batch ${i}-${i + batchSize}:`, error);
        // Add empty results for failed batch
        batch.forEach(address => {
          results.push({
            address: address.toLowerCase(),
            balance: '0x0',
            transactionCount: 0,
            hasActivity: false
          });
        });
      }
    }

    console.log(`[Base Contract API] ✅ Processed ${results.length} addresses`);
    return results;
  }

  // Format balance from wei to ETH
  formatBalance(balanceWei) {
    try {
      const balanceNum = parseInt(balanceWei, 16);
      const ethBalance = balanceNum / 1e18;
      return ethBalance;
    } catch (error) {
      return 0;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('[Base Contract API] Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      contractCache: this.cache.size,
      rpcUrl: this.getCurrentRpcUrl()
    };
  }
}

export default BaseEthosContractApi;
