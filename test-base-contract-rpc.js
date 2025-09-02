import BaseEthosContractApi from './utils/baseEthosContractApi.js';
import EthosApiClient from './utils/ethosApiClient.js';

async function testBaseContractRPC() {
  console.log('🔍 Testing Base Network Contract Integration (RPC Method)...\n');
  
  try {
    // Initialize APIs
    const baseContract = new BaseEthosContractApi();
    const ethosClient = new EthosApiClient();
    
    // Test 1: Verify Base network connection
    console.log('1️⃣ Testing Base network RPC connection...');
    const startTime = Date.now();
    
    try {
      const currentBlockHex = await baseContract.makeRpcCall('eth_blockNumber', []);
      const currentBlock = parseInt(currentBlockHex, 16);
      const connectionTime = Date.now() - startTime;
      
      console.log(`✅ Base network connected successfully in ${connectionTime}ms`);
      console.log(`📦 Current block: ${currentBlock.toLocaleString()}`);
      console.log(`🎯 Contract: ${baseContract.contractAddress}\n`);
      
    } catch (error) {
      console.error('❌ Base network connection failed:', error.message);
      return;
    }
    
    // Test 2: Get contract code to verify it exists
    console.log('2️⃣ Verifying contract exists...');
    
    try {
      const contractCode = await baseContract.makeRpcCall('eth_getCode', [baseContract.contractAddress, 'latest']);
      
      if (contractCode && contractCode !== '0x') {
        console.log(`✅ Contract verified - Code length: ${contractCode.length} characters`);
      } else {
        console.log('⚠️ Contract may be an EOA or have no code');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify contract:', error.message);
    }
    
    // Test 3: Scan for addresses using RPC method
    console.log('\n3️⃣ Scanning for contract interactions using direct RPC...');
    console.log('📡 This will scan recent blocks and contract logs...\n');
    
    const progressCallback = (progress) => {
      const bar = '█'.repeat(Math.floor(progress.percentage / 5)) + '░'.repeat(20 - Math.floor(progress.percentage / 5));
      process.stdout.write(`\r[${bar}] ${progress.percentage.toFixed(1)}% - ${progress.stage}`);
    };
    
    const addressStart = Date.now();
    const addresses = await baseContract.getAllVouchingAddresses(progressCallback);
    const addressTime = Date.now() - addressStart;
    
    console.log(`\n✅ Scan complete! Found ${addresses.length} unique addresses in ${(addressTime/1000).toFixed(1)}s`);
    
    if (addresses.length > 0) {
      console.log('\n📋 Sample addresses found:');
      addresses.slice(0, 8).forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
      if (addresses.length > 8) {
        console.log(`   ... and ${addresses.length - 8} more addresses`);
      }
    } else {
      console.log('\n⚠️ No addresses found through RPC scanning');
      console.log('Possible reasons:');
      console.log('  - Contract is very new with few interactions');
      console.log('  - Scanning range may need adjustment');
      console.log('  - Contract may be inactive');
      
      // Let's try getting just the latest few blocks to see if there's any activity
      console.log('\n🔍 Checking latest block activity...');
      try {
        const currentBlockHex = await baseContract.makeRpcCall('eth_blockNumber', []);
        const currentBlock = parseInt(currentBlockHex, 16);
        
        // Check last 5 blocks for any transactions
        for (let i = 0; i < 5; i++) {
          const blockNum = currentBlock - i;
          const block = await baseContract.makeRpcCall('eth_getBlockByNumber', [`0x${blockNum.toString(16)}`, true]);
          
          if (block && block.transactions) {
            console.log(`   Block ${blockNum}: ${block.transactions.length} transactions`);
            
            // Check if any transactions involve our contract
            const contractTxs = block.transactions.filter(tx => 
              tx.to && tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase()
            );
            
            if (contractTxs.length > 0) {
              console.log(`     📍 Found ${contractTxs.length} transactions to our contract!`);
            }
          }
        }
      } catch (error) {
        console.warn('Could not check recent blocks:', error.message);
      }
      
      return;
    }
    
    // Test 4: Sample profile fetching
    console.log('\n4️⃣ Testing profile fetching for sample addresses...');
    
    const sampleSize = Math.min(3, addresses.length);
    const sampleAddresses = addresses.slice(0, sampleSize);
    
    console.log(`🔍 Fetching profiles for ${sampleSize} sample addresses...\n`);
    
    const profileResults = [];
    
    for (let i = 0; i < sampleAddresses.length; i++) {
      const address = sampleAddresses[i];
      console.log(`   ${i + 1}/${sampleSize}. Testing address: ${address}`);
      
      try {
        const profile = await ethosClient.getProfileByAddress(address);
        
        if (profile) {
          profileResults.push({
            address,
            profile: {
              primaryAddr: profile.primaryAddr,
              score: profile.score,
              positiveReviews: profile.positiveReviews,
              negativeReviews: profile.negativeReviews,
              username: profile.username || 'No username'
            }
          });
          console.log(`      ✅ Profile found - Score: ${profile.score}, Reviews: +${profile.positiveReviews}/-${profile.negativeReviews}`);
        } else {
          console.log(`      ⚠️ No profile found for this address`);
        }
        
      } catch (error) {
        console.log(`      ❌ Error fetching profile: ${error.message}`);
      }
    }
    
    // Test 5: Cache performance test
    console.log('\n5️⃣ Testing cache performance...');
    const cacheStart = Date.now();
    const cachedAddresses = await baseContract.getAllVouchingAddresses();
    const cacheTime = Date.now() - cacheStart;
    
    console.log(`✅ Cache retrieval: ${cachedAddresses.length} addresses in ${cacheTime}ms`);
    console.log(`🚀 Cache speedup: ${(addressTime/cacheTime).toFixed(0)}x faster than initial scan`);
    
    // Test 6: Performance analysis
    console.log('\n6️⃣ Performance Analysis:');
    console.log('=' .repeat(50));
    console.log(`📊 RPC Address Discovery: ${(addressTime/1000).toFixed(1)}s for ${addresses.length} addresses`);
    console.log(`📊 Profile Success Rate: ${profileResults.length}/${sampleSize} (${((profileResults.length/sampleSize)*100).toFixed(1)}%)`);
    console.log(`📊 Cache Performance: ${(addressTime/cacheTime).toFixed(0)}x speedup`);
    
    if (addresses.length > 0) {
      const avgTimePerAddress = addressTime / addresses.length;
      console.log(`📊 Average discovery time: ${avgTimePerAddress.toFixed(1)}ms per address`);
      
      if (profileResults.length > 0) {
        const estimatedFullTime = (addressTime + (2000 * addresses.length)) / 1000;
        console.log(`📊 Estimated full process: ~${estimatedFullTime.toFixed(1)}s for all profiles`);
      }
    }
    
    // Final results
    console.log('\n🎉 RPC Integration Test Results:');
    console.log('=' .repeat(50));
    
    if (addresses.length > 0) {
      console.log(`✅ Successfully discovered ${addresses.length} addresses using RPC`);
      console.log(`✅ Profile fetching: ${profileResults.length}/${sampleSize} successful`);
      console.log(`✅ Caching working: ${(addressTime/cacheTime).toFixed(0)}x performance boost`);
      console.log('\n🚀 RPC-based system is ready for production!');
    } else {
      console.log('⚠️ No addresses discovered - contract may need more activity');
      console.log('Consider:');
      console.log('  - Increasing block scan range');
      console.log('  - Checking contract deployment status');
      console.log('  - Verifying contract address is correct');
    }
    
  } catch (error) {
    console.error('\n❌ RPC test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testBaseContractRPC();
}

export { testBaseContractRPC };
