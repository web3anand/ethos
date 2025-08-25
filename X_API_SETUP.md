# X (Twitter) API Integration Setup

This project integrates with the X (Twitter) API v2 Users Lookup endpoints to provide real-time user suggestions in the search bar.

## Setup Instructions

### 1. Get X API Access

1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project/app or use an existing one
3. Generate a Bearer Token from your app settings
4. Save your Bearer Token securely

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your X API Bearer Token:
   ```bash
   NEXT_PUBLIC_X_BEARER_TOKEN=your_actual_bearer_token_here
   ```

### 3. API Endpoints Used

The integration uses these X API v2 endpoints:

#### Users by Username Lookup
```
GET https://api.twitter.com/2/users/by/username/{username}
```
- **Purpose**: Get user details by exact username match
- **Parameters**: 
  - `user.fields`: id,name,username,description,public_metrics,profile_image_url,verified,verified_type
- **Access Level**: Essential (Free)

#### Users Search (Optional - Requires Elevated Access)
```
GET https://api.twitter.com/1.1/users/search.json
```
- **Purpose**: Search for users by partial username/name
- **Parameters**: 
  - `q`: Search query
  - `count`: Number of results
- **Access Level**: Elevated (Paid plan required)

## Features

### Search Functionality
- **Exact Username Match**: Direct lookup for precise username searches
- **Partial Search**: Searches through usernames and display names
- **Fallback**: Falls back to mock data if API is unavailable
- **Combined Results**: Merges Ethos API results with X API results

### User Data Retrieved
- Username and display name
- Profile picture (high resolution)
- Verification status (blue checkmark)
- Follower count
- Bio/description
- Calculated credibility score

### Error Handling
- Graceful fallback when API limits are reached
- Mock data when X API is unavailable
- Console warnings for debugging
- Continues to work with Ethos API only

## API Rate Limits

### Free Tier (Essential Access)
- **Users by username lookup**: 300 requests per 15 minutes
- **Rate limit headers**: Included in responses

### Paid Tier (Elevated Access)
- **Users search**: 180 requests per 15 minutes
- **Higher rate limits** for username lookup

## Implementation Details

### Frontend (Search Bar)
- Real-time search suggestions as user types
- X-style dark theme interface
- Verified badge display
- Follower count formatting (1.2M, 450K)
- Keyboard navigation support

### Backend (API Integration)
- Automatic username cleaning (removes @ symbol)
- Smart result sorting (exact matches → verified → followers)
- Response caching for better performance
- Error logging and monitoring

## Troubleshooting

### Common Issues

1. **"Bearer token not found" error**
   - Ensure `.env.local` exists with correct token
   - Restart your development server after adding environment variables

2. **API rate limit exceeded**
   - Wait for rate limit window to reset (15 minutes)
   - Consider implementing request caching
   - Upgrade to paid plan for higher limits

3. **Search results not appearing**
   - Check browser console for error messages
   - Verify Bearer Token has correct permissions
   - Ensure your X app has appropriate access level

### Development Tips

1. **Testing with Mock Data**
   - Comment out the X API calls to test with mock data
   - Useful during development to avoid rate limits

2. **Rate Limit Monitoring**
   - Check response headers for remaining requests
   - Implement caching to reduce API calls

3. **Error Logging**
   - Monitor console logs for API errors
   - Set up proper error tracking in production

## Security Considerations

### Bearer Token Protection
- **Never commit** `.env.local` to version control
- Use `NEXT_PUBLIC_` prefix only if token needs to be accessible client-side
- Consider using server-side API routes for better security

### Best Practices
- Implement request debouncing to reduce API calls
- Cache responses when appropriate
- Monitor API usage to avoid unexpected charges
- Rotate Bearer Tokens periodically

## Production Deployment

### Environment Variables
1. Set environment variables in your hosting platform
2. Use secure secret management
3. Monitor API usage and costs

### Performance Optimization
1. Implement response caching
2. Use request debouncing (500ms delay)
3. Limit concurrent requests
4. Consider using a Redis cache for frequent searches

## Support

- [X API Documentation](https://docs.x.com/x-api/users/lookup/quickstart/user-lookup)
- [X Developer Community](https://twittercommunity.com/)
- [Rate Limiting Guide](https://docs.x.com/x-api/rate-limits)
