import { useState, useEffect, useCallback } from 'react';

const useDecodedReviews = (profileId, limit = 10) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDecodedReviews = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    setError(null);

    try {
      // First, fetch reviews from Ethos API
      const ethosResponse = await fetch('https://api.ethos.network/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': 'ethos-dashboard'
        },
        body: JSON.stringify({
          subject: [`profileId:${profileId}`],
          limit: Math.min(limit, 50),
          offset: 0,
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
        setReviews([]);
        return;
      }

      // Decode each review's transaction
      const decodedReviews = await Promise.all(
        ethosData.data.values.map(async (review) => {
          const txHash = review.events?.[0]?.txHash;
          
          if (!txHash) {
            return {
              ...review,
              decodedData: null,
              error: 'No transaction hash found'
            };
          }

          try {
            // Decode the transaction using our smart decoder
            const decodeResponse = await fetch('/api/smart-review-decoder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ txHash })
            });

            if (decodeResponse.ok) {
              const decodeData = await decodeResponse.json();
              return {
                ...review,
                decodedData: decodeData.data,
                originalComment: review.comment,
                originalMetadata: review.metadata
              };
            } else {
              return {
                ...review,
                decodedData: null,
                error: 'Failed to decode transaction'
              };
            }
          } catch (decodeError) {
            console.error(`Error decoding transaction ${txHash}:`, decodeError);
            return {
              ...review,
              decodedData: null,
              error: 'Decode error'
            };
          }
        })
      );

      setReviews(decodedReviews);
    } catch (err) {
      console.error('Error fetching decoded reviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profileId, limit]);

  useEffect(() => {
    fetchDecodedReviews();
  }, [fetchDecodedReviews]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchDecodedReviews
  };
};

export default useDecodedReviews;
