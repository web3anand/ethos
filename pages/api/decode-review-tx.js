import { ethers } from 'ethers';

// Base Sepolia RPC URL (you can change this to mainnet if needed)
const RPC_URL = 'https://sepolia.base.org';

// Review contract ABI - this is a simplified version, you might need the full ABI
const REVIEW_CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "attestationHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "comment",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "name": "ReviewCreated",
    "type": "event"
  }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'Transaction hash is required' });
  }

  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Create contract interface
    const contractInterface = new ethers.Interface(REVIEW_CONTRACT_ABI);
    
    // Decode logs
    const decodedLogs = [];
    
    for (const log of receipt.logs) {
      try {
        const decoded = contractInterface.parseLog(log);
        if (decoded) {
          decodedLogs.push({
            name: decoded.name,
            args: decoded.args
          });
        }
      } catch (error) {
        // Log might not be from our contract, continue
        continue;
      }
    }

    // Find ReviewCreated event
    const reviewEvent = decodedLogs.find(log => log.name === 'ReviewCreated');
    
    if (!reviewEvent) {
      return res.status(404).json({ error: 'Review event not found in transaction' });
    }

    const { attestationHash, comment, metadata } = reviewEvent.args;

    // Parse metadata if it's a JSON string
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error) {
      // If metadata is not valid JSON, use it as is
      parsedMetadata = { description: metadata };
    }

    return res.status(200).json({
      success: true,
      data: {
        attestationHash,
        comment: comment.toString(),
        metadata: parsedMetadata,
        transactionHash: txHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash
      }
    });

  } catch (error) {
    console.error('Error decoding transaction:', error);
    return res.status(500).json({ 
      error: 'Failed to decode transaction',
      details: error.message 
    });
  }
}
