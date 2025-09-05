import BaseEthosContractApi from './utils/baseEthosContractApi.js';

async function investigateContract() {
  console.log('🔍 Deep Contract Investigation...\n');
  
  try {
    const baseContract = new BaseEthosContractApi();
    
    console.log('1️⃣ Contract Analysis:');
    console.log(`🎯 Contract: ${baseContract.contractAddress}`);
    
    // Get contract code and basic info
    const contractCode = await baseContract.makeRpcCall('eth_getCode', [baseContract.contractAddress, 'latest']);
    console.log(`📝 Contract code length: ${contractCode.length} characters`);
    console.log(`📝 Has code: ${contractCode !== '0x' ? 'YES' : 'NO'}`);
    
    // Get current block for context
    const currentBlockHex = await baseContract.makeRpcCall('eth_blockNumber', []);
    const currentBlock = parseInt(currentBlockHex, 16);
    console.log(`📦 Current block: ${currentBlock.toLocaleString()}`);
    
    // Check contract balance
    const balance = await baseContract.makeRpcCall('eth_getBalance', [baseContract.contractAddress, 'latest']);
    const balanceEth = parseInt(balance, 16) / 1e18;
    console.log(`💰 Contract balance: ${balanceEth.toFixed(6)} ETH`);
    
    console.log('\n2️⃣ Historical Scan Analysis:');
    
    // Try different block ranges to find when the contract became active
    const scanRanges = [
      { name: 'Last 10K blocks', blocks: 10000 },
      { name: 'Last 50K blocks', blocks: 50000 },
      { name: 'Last 100K blocks', blocks: 100000 },
      { name: 'Last 500K blocks', blocks: 500000 }
    ];
    
    for (const range of scanRanges) {
      const startBlock = Math.max(1, currentBlock - range.blocks);
      
      console.log(`\n📊 Scanning ${range.name} (${startBlock.toLocaleString()} to ${currentBlock.toLocaleString()}):`);
      
      try {
        // Get all logs in this range
        const logs = await baseContract.makeRpcCall('eth_getLogs', [{
          fromBlock: `0x${startBlock.toString(16)}`,
          toBlock: 'latest',
          address: baseContract.contractAddress
        }]);
        
        console.log(`   📋 Found ${logs.length} contract logs`);
        
        if (logs.length > 0) {
          // Analyze the logs
          const uniqueTxHashes = new Set();
          const uniqueAddresses = new Set();
          
          for (const log of logs.slice(0, 50)) { // Sample first 50 logs
            uniqueTxHashes.add(log.transactionHash);
            
            try {
              const tx = await baseContract.makeRpcCall('eth_getTransactionByHash', [log.transactionHash]);
              if (tx && tx.from) {
                uniqueAddresses.add(tx.from.toLowerCase());
              }
            } catch (error) {
              continue;
            }
          }
          
          console.log(`   🔄 Unique transactions: ${uniqueTxHashes.size}`);
          console.log(`   👥 Unique addresses (sample): ${uniqueAddresses.size}`);
          
          // Show some sample addresses
          if (uniqueAddresses.size > 0) {
            console.log(`   📝 Sample addresses:`);
            Array.from(uniqueAddresses).slice(0, 3).forEach((addr, i) => {
              console.log(`      ${i + 1}. ${addr}`);
            });
          }
          
          // If we found good data in this range, we can stop
          if (logs.length > 10) {
            console.log(`   ✅ Good activity found in ${range.name}`);
            break;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error scanning ${range.name}: ${error.message}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n3️⃣ Alternative Discovery Methods:');
    
    // Method: Check recent blocks for any transactions TO the contract
    console.log('\n📍 Checking recent blocks for direct transactions...');
    const recentBlocks = 1000;
    const startBlock = currentBlock - recentBlocks;
    
    let directTransactions = 0;
    for (let blockNum = startBlock; blockNum <= currentBlock; blockNum += 100) {
      try {
        const endBlock = Math.min(blockNum + 99, currentBlock);
        
        for (let b = blockNum; b <= endBlock; b++) {
          const block = await baseContract.makeRpcCall('eth_getBlockByNumber', [`0x${b.toString(16)}`, true]);
          
          if (block && block.transactions) {
            const contractTxs = block.transactions.filter(tx => 
              tx.to && tx.to.toLowerCase() === baseContract.contractAddress.toLowerCase()
            );
            
            if (contractTxs.length > 0) {
              directTransactions += contractTxs.length;
              console.log(`   📦 Block ${b}: ${contractTxs.length} transactions to contract`);
              
              contractTxs.slice(0, 2).forEach(tx => {
                console.log(`      From: ${tx.from}, Value: ${parseInt(tx.value, 16) / 1e18} ETH`);
              });
            }
          }
        }
        
        if (blockNum % 500 === 0) {
          console.log(`   📊 Scanned up to block ${blockNum}... (${directTransactions} direct transactions found)`);
        }
        
      } catch (error) {
        continue;
      }
    }
    
    console.log(`\n✅ Investigation complete!`);
    console.log(`📊 Total direct transactions found: ${directTransactions}`);
    
    console.log('\n💡 Recommendations:');
    if (directTransactions > 0) {
      console.log('✅ Contract has activity - try larger block ranges');
      console.log('✅ Consider scanning from contract deployment block');
    } else {
      console.log('⚠️ Very low activity detected');
      console.log('🔍 Double-check contract address on Basescan.org');
      console.log('🔍 Contract might be very new or inactive');
    }
    
  } catch (error) {
    console.error('\n❌ Investigation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the investigation
investigateContract();
