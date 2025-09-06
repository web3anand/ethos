import EnhancedR4RAnalyzer from '../utils/enhancedR4RAnalyzer.js';
import { getUserStats } from '../utils/ethosApiClient.js';

async function testEnhancedAnalyzer() {
  console.log('🧪 Testing Enhanced R4R Analyzer...\n');

  try {
    const analyzer = new EnhancedR4RAnalyzer();
    
    // Test with a sample user (hashvalue from the image)
    const testUser = {
      profileId: 5476,
      username: 'hashvalue',
      displayName: 'daybot',
      score: 1517,
      xpTotal: 50000
    };

    console.log(`Testing with user: ${testUser.username} (ID: ${testUser.profileId})`);

    // Get user stats
    const userKey = `profileId:${testUser.profileId}`;
    const userStats = await getUserStats(userKey);
    
    if (!userStats) {
      console.log('⚠️ No user stats found, testing with fallback metrics');
      const fallbackMetrics = analyzer.generateFallbackMetrics(null);
      console.log('Fallback metrics:', JSON.stringify(fallbackMetrics, null, 2));
      return;
    }

    console.log('📊 User stats retrieved successfully');
    console.log('Stats summary:', {
      reviewsReceived: userStats.review?.received,
      reviewsGiven: userStats.review?.given,
      vouches: userStats.vouch
    });

    // Calculate enhanced metrics
    const enhancedMetrics = await analyzer.calculateAdvancedMetrics(testUser.profileId, userStats);
    
    console.log('\n✅ Enhanced metrics calculated:');
    console.log('Basic metrics:', enhancedMetrics.basic);
    console.log('Ratio metrics:', enhancedMetrics.ratios);
    console.log('Quality metrics:', enhancedMetrics.quality);
    console.log('Balance metrics:', enhancedMetrics.balance);
    
    if (enhancedMetrics.advanced) {
      console.log('Advanced metrics:', enhancedMetrics.advanced);
    }

    // Test specific calculations
    console.log('\n🔍 Testing specific calculations:');
    console.log('Reciprocity ratio calculation:', analyzer.calculateReciprocityRatio(24, 0));
    console.log('Vouch reciprocity calculation:', analyzer.calculateVouchReciprocityRatio(16, 16));
    console.log('Credibility per review:', analyzer.calculateCredibilityPerReview(1517, 24));
    console.log('Credibility to XP ratio:', analyzer.calculateCredibilityToXPRatio(1517, 50000));

    console.log('\n🎉 Enhanced R4R Analyzer test completed successfully!');

  } catch (error) {
    console.error('❌ Enhanced R4R Analyzer test failed:', error);
  }
}

// Run test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testEnhancedAnalyzer();
}

export default testEnhancedAnalyzer;
