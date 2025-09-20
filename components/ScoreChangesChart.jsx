import React, { useState, useEffect } from 'react';
import styles from './ScoreChangesChart.module.css';

const ScoreChangesChart = ({ profileId, username, currentScore }) => {
  const [scoreData, setScoreData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange] = useState('1Y'); // Fixed to 1 Year

  useEffect(() => {
    const fetchScoreData = async () => {
      if (!profileId) return;
      
      setLoading(true);
      try {
        // For now, we'll generate sample data based on the current score
        // In the future, this would fetch from an API endpoint that tracks score changes over time
        const score = currentScore || 1575; // Use prop or fallback
        const sampleData = generateSampleScoreData(score, timeRange);
        setScoreData(sampleData);
        setError(null);
      } catch (err) {
        console.error('Error fetching score data:', err);
        setError('Failed to load score data');
      } finally {
        setLoading(false);
      }
    };

    fetchScoreData();
  }, [profileId, timeRange]);

  // Generate sample score data based on time range
  const generateSampleScoreData = (currentScore, range) => {
    const dataPoints = {
      '1M': 4,
      '3M': 12,
      '6M': 24,
      '1Y': 52,
      'ALL': 78
    };
    
    const points = dataPoints[range] || 12;
    const data = [];
    
    // Generate realistic score progression starting at 1200 and ending at current score
    const startScore = 1200;
    const scoreRange = currentScore - startScore;
    const trend = scoreRange / (points - 1);
    
    for (let i = 0; i < points; i++) {
      // Create a smooth progression from 1200 to current score with some variation
      const baseScore = startScore + (trend * i);
      const variation = (Math.random() * 40 - 20); // ±20 points variation
      const score = Math.round(baseScore + variation);
      
      const date = new Date();
      date.setDate(date.getDate() - (points - i) * (range === '1M' ? 7 : range === '3M' ? 7 : range === '6M' ? 7 : 7));
      
      data.push({
        date: date.toISOString().split('T')[0],
        score: Math.max(startScore - 50, Math.min(currentScore + 50, score)), // Keep within reasonable bounds
        week: i + 1
      });
    }
    
    // Ensure the last point is exactly the current score
    if (data.length > 0) {
      data[data.length - 1].score = currentScore;
    }
    
    return data;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Score Changes Graph</h3>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading score data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Score Changes Graph</h3>
        </div>
        <div className={styles.error}>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (scoreData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Score Changes Graph</h3>
        </div>
        <div className={styles.noData}>
          <span>No score data available</span>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...scoreData.map(d => d.score));
  const minScore = Math.min(...scoreData.map(d => d.score));
  const scoreRange = maxScore - minScore;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Score Changes Graph</h3>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chart}>
          {scoreData.map((data, index) => {
            const height = scoreRange > 0 ? ((data.score - minScore) / scoreRange) * 100 : 50;
            const isLatest = index === scoreData.length - 1;
            
            return (
              <div
                key={index}
                className={`${styles.bar} ${isLatest ? styles.latest : ''}`}
                style={{
                  height: `${Math.max(height, 2)}%`,
                  '--bar-color': isLatest ? '#3b82f6' : '#1e40af'
                }}
                title={`Week ${data.week}: ${data.score} points`}
              />
            );
          })}
        </div>
        
        <div className={styles.yAxis}>
          <span className={styles.yLabel}>{maxScore.toLocaleString()}</span>
          <span className={styles.yLabel}>{Math.round((maxScore + minScore) / 2).toLocaleString()}</span>
          <span className={styles.yLabel}>{minScore.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Current Score</span>
            <span className={styles.statValue}>{(currentScore || scoreData[scoreData.length - 1]?.score || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreChangesChart;
