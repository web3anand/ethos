export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get the expected password from environment variable
    const expectedPassword = process.env.UPDATE_PASSWORD || 'ethos2024';
    
    // Simple password check (in production, use proper hashing)
    if (password === expectedPassword) {
      // Set a simple session token (in production, use proper JWT)
      const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
      
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: token
      });
    } else {
      res.status(401).json({ 
        error: 'Invalid password',
        hint: 'Check your environment variables for UPDATE_PASSWORD'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message
    });
  }
}
