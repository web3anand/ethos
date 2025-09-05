import BaseEthosContractApi from './utils/baseEthosContractApi.js';

async function optimizedVouchingScan() {
  console.log('🔍 Optimized Vouching Address Discovery (Target: 20,000 profiles)...\n');
  
  try {
    const baseContract = new BaseEthosContractApi();
    
    console.log('1️⃣ Smart Vouching Discovery Strategy:');
    console.log(`🎯 Contract: ${baseContract.contractAddress}`);
    console.log('📋 Approach: Focused on incoming vouch transactions with ETH value\n');
    
    const uniqueAddresses = new Set();
    
    // Method 1: Recent activity scan (most efficient)
    console.log('2️⃣ Scanning recent activity for vouching transactions...');
    
    try {
      const currentBlockHex = await baseContract.makeRpcCall('eth_blockNumber', []);
      const currentBlock = parseInt(currentBlockHex, 16);
      console.log(`📦 Current block: ${currentBlock.toLocaleString()}`);
      
      // Start with recent 20K blocks to avoid rate limits
      const recentBlocks = 20000;
      const startBlock = Math.max(1, currentBlock - recentBlocks);
      
      console.log(`📊 Scanning blocks ${startBlock.toLocaleString()} to ${currentBlock.toLocaleString()}`);
      
      // Get logs in smaller chunks to avoid rate limits
      const chunkSize = 5000; // 5K blocks per request
      let totalLogs = 0;
      
      for (let chunkStart = startBlock; chunkStart <= currentBlock; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize - 1, currentBlock);
        
        console.log(`   📋 Chunk: blocks ${chunkStart.toLocaleString()}-${chunkEnd.toLocaleString()}`);
        
        try {
          const logs = await baseContract.makeRpcCall('eth_getLogs', [{
            fromBlock: `0x${chunkStart.toString(16)}`,
            toBlock: `0x${chunkEnd.toString(16)}`,
            address: baseContract.contractAddress
          }]);
          
          totalLogs += logs.length;
          console.log(`      📝 Found ${logs.length} logs (${totalLogs} total)`);
          
          // Process logs in small batches to extract vouching addresses
          const batchSize = 10;
          for (let i = 0; i < logs.length; i += batchSize) {
            const batch = logs.slice(i, i + batchSize);
            
            for (const log of batch) {
              if (log.transactionHash) {
                try {
                  const tx = await baseContract.makeRpcCall('eth_getTransactionByHash', [log.transactionHash]);
                  if (tx && tx.from && tx.to && 
                      tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase() &&
                      tx.value && parseInt(tx.value, 16) > 0) { // Only transactions with ETH value
                    uniqueAddresses.add(tx.from.toLowerCase());
                  }
                } catch (txError) {
                  continue; // Skip failed transaction lookups
                }
              }
            }
            
            // Rate limiting within log processing
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log(`      👥 Vouchers found so far: ${uniqueAddresses.size}`);
          
        } catch (chunkError) {
          console.warn(`      ⚠️ Chunk error: ${chunkError.message}`);
          continue;
        }
        
        // Rate limiting between chunks
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Early exit if we find good number of addresses
        if (uniqueAddresses.size > 5000) {
          console.log(`   ✅ Found ${uniqueAddresses.size} addresses, that's a good start!`);
          break;
        }
      }
      
    } catch (error) {
      console.warn('Recent scan failed:', error.message);
    }
    
    // Method 2: If we need more, try Basescan API with focus on vouching
    if (uniqueAddresses.size < 100) {
      console.log('\n3️⃣ Trying Basescan API for vouching transactions...');
      
      try {
        let page = 1;
        const maxPages = 20; // Reasonable limit
        
        while (page <= maxPages) {
          const url = `${baseContract.basescanApiUrl}?module=account&action=txlist&address=${baseContract.contractAddress}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=desc&apikey=YourApiKeyHere`;
          
          console.log(`   📄 Fetching API page ${page}...`);
          
          try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === '1' && data.result && Array.isArray(data.result)) {
              const transactions = data.result;
              
              // Filter specifically for vouching (incoming transactions with ETH value)
              const vouchingTxs = transactions.filter(tx => 
                tx.from && tx.to && 
                tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase() &&
                tx.value && parseInt(tx.value) > 0 // Must have ETH value to be a vouch
              );
              
              console.log(`      📊 Page ${page}: ${vouchingTxs.length} vouching txs out of ${transactions.length} total`);
              
              vouchingTxs.forEach(tx => {
                uniqueAddresses.add(tx.from.toLowerCase());
              });
              
              if (transactions.length < 10000) {
                console.log(`      🏁 Last page reached`);
                break;
              }
              
              page++;
              
            } else {
              console.warn(`      ⚠️ API issue: ${data.message || 'Unknown error'}`);
              break;
            }
            
          } catch (fetchError) {
            console.warn(`      ⚠️ Fetch error: ${fetchError.message}`);
            break;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Progress check
          if (page % 5 === 0) {
            console.log(`      👥 Total vouchers found: ${uniqueAddresses.size}`);
          }
        }
        
      } catch (apiError) {
        console.warn('Basescan API failed:', apiError.message);
      }
    }
    
    const addressArray = Array.from(uniqueAddresses);
    
    console.log('\n🎉 Vouching Address Discovery Complete!');
    console.log('=' .repeat(50));
    console.log(`✅ Total vouching addresses found: ${addressArray.length.toLocaleString()}`);
    
    if (addressArray.length >= 20000) {
      console.log(`🎯 TARGET ACHIEVED! Found ${addressArray.length.toLocaleString()} addresses (20K+ goal met)`);
    } else if (addressArray.length >= 1000) {
      console.log(`📊 Good progress: ${addressArray.length.toLocaleString()} addresses (${((addressArray.length/20000)*100).toFixed(1)}% of 20K target)`);
    } else if (addressArray.length > 0) {
      console.log(`📊 Initial discovery: ${addressArray.length} addresses found`);
    } else {
      console.log(`⚠️ No vouching addresses found`);
    }
    
    if (addressArray.length > 0) {
      console.log('\n📋 Sample vouching addresses:');
      addressArray.slice(0, 10).forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
      
      if (addressArray.length > 10) {
        console.log(`   ... and ${(addressArray.length - 10).toLocaleString()} more`);
      }
      
      console.log('\n🚀 Next Steps:');
      console.log('✅ Addresses discovered successfully');
      console.log('✅ Ready to fetch profiles for these vouching addresses');
      console.log('✅ Can integrate with FastDistributionApi for full 20K+ profile system');
      
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('  - Contract might be very new');
      console.log('  - Verify contract address on https://basescan.org');
      console.log('  - Consider different block ranges');
      console.log('  - Check if vouching requires specific function calls');
    }
    
  } catch (error) {
    console.error('\n❌ Vouching scan failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the optimized vouching scan
optimizedVouchingScan();
