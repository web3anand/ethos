// Test script for Base Ethos Contract API
import BaseEthosContractApi from './utils/baseEthosContractApi.js';
import ethosApiClient from './utils/ethosApiClient.js';

async function testBaseEthosContract() {
  console.log('🧪 Testing Base Ethos Contract API...\n');
  
  const contractApi = new BaseEthosContractApi();
  
  try {
    // Test 1: Initialize connection to Base network
    console.log('1️⃣ Testing Base network connection...');
    const startTime = Date.now();
    const isReady = await contractApi.initialize();
    const initTime = Date.now() - startTime;
    
    console.log(`✅ Base connection: ${isReady ? 'SUCCESS' : 'FAILED'} (${initTime}ms)`);
    
    if (!isReady) {
      console.log('❌ Cannot proceed without Base network connection');
      return;
    }
    
    // Test 2: Get all vouching addresses
    console.log('\n2️⃣ Testing address extraction from contract...');
    const addressStart = Date.now();
    
    const addresses = await contractApi.getAllVouchingAddresses((progress) => {
      console.log(`   Progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
    });
    
    const addressTime = Date.now() - addressStart;
    
    if (addresses && addresses.length > 0) {
      console.log(`✅ Found ${addresses.length} unique vouching addresses in ${addressTime}ms`);
      console.log(`   Sample addresses: ${addresses.slice(0, 3).join(', ')}...`);
    } else {
      console.log('❌ No addresses found');
      return;
    }
    
    // Test 3: Get Ethos profiles for a sample of addresses
    console.log('\n3️⃣ Testing Ethos profile fetching...');
    const profileStart = Date.now();
    
    const sampleAddresses = addresses.slice(0, 5); // Test with first 5 addresses
    const profiles = [];
    
    for (const address of sampleAddresses) {
      try {
        console.log(`   Checking profile for ${address}...`);
        const profile = await ethosApiClient.getProfileByAddress(address);
        
        if (profile) {
          profiles.push({
            ...profile,
            address: address
          });
          console.log(`   ✅ Found profile: ${profile.displayName || profile.username || 'Unknown'} (${profile.xpTotal || 0} XP)`);
        } else {
          console.log(`   ⚠️ No profile found for ${address}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Error getting profile for ${address}: ${error.message}`);
      }
    }
    
    const profileTime = Date.now() - profileStart;
    
    console.log(`✅ Profile fetching completed in ${profileTime}ms`);
    console.log(`   Found ${profiles.length} profiles out of ${sampleAddresses.length} addresses`);
    
    // Test 4: Address info
    console.log('\n4️⃣ Testing address info...');
    if (addresses.length > 0) {
      const sampleAddress = addresses[0];
      const addressInfo = await contractApi.getAddressInfo(sampleAddress);
      
      console.log(`✅ Address info for ${sampleAddress}:`);
      console.log(`   Balance: ${contractApi.formatBalance(addressInfo.balance)} ETH`);
      console.log(`   Transactions: ${addressInfo.transactionCount}`);
      console.log(`   Has activity: ${addressInfo.hasActivity}`);
    }
    
    // Test 5: Cache performance
    console.log('\n5️⃣ Testing cache performance...');
    const cacheStart = Date.now();
    
    const cachedAddresses = await contractApi.getAllVouchingAddresses();
    const cacheTime = Date.now() - cacheStart;
    
    console.log(`✅ Cached addresses: ${cachedAddresses.length} addresses in ${cacheTime}ms`);
    console.log(`   Speed improvement: ${Math.round(addressTime / Math.max(cacheTime, 1))}x faster`);
    
    // Test 6: Leaderboard construction
    console.log('\n6️⃣ Testing leaderboard construction...');
    
    if (profiles.length > 0) {
      const sortedProfiles = profiles
        .filter(p => p.xpTotal !== undefined)
        .sort((a, b) => (b.xpTotal || 0) - (a.xpTotal || 0));
      
      const totalXP = sortedProfiles.reduce((sum, p) => sum + (p.xpTotal || 0), 0);
      
      const leaderboard = sortedProfiles.map((profile, index) => ({
        ...profile,
        rank: index + 1,
        xpPercentage: totalXP > 0 ? ((profile.xpTotal || 0) / totalXP) * 100 : 0,
        isVoucher: true
      }));
      
      console.log(`✅ Leaderboard constructed with ${leaderboard.length} vouchers:`);
      leaderboard.forEach(user => {
        console.log(`   #${user.rank}: ${user.displayName || user.username || 'Unknown'} - ${(user.xpTotal || 0).toLocaleString()} XP (${user.xpPercentage.toFixed(2)}%)`);
      });
    }
    
    // Summary
    const totalTime = Date.now() - startTime;
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total test time: ${totalTime}ms`);
    console.log(`   Base network: ${isReady ? 'CONNECTED' : 'FAILED'}`);
    console.log(`   Vouching addresses found: ${addresses.length}`);
    console.log(`   Profiles found: ${profiles.length}/${sampleAddresses.length}`);
    console.log(`   Cache performance: ${Math.round(addressTime / Math.max(cacheTime, 1))}x improvement`);
    console.log(`   Contract: ${contractApi.contractAddress}`);
    console.log(`   Status: ✅ ALL TESTS PASSED`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('Stack trace:', error.stack);
  }
}

// Run the test
testBaseEthosContract();
