import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import styles from '../styles/Home.module.css';

export default function R4RPatterns() {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/r4r-patterns');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patterns');
      }
      
      setPatterns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  return (
    <div className={styles.container}>
      <Navbar />
      
      <main className={styles.main}>
        <h1 className={styles.title}>
          R4R Pattern Analysis
        </h1>
        
        <p className={styles.description}>
          Detect Review-for-Review patterns across cached user data
        </p>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <button 
            onClick={fetchPatterns}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        {error && (
          <div style={{
            padding: '20px',
            backgroundColor: '#ff4444',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            ❌ Error: {error}
          </div>
        )}

        {patterns && (
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            {/* Statistics Overview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Total Users</h3>
                <p style={{ fontSize: '2em', margin: '10px 0' }}>{patterns.statistics.totalUsers}</p>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Average Reviews</h3>
                <p style={{ fontSize: '2em', margin: '10px 0' }}>{patterns.statistics.averageReviews}</p>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Suspicious Users</h3>
                <p style={{ fontSize: '2em', margin: '10px 0', color: '#ff6b6b' }}>
                  {patterns.statistics.highReciprocityCount}
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Users with Reviews</h3>
                <p style={{ fontSize: '2em', margin: '10px 0' }}>{patterns.statistics.totalWithReviews}</p>
              </div>
            </div>

            {/* Insights */}
            {patterns.insights && patterns.insights.length > 0 && (
              <div style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h2>🔍 Insights</h2>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {patterns.insights.map((insight, index) => (
                    <li key={index} style={{ 
                      padding: '10px 0', 
                      borderBottom: index < patterns.insights.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                    }}>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Suspicious Users */}
            {patterns.topSuspiciousUsers && patterns.topSuspiciousUsers.length > 0 && (
              <div style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h2>🚨 Top Suspicious Users</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Username</th>
                        <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Reviews Received</th>
                        <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Reviews Given</th>
                        <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Reciprocity Ratio</th>
                        <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patterns.topSuspiciousUsers.map((user, index) => (
                        <tr key={user.profileId} style={{ 
                          borderBottom: index < patterns.topSuspiciousUsers.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}>
                          <td style={{ padding: '15px', fontWeight: 'bold' }}>{user.username}</td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>{user.reviewsReceived}</td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>{user.reviewsGiven}</td>
                          <td style={{ padding: '15px', textAlign: 'center', fontFamily: 'monospace' }}>{user.reciprocityRatio}</td>
                          <td style={{ 
                            padding: '15px', 
                            textAlign: 'center',
                            color: user.suspicionLevel === 'HIGH' ? '#ff6b6b' : '#ffa500',
                            fontWeight: 'bold'
                          }}>
                            {user.suspicionLevel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9em',
              marginTop: '20px'
            }}>
              Last analyzed: {new Date(patterns.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
