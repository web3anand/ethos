// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
const CHAIN_ID = 84532; // Base Sepolia

// You'll need to get these from the Ethos contract
const REVIEW_CONTRACT_ADDRESS = '0x...'; // Replace with actual contract address
const REVIEW_CREATED_TOPIC = '0x...'; // Replace with actual event signature

// Function to decode hex string to string
function hexToString(hex) {
  if (!hex || hex === '0x') return '';
  try {
    return Buffer.from(hex.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
  } catch (error) {
    return '';
  }
}

// Function to get event logs from Etherscan
async function getEventLogs(contractAddress, fromBlock, toBlock) {
  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}&topic0=${REVIEW_CREATED_TOPIC}&page=1&offset=1000&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message}`);
    }
    
    return data.result || [];
  } catch (error) {
    console.error('Error fetching event logs:', error);
    return [];
  }
}

// Function to decode a single log entry
function decodeLogEntry(log) {
  try {
    // The data field contains the non-indexed parameters
    // Format: 0x + 64 chars for comment offset + 64 chars for metadata offset + comment data + metadata data
    const data = log.data;
    
    if (!data || data === '0x') {
      return null;
    }
    
    // Remove 0x prefix
    const hexData = data.slice(2);
    
    // For now, let's try to extract strings from the data
    // This is a simplified approach - you might need more sophisticated decoding
    const comment = hexToString(data);
    const metadata = { description: '' };
    
    return {
      attestationHash: log.topics[1] || '',
      comment: comment,
      metadata: metadata,
      transactionHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      logIndex: parseInt(log.logIndex, 16)
    };
  } catch (error) {
    console.error('Error decoding log entry:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractAddress, fromBlock, toBlock, txHash } = req.body;

  try {
    let logs = [];
    
    if (txHash) {
      // Get logs for a specific transaction
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result && data.result.logs) {
        logs = data.result.logs.filter(log => 
          log.address.toLowerCase() === (contractAddress || REVIEW_CONTRACT_ADDRESS).toLowerCase()
        );
      }
    } else if (contractAddress && fromBlock && toBlock) {
      // Get logs for a block range
      logs = await getEventLogs(contractAddress, fromBlock, toBlock);
    } else {
      return res.status(400).json({ error: 'Either txHash or contractAddress with fromBlock and toBlock are required' });
    }

    // Decode all logs
    const decodedLogs = logs.map(decodeLogEntry).filter(log => log !== null);

    return res.status(200).json({
      success: true,
      data: {
        logs: decodedLogs,
        total: decodedLogs.length
      }
    });

  } catch (error) {
    console.error('Error decoding review logs:', error);
    return res.status(500).json({ 
      error: 'Failed to decode review logs',
      details: error.message 
    });
  }
}
