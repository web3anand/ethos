import BaseEthosContractApi from './utils/baseEthosContractApi.js';

async function quickTest() {
  console.log('🔍 Quick Etherscan v2 API Test...\n');
  
  try {
    const baseContract = new BaseEthosContractApi();
    
    console.log('1️⃣ Testing Basescan API setup...');
    console.log(`🎯 Contract: ${baseContract.contractAddress}`);
    console.log(`🌐 API: ${baseContract.basescanApiUrl}`);
    
    console.log('\n2️⃣ Testing address discovery using Etherscan v2...');
    
    const progressCallback = (progress) => {
      if (progress.percentage % 25 === 0 || progress.percentage === 100) {
        console.log(`📊 ${progress.stage} - ${progress.percentage.toFixed(0)}%`);
      }
    };
    
    const startTime = Date.now();
    const addresses = await baseContract.getAllVouchingAddresses(progressCallback);
    const totalTime = Date.now() - startTime;
    
    console.log(`\n✅ Discovery complete: ${addresses.length} addresses found in ${(totalTime/1000).toFixed(1)}s`);
    
    if (addresses.length > 0) {
      console.log('\n📋 Sample addresses:');
      addresses.slice(0, 5).forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
      
      if (addresses.length > 5) {
        console.log(`   ... and ${addresses.length - 5} more`);
      }
      
      console.log('\n3️⃣ Testing cache performance...');
      const cacheStart = Date.now();
      await baseContract.getAllVouchingAddresses();
      const cacheTime = Date.now() - cacheStart;
      
      console.log(`⚡ Cache retrieval: ${cacheTime}ms (${(totalTime/cacheTime).toFixed(0)}x faster)`);
      
    } else {
      console.log('\n⚠️ No addresses found');
      console.log('This could indicate:');
      console.log('  - Contract is new/inactive');
      console.log('  - API access issues');
      console.log('  - Need to verify contract address on Basescan');
    }
    
    console.log('\n🎉 Quick test complete!');
    console.log(`✅ Method: Etherscan v2 API with RPC fallback`);
    console.log(`✅ Results: ${addresses.length} vouching addresses`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('💡 This might be a network issue or API rate limiting');
    }
    
    console.error('Stack:', error.stack);
  }
}

// Run immediately
quickTest().then(() => {
  console.log('✅ Test finished');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
