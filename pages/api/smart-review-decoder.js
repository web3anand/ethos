// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
const CHAIN_ID = 84532; // Base Sepolia

// Function to get contract address and event signature from Ethos API
async function getContractInfo() {
  try {
    // First, let's get a sample review to find the contract address
    const response = await fetch('https://api.ethos.network/api/v1/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'ethos-dashboard'
      },
      body: JSON.stringify({
        limit: 1,
        offset: 0,
        orderBy: {
          createdAt: 'desc'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ethos API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok || !data.data?.values?.[0]) {
      throw new Error('No reviews found');
    }

    const review = data.data.values[0];
    const txHash = review.events?.[0]?.txHash;
    
    if (!txHash) {
      throw new Error('No transaction hash found');
    }

    // Get transaction details from Etherscan to find contract address
    const txResponse = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!txResponse.ok) {
      throw new Error(`Etherscan API error: ${txResponse.status}`);
    }
    
    const txData = await txResponse.json();
    
    if (!txData.result || !txData.result.logs) {
      throw new Error('No logs found in transaction');
    }

    // Find the contract address from logs
    const contractAddress = txData.result.logs[0]?.address;
    
    if (!contractAddress) {
      throw new Error('Contract address not found');
    }

    return {
      contractAddress,
      txHash,
      blockNumber: parseInt(txData.result.blockNumber, 16)
    };
  } catch (error) {
    console.error('Error getting contract info:', error);
    return null;
  }
}

// Function to decode hex data to string
function hexToString(hex) {
  if (!hex || hex === '0x') return '';
  try {
    // Remove 0x prefix and convert to string
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(cleanHex, 'hex').toString('utf8').replace(/\0/g, '').trim();
  } catch (error) {
    return '';
  }
}

// Function to decode ABI-encoded string from hex data
function decodeStringFromHex(hexData, offset) {
  try {
    if (!hexData || hexData === '0x') return '';
    
    // Remove 0x prefix
    const data = hexData.startsWith('0x') ? hexData.slice(2) : hexData;
    
    // ABI encoding: 32 bytes for offset + 32 bytes for length + data
    const stringOffset = parseInt(data.slice(offset * 2, (offset + 1) * 2), 16) * 2;
    const lengthOffset = stringOffset + 64; // 32 bytes = 64 hex chars
    const length = parseInt(data.slice(lengthOffset, lengthOffset + 64), 16);
    const stringData = data.slice(lengthOffset + 64, lengthOffset + 64 + (length * 2));
    
    return hexToString('0x' + stringData);
  } catch (error) {
    return '';
  }
}

// Function to decode review data from transaction
async function decodeReviewFromTx(txHash) {
  try {
    const contractInfo = await getContractInfo();
    
    if (!contractInfo) {
      throw new Error('Could not get contract information');
    }

    // Get transaction receipt
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result || !data.result.logs) {
      throw new Error('No logs found in transaction');
    }

    // Find logs from the review contract
    const reviewLogs = data.result.logs.filter(log => 
      log.address.toLowerCase() === contractInfo.contractAddress.toLowerCase()
    );

    if (reviewLogs.length === 0) {
      throw new Error('No review logs found in transaction');
    }

    // Decode the first review log
    const log = reviewLogs[0];
    const logData = log.data;
    
    // Try to decode the data field which contains comment and metadata
    // This is a simplified approach - you might need more sophisticated ABI decoding
    let comment = '';
    let metadata = { description: '' };
    
    try {
      // Try to extract strings from the data
      // For now, let's use a simple approach and extract readable text
      const decodedData = hexToString(logData);
      if (decodedData) {
        // Split by common delimiters or try to parse as JSON
        if (decodedData.includes('{')) {
          try {
            const parsed = JSON.parse(decodedData);
            comment = parsed.comment || '';
            metadata = parsed.metadata || { description: '' };
          } catch (e) {
            comment = decodedData;
          }
        } else {
          comment = decodedData;
        }
      }
    } catch (error) {
      console.error('Error decoding log data:', error);
    }

    return {
      success: true,
      data: {
        attestationHash: log.topics[1] || '',
        comment: comment,
        metadata: metadata,
        transactionHash: txHash,
        blockNumber: parseInt(data.result.blockNumber, 16),
        contractAddress: contractInfo.contractAddress
      }
    };

  } catch (error) {
    console.error('Error decoding review from transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'Transaction hash is required' });
  }

  try {
    const result = await decodeReviewFromTx(txHash);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in smart review decoder:', error);
    return res.status(500).json({ 
      error: 'Failed to decode review',
      details: error.message 
    });
  }
}
