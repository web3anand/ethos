import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'user-profiles.json');
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(200).json([]);
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    const profiles = JSON.parse(data);
    
    // Sort by score and return
    const sortedProfiles = profiles
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((profile, index) => ({
        rank: index + 1,
        address: profile.primaryAddr || profile.userkeys?.[0] || `profile_${profile.profileId}`,
        username: profile.username || profile.displayName || null,
        displayName: profile.displayName || profile.username || null,
        score: profile.score || 0,
        reviews: {
          positive: profile.stats?.review?.received?.positive || 0,
          negative: profile.stats?.review?.received?.negative || 0,
          neutral: profile.stats?.review?.received?.neutral || 0
        },
        vouches: {
          received: profile.stats?.vouch?.received?.count || 0,
          given: profile.stats?.vouch?.given?.count || 0
        },
        xp: profile.xpTotal || 0,
        xpTotal: profile.xpTotal || 0,
        xpStreakDays: profile.xpStreakDays || 0,
        profileId: profile.profileId || profile.id,
        avatarUrl: profile.avatarUrl || null,
        userkeys: profile.userkeys || [],
        source: 'file-database'
      }));
    
    res.status(200).json(sortedProfiles);
  } catch (error) {
    console.error('Error reading profiles:', error);
    res.status(500).json({ error: 'Failed to load profiles' });
  }
}
