import React, { useState, useEffect } from 'react';
import { getUserWeeklyXp } from '../utils/ethosStatsApi';
import styles from './GrowthChart.module.css';

const GrowthChart = ({ userkey }) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userkey) return;
      
      setLoading(true);
      try {
        const data = await getUserWeeklyXp(userkey, 1); // Season 1
        setWeeklyData(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching weekly XP data:', err);
        setError('Failed to load growth data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userkey]);

  if (loading) {
    return (
      <div className="glass-container" style={{ 
        padding: '2rem', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div>Loading trend chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-container" style={{ 
        padding: '2rem', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  // Generate sample data if no data available
  const chartData = weeklyData.length > 0 ? weeklyData.slice(-12) : 
    Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      cumulativeXp: Math.floor(Math.random() * 1000) + 500 + (i * 100)
    }));

  const maxValue = Math.max(...chartData.map(d => d.cumulativeXp || 0));

  return (
    <div className="glass-container" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#e6e6e6', 
          fontSize: '1.25rem', 
          fontWeight: '600' 
        }}>
          Trend
        </h3>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          fontSize: '0.875rem',
          color: '#8b949e'
        }}>
          <span>1M</span>
          <span>3M</span>
          <span>6M</span>
          <span>YTD</span>
          <span style={{ color: '#3b82f6', fontWeight: '600' }}>1Y</span>
          <span>ALL</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '2px',
        padding: '0 0.5rem',
        minHeight: '120px'
      }}>
        {chartData.map((data, index) => {
          const height = ((data.cumulativeXp || 0) / maxValue) * 100;
          return (
            <div
              key={index}
              style={{
                height: `${height}%`,
                width: '100%',
                background: 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)',
                borderRadius: '2px 2px 0 0',
                minHeight: '4px',
                transition: 'all 0.3s ease'
              }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        <span>Jan 23</span>
        <span>Feb 23</span>
        <span>Mar 23</span>
        <span>Apr 23</span>
        <span>May 23</span>
        <span>Jun 23</span>
        <span>Jul 23</span>
        <span>Aug 23</span>
        <span>Sep 23</span>
        <span>Oct 23</span>
        <span>Nov 23</span>
        <span>Dec 23</span>
      </div>
    </div>
  );
};

export default GrowthChart;
