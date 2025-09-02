import BaseEthosContractApi from './utils/baseEthosContractApi.js';

async function historicalVouchingScan() {
  console.log('🔍 Historical Vouching Scan (Target: 20,000 profiles)...\n');
  
  try {
    const baseContract = new BaseEthosContractApi();
    
    console.log('1️⃣ Comprehensive Historical Vouching Discovery:');
    console.log(`🎯 Contract: ${baseContract.contractAddress}`);
    console.log('📋 Strategy: Scan larger historical ranges to find all vouchers\n');
    
    const uniqueAddresses = new Set();
    
    // Get current block
    const currentBlockHex = await baseContract.makeRpcCall('eth_blockNumber', []);
    const currentBlock = parseInt(currentBlockHex, 16);
    console.log(`📦 Current block: ${currentBlock.toLocaleString()}`);
    
    // Method 1: Scan different historical periods to find when vouching started
    const historicalRanges = [
      { name: 'Last 50K blocks', blocks: 50000 },
      { name: 'Last 100K blocks', blocks: 100000 },
      { name: 'Last 250K blocks', blocks: 250000 },
      { name: 'Last 500K blocks', blocks: 500000 },
      { name: 'Last 1M blocks', blocks: 1000000 }
    ];
    
    for (const range of historicalRanges) {
      const startBlock = Math.max(1, currentBlock - range.blocks);
      
      console.log(`\n2️⃣ Scanning ${range.name} (blocks ${startBlock.toLocaleString()} to ${currentBlock.toLocaleString()}):`);
      
      try {
        // Scan in chunks to avoid rate limits
        const chunkSize = 25000; // 25K blocks per chunk
        let rangeAddresses = 0;
        
        for (let chunkStart = startBlock; chunkStart <= currentBlock; chunkStart += chunkSize) {
          const chunkEnd = Math.min(chunkStart + chunkSize - 1, currentBlock);
          
          console.log(`   📋 Scanning chunk: ${chunkStart.toLocaleString()}-${chunkEnd.toLocaleString()}`);
          
          try {
            const logs = await baseContract.makeRpcCall('eth_getLogs', [{
              fromBlock: `0x${chunkStart.toString(16)}`,
              toBlock: `0x${chunkEnd.toString(16)}`,
              address: baseContract.contractAddress
            }]);
            
            console.log(`      📝 Found ${logs.length} logs in this chunk`);
            
            // Process logs to find vouching transactions
            let chunkVouchers = 0;
            const batchSize = 5; // Small batches to avoid rate limits
            
            for (let i = 0; i < logs.length; i += batchSize) {
              const batch = logs.slice(i, i + batchSize);
              
              for (const log of batch) {
                if (log.transactionHash) {
                  try {
                    const tx = await baseContract.makeRpcCall('eth_getTransactionByHash', [log.transactionHash]);
                    if (tx && tx.from && tx.to && 
                        tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase() &&
                        tx.value && parseInt(tx.value, 16) > 0) {
                      if (!uniqueAddresses.has(tx.from.toLowerCase())) {
                        uniqueAddresses.add(tx.from.toLowerCase());
                        chunkVouchers++;
                        rangeAddresses++;
                      }
                    }
                  } catch (txError) {
                    continue;
                  }
                }
              }
              
              // Rate limiting within batch
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`      👥 New vouchers in chunk: ${chunkVouchers} (Total: ${uniqueAddresses.size})`);
            
          } catch (chunkError) {
            console.warn(`      ⚠️ Chunk error: ${chunkError.message}`);
            continue;
          }
          
          // Rate limiting between chunks
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Progress check
          if (uniqueAddresses.size >= 20000) {
            console.log(`      🎯 TARGET REACHED! Found ${uniqueAddresses.size} vouching addresses`);
            break;
          }
          
          // If we're not finding many new addresses in this range, try next range
          if (chunkStart > startBlock + (chunkSize * 3) && rangeAddresses < 10) {
            console.log(`      ⏭️ Low activity in this range, trying earlier blocks...`);
            break;
          }
        }
        
        console.log(`   📊 Range summary: Found ${rangeAddresses} new vouchers in ${range.name}`);
        console.log(`   📊 Total vouching addresses: ${uniqueAddresses.size}`);
        
        // If we found good activity, continue with larger ranges
        if (rangeAddresses > 50) {
          console.log(`   ✅ Good activity found, continuing historical scan...`);
        } else if (uniqueAddresses.size >= 20000) {
          console.log(`   🎯 Target achieved!`);
          break;
        } else {
          console.log(`   📈 Expanding search to earlier blocks...`);
        }
        
      } catch (rangeError) {
        console.warn(`   ❌ Error scanning ${range.name}:`, rangeError.message);
        continue;
      }
      
      // Break if we've achieved our target
      if (uniqueAddresses.size >= 20000) {
        break;
      }
    }
    
    // Method 2: If we still need more, try the Basescan API with proper error handling
    if (uniqueAddresses.size < 20000) {
      console.log(`\n3️⃣ Trying Basescan API to reach 20K target (currently at ${uniqueAddresses.size})...`);
      
      try {
        // We'll try without API key first, then suggest getting one
        let page = 1;
        const maxPages = 100; // More aggressive for 20K target
        
        while (page <= maxPages && uniqueAddresses.size < 20000) {
          // Try the API call
          const url = `${baseContract.basescanApiUrl}?module=account&action=txlist&address=${baseContract.contractAddress}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=desc`;
          
          console.log(`   📄 API page ${page} (Total vouchers: ${uniqueAddresses.size})...`);
          
          try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === '1' && data.result && Array.isArray(data.result)) {
              const transactions = data.result;
              
              // Filter for vouching transactions
              const vouchingTxs = transactions.filter(tx => 
                tx.from && tx.to && 
                tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase() &&
                tx.value && parseInt(tx.value) > 0
              );
              
              let newVouchers = 0;
              vouchingTxs.forEach(tx => {
                if (!uniqueAddresses.has(tx.from.toLowerCase())) {
                  uniqueAddresses.add(tx.from.toLowerCase());
                  newVouchers++;
                }
              });
              
              console.log(`      📊 Page ${page}: ${newVouchers} new vouchers (${vouchingTxs.length} vouching txs total)`);
              
              if (transactions.length < 10000) {
                console.log(`      🏁 Reached end of transactions`);
                break;
              }
              
              page++;
              
            } else {
              console.warn(`      ⚠️ API returned: ${data.message || 'Unknown error'}`);
              if (data.message === 'NOTOK') {
                console.log(`      💡 Need proper Basescan API key for more data`);
              }
              break;
            }
            
          } catch (fetchError) {
            console.warn(`      ❌ Fetch error: ${fetchError.message}`);
            break;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Progress updates
          if (page % 10 === 0) {
            console.log(`      📈 Progress: ${uniqueAddresses.size} total vouchers found`);
          }
        }
        
      } catch (apiError) {
        console.warn('API scan failed:', apiError.message);
      }
    }
    
    const addressArray = Array.from(uniqueAddresses);
    
    console.log('\n🎉 Historical Vouching Scan Complete!');
    console.log('=' .repeat(60));
    console.log(`✅ Total vouching addresses discovered: ${addressArray.length.toLocaleString()}`);
    
    if (addressArray.length >= 20000) {
      console.log(`🎯 TARGET ACHIEVED! ${addressArray.length.toLocaleString()} addresses (20K+ goal met!) 🚀`);
    } else if (addressArray.length >= 10000) {
      console.log(`📊 Excellent progress: ${addressArray.length.toLocaleString()} addresses (${((addressArray.length/20000)*100).toFixed(1)}% of 20K target)`);
    } else if (addressArray.length >= 1000) {
      console.log(`📊 Good foundation: ${addressArray.length.toLocaleString()} addresses (${((addressArray.length/20000)*100).toFixed(1)}% of 20K target)`);
    } else {
      console.log(`📊 Initial discovery: ${addressArray.length} addresses`);
    }
    
    if (addressArray.length > 0) {
      console.log('\n📋 Sample vouching addresses:');
      addressArray.slice(0, 15).forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
      
      if (addressArray.length > 15) {
        console.log(`   ... and ${(addressArray.length - 15).toLocaleString()} more vouching addresses`);
      }
      
      console.log('\n🚀 Production Readiness:');
      if (addressArray.length >= 10000) {
        console.log(`✅ READY FOR PRODUCTION! ${addressArray.length.toLocaleString()} vouching addresses discovered`);
        console.log(`✅ Can now fetch profiles for comprehensive distribution leaderboard`);
        console.log(`✅ Blockchain-first approach working perfectly`);
      } else {
        console.log(`✅ Good foundation with ${addressArray.length} addresses`);
        console.log(`💡 Consider getting Basescan API key for complete historical data`);
        console.log(`💡 Or expand block range if contract has longer history`);
      }
      
    } else {
      console.log('\n💡 Investigation needed:');
      console.log('  - Verify contract address on https://basescan.org');
      console.log('  - Check if contract uses different vouching mechanism');
      console.log('  - Consider if contract is newer than expected');
    }
    
  } catch (error) {
    console.error('\n❌ Historical scan failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the historical vouching scan
historicalVouchingScan();
