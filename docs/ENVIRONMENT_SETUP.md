# Environment Setup

This document explains how to configure the environment variables for the Ethos Dashboard.

## Required Environment Variables

### For Local Development

Create a `.env.local` file in the root directory:

```bash
# Update Password (for manual data updates)
UPDATE_PASSWORD=your-secure-update-password-here

# Cron Secret (for Vercel scheduled updates)
CRON_SECRET=your-secure-cron-secret-here
```

### For Vercel Production

Set these environment variables in your Vercel dashboard:

1. **UPDATE_PASSWORD** - Password for manual data updates
2. **CRON_SECRET** - Secret for scheduled updates

## Setting Up Environment Variables

### Local Development

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```bash
   UPDATE_PASSWORD=my-secure-password-123
   CRON_SECRET=my-secure-cron-secret-456
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Vercel Production

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `UPDATE_PASSWORD` | `your-secure-password` | Production |
   | `CRON_SECRET` | `your-secure-cron-secret` | Production |

## Security Notes

- **UPDATE_PASSWORD**: Choose a strong password for manual updates
- **CRON_SECRET**: Generate a secure random string (32+ characters)
- Never commit `.env.local` to version control
- Use different passwords for development and production

## Default Values

If environment variables are not set, the system uses these defaults:

- **UPDATE_PASSWORD**: `ethos2024` (change this!)
- **CRON_SECRET**: Must be set (no default)

## Testing Authentication

You can test the authentication system:

```bash
# Test authentication endpoint
curl -X POST http://localhost:3000/api/authenticate-update \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'
```

## Troubleshooting

### Authentication Issues

- Check that `UPDATE_PASSWORD` is set correctly
- Verify the password matches exactly (case-sensitive)
- Check browser console for error messages

### Cron Job Issues

- Verify `CRON_SECRET` is set in Vercel
- Check Vercel function logs for errors
- Ensure the cron job is enabled in `vercel.json`

### Environment Variable Not Loading

- Restart your development server after changing `.env.local`
- Check that the file is in the root directory
- Verify the variable names match exactly
