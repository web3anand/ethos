import { dataCollector } from '../utils/dataCollector.js';
import EnhancedR4RAnalyzer from '../utils/enhancedR4RAnalyzer.js';

async function testComprehensiveAnalysis() {
  console.log('🧪 TESTING COMPREHENSIVE DATA COLLECTION AND ANALYSIS');
  console.log('=====================================================');

  // Test user data (using a numeric profileId which should work better)
  const testUser = {
    profileId: 16197, // monster ∑: qx (@test_quix) with score 1355
    username: 'test_quix',
    displayName: 'monster ∑: qx',
    score: 1355
  };

  try {
    console.log('\n1️⃣ TESTING COMPREHENSIVE DATA COLLECTION');
    console.log('==========================================');
    
    // Test comprehensive data collection
    const userData = await dataCollector.collectUserData(testUser);
    
    console.log('\n📊 COMPREHENSIVE DATA RESULTS:');
    console.log('- Raw stats available:', !!userData.rawStats);
    console.log('- Enhanced stats available:', !!userData.enhancedStats);
    console.log('- Activities data available:', !!userData.activitiesData);
    console.log('- Real Reviews Given:', userData.realReviewsGiven);
    console.log('- Real Reviews Received:', userData.realReviewsReceived);
    console.log('- Real Vouches Given:', userData.realVouchesGiven);
    console.log('- Real Vouches Received:', userData.realVouchesReceived);
    console.log('- Real Reciprocity Ratio:', userData.realReciprocityRatio);
    
    console.log('\n2️⃣ TESTING ENHANCED R4R ANALYZER');
    console.log('==================================');
    
    // Test enhanced analyzer with comprehensive data
    const analyzer = new EnhancedR4RAnalyzer();
    
    // Prepare enhanced stats
    const enhancedStatsForAnalysis = {
      ...userData.rawStats,
      realReviewsGiven: userData.realReviewsGiven,
      realReviewsReceived: userData.realReviewsReceived,
      realVouchesGiven: userData.realVouchesGiven,
      realVouchesReceived: userData.realVouchesReceived,
      realReciprocityRatio: userData.realReciprocityRatio,
      enhancedStats: userData.enhancedStats,
      activitiesData: userData.activitiesData
    };
    
    const metrics = await analyzer.calculateAdvancedMetrics(testUser.profileId, enhancedStatsForAnalysis, userData);
    
    console.log('\n📈 ENHANCED METRICS RESULTS:');
    console.log('- Reviews Given Total:', metrics.basic.reviewsGiven);
    console.log('- Reviews Received Total:', metrics.basic.reviewsReceived);
    console.log('- Vouches Given:', metrics.basic.vouchesGiven);
    console.log('- Vouches Received:', metrics.basic.vouchesReceived);
    console.log('- Reciprocity Ratio:', metrics.ratios.reciprocityRatio);
    console.log('- Data Source:', metrics.dataSource || 'standard');
    
    if (metrics.dataQuality) {
      console.log('\n📋 DATA QUALITY INDICATORS:');
      console.log('- Reviews Given Accuracy:', metrics.dataQuality.reviewsGivenAccuracy);
      console.log('- Reviews Received Accuracy:', metrics.dataQuality.reviewsReceivedAccuracy);
      console.log('- Vouches Accuracy:', metrics.dataQuality.vouchesAccuracy);
    }

    console.log('\n✅ COMPREHENSIVE ANALYSIS TEST COMPLETED');
    console.log('==========================================');
    
    // Check if we resolved the zero values issue
    if (userData.realReviewsGiven > 0) {
      console.log('🎉 SUCCESS: Real reviews given data found!');
      console.log(`🔍 User has given ${userData.realReviewsGiven} reviews (not zero!)`);
    } else {
      console.log('⚠️ ISSUE: Still showing zero reviews given');
      console.log('💡 This might indicate API limitations or data parsing issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testComprehensiveAnalysis();
