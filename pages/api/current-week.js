// API endpoint for automatic current week detection
import weekDetector from '../../utils/weekDetector';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { season, week, includeWeeks, includeSeasons } = req.query;
    
    // Get current week information
    const currentWeek = weekDetector.getCurrentWeek();
    
    let response = {
      current: currentWeek,
      timestamp: new Date().toISOString(),
      source: 'automatic_detection'
    };

    // Include available weeks if requested
    if (includeWeeks === 'true' || includeWeeks === true) {
      response.availableWeeks = weekDetector.getAvailableWeeks(currentWeek.season);
    }

    // Include available seasons if requested
    if (includeSeasons === 'true' || includeSeasons === true) {
      response.availableSeasons = weekDetector.getAvailableSeasons();
    }

    // Check if specific week is current
    if (season !== undefined && week !== undefined) {
      response.isCurrent = weekDetector.isCurrentWeek(parseInt(season), parseInt(week));
    }

    // Get next and previous weeks
    response.nextWeek = weekDetector.getNextWeek();
    response.previousWeek = weekDetector.getPreviousWeek();

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in current week detection:', error);
    res.status(500).json({ 
      error: 'Failed to detect current week',
      details: error.message,
      fallback: {
        season: 1,
        week: 18,
        isCurrent: true
      }
    });
  }
}
