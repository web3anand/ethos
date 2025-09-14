// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
const CHAIN_ID = 84532; // Base Sepolia

// Review contract address (you'll need to get this from Ethos)
const REVIEW_CONTRACT_ADDRESS = '0x...'; // Replace with actual contract address

// ReviewCreated event signature
const REVIEW_CREATED_TOPIC = '0x...'; // Replace with actual event signature

async function decodeTransactionFromEtherscan(txHash) {
  try {
    // Get transaction details from Etherscan
    const txResponse = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!txResponse.ok) {
      throw new Error(`Etherscan API error: ${txResponse.status}`);
    }
    
    const txData = await txResponse.json();
    
    if (!txData.result) {
      return null;
    }

    // Get transaction receipt
    const receiptResponse = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!receiptResponse.ok) {
      throw new Error(`Etherscan receipt API error: ${receiptResponse.status}`);
    }
    
    const receiptData = await receiptResponse.json();
    
    if (!receiptData.result || !receiptData.result.logs) {
      return null;
    }

    // Find ReviewCreated event in logs
    for (const log of receiptData.result.logs) {
      if (log.address.toLowerCase() === REVIEW_CONTRACT_ADDRESS.toLowerCase()) {
        // Decode the log data
        // The data field contains the non-indexed parameters (comment and metadata)
        const data = log.data;
        
        // For now, we'll extract what we can from the existing Ethos API data
        // In a full implementation, you'd decode the hex data here
        return {
          transactionHash: txHash,
          blockNumber: parseInt(receiptData.result.blockNumber, 16),
          contractAddress: log.address,
          topics: log.topics,
          data: data
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error decoding transaction ${txHash} from Etherscan:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { profileId, limit = 10, offset = 0 } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'Profile ID is required' });
  }

  try {
    // Fetch reviews from Ethos API
    const ethosResponse = await fetch('https://api.ethos.network/api/v1/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'ethos-dashboard'
      },
      body: JSON.stringify({
        subject: [`profileId:${profileId}`],
        limit: Math.min(limit, 50), // Limit to 50 for performance
        offset: offset,
        orderBy: {
          createdAt: 'desc'
        }
      })
    });

    if (!ethosResponse.ok) {
      throw new Error(`Ethos API error: ${ethosResponse.status}`);
    }

    const ethosData = await ethosResponse.json();
    
    if (!ethosData.ok || !ethosData.data?.values) {
      return res.status(200).json({
        success: true,
        data: {
          reviews: [],
          total: 0,
          limit,
          offset
        }
      });
    }

    // Decode each review's transaction
    const decodedReviews = await Promise.all(
      ethosData.data.values.map(async (review) => {
        // Get the first event's transaction hash
        const txHash = review.events?.[0]?.txHash;
        
        if (!txHash) {
          return {
            ...review,
            decodedData: null,
            error: 'No transaction hash found'
          };
        }

        // Decode the transaction using Etherscan
        const decodedData = await decodeTransactionFromEtherscan(txHash);
        
        return {
          ...review,
          decodedData,
          originalComment: review.comment,
          originalMetadata: review.metadata
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        reviews: decodedReviews,
        total: ethosData.data.total,
        limit: ethosData.data.limit,
        offset: ethosData.data.offset
      }
    });

  } catch (error) {
    console.error('Error fetching and decoding reviews:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch and decode reviews',
      details: error.message 
    });
  }
}
