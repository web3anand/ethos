import React from 'react';
import styles from './AnalysisReport.module.css';

const AnalysisReport = ({ analysis }) => {
  if (!analysis) return null;

  const {
    metrics,
    riskAssessment,
    recommendations,
    timingPatterns,
    dataSource,
    dataQuality
  } = analysis;

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low': return styles.lowRisk;
      case 'medium': return styles.mediumRisk;
      case 'high': return styles.highRisk;
      default: return styles.unknownRisk;
    }
  };

  const renderMetric = (label, value, subValue = null, unit = '') => (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}{unit}
        {subValue && <span className={styles.metricSubValue}> ({subValue})</span>}
      </span>
    </div>
  );

  return (
    <div className={styles.reportContainer}>
      <div className={`${styles.riskBanner} ${getRiskColor(riskAssessment.level)}`}>
        Risk Level: {riskAssessment.level.toUpperCase()}
        <span className={styles.riskScore}>(Score: {riskAssessment.score})</span>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Reciprocity Analysis</h3>
        {renderMetric('Reciprocity Ratio', metrics.reciprocity.ratio.toFixed(2))}
        {renderMetric('Reciprocity %', metrics.reciprocity.percentage.toFixed(1), null, '%')}
        {renderMetric('Mutual Reviews', metrics.reciprocity.mutualReviews)}
        {renderMetric('Mutual Review %', metrics.reciprocity.mutualReviewPercentage.toFixed(1), 'of given', '%')}
      </div>

      {timingPatterns && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Timing Patterns</h3>
          {renderMetric('Avg. Time Between Mutual Reviews', timingPatterns.averageTimeBetweenMutualReviews)}
          {renderMetric('Median Time', timingPatterns.medianTimeBetweenMutualReviews)}
          {renderMetric('Rapid Reciprocation (<1hr)', timingPatterns.rapidReciprocationCount, 'instances')}
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Risk Factors</h3>
        <ul className={styles.factorList}>
          {riskAssessment.factors.map((factor, i) => <li key={i}>{factor}</li>)}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recommendations</h3>
        <ul className={styles.recommendationList}>
          {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
      </div>
      
      <div className={styles.footer}>
        Data Source: {dataSource} 
        {dataQuality && ` | Reviews Given Accuracy: ${dataQuality.reviewsGivenAccuracy}`}
      </div>
    </div>
  );
};

export default AnalysisReport;
