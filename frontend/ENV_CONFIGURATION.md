# Environment Variables Configuration

## Required Variables

### API Configuration
- `NEXT_PUBLIC_API_URL`: Your backend API URL (e.g., `http://localhost:3001/api`)

## Optional Variables

### Session Timeout
- `NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS`: Number of hours of inactivity before forced logout
  - Default: `2` (hours)
  - Recommended: `1-8` hours depending on security requirements
  - Set to `0` to disable automatic logout
  - Example: `NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS=4`

## Examples

### Development (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS=2
```

### Production
```env
NEXT_PUBLIC_API_URL=https://your-production-api.com/api
NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS=1
```

## How Inactivity Timeout Works

1. The system tracks user activity (mouse moves, keyboard input, clicks, scrolls, touch events)
2. When no activity is detected for the configured hours:
   - A warning toast appears showing remaining time (1-5 minutes before logout)
   - User is automatically logged out after timeout
   - Redirected to login page

3. Any user activity resets the inactivity timer

4. Timer is cleared when user manually logs out

## Security Considerations

- **Shorter timeouts** (1-2 hours) are more secure but less convenient
- **Longer timeouts** (4-8 hours) are more convenient but less secure
- **Disabling** (0 hours) should only be used for development or trusted environments

## Customization

You can adjust the warning timing in `src/lib/auth-context.tsx`:
- `warningTimeoutMs`: When to show the warning before logout
- Default: 5 minutes before logout, or 1 minute if timeout < 6 hours
