# Get Jitsi Token Edge Function

This Supabase Edge Function generates JWT tokens for Jitsi as a Service (JaaS) authentication.

## Environment Variables

Set the following environment variables in your Supabase project:

```bash
# Required: Your Jitsi App ID from JaaS dashboard
JITSI_APP_ID=vpaas-magic-cookie-2eae40794b2947ad92e0371e6c3d0bf4

# Required: Your private key from JaaS dashboard (include the full key with headers)
JITSI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"

# Optional: Key ID from your JaaS dashboard (defaults to SAMPLE_KEY_ID)
JITSI_KEY_ID=your-actual-key-id
```

## Setting Environment Variables

### Using Supabase CLI:
```bash
supabase secrets set JITSI_APP_ID=vpaas-magic-cookie-2eae40794b2947ad92e0371e6c3d0bf4
supabase secrets set JITSI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
supabase secrets set JITSI_KEY_ID=your-actual-key-id
```

### Using Supabase Dashboard:
1. Go to your project dashboard
2. Navigate to Settings > Edge Functions
3. Add the environment variables in the secrets section

## Usage

### Frontend (React/TypeScript):
```typescript
async function getJitsiToken() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/functions/v1/get-jitsi-token', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get Jitsi token')
  }

  const { token } = await response.json()
  return token
}

// Use in JitsiMeetPanel
const jwt = await getJitsiToken()
```

### JitsiMeetPanel Integration:
```typescript
const options = {
  roomName: roomId,
  jwt: jwt, // Add this line
  // ... other options
}

const api = new window.JitsiMeetExternalAPI(domain, options)
```

## JWT Payload

The function generates a JWT with the following payload:

```json
{
  "aud": "jitsi",
  "iss": "chat", 
  "sub": "your-app-id",
  "room": "*",
  "iat": 1234567890,
  "exp": 1234574490,
  "nbf": 1234567830,
  "context": {
    "user": {
      "name": "User Name",
      "email": "user@example.com",
      "moderator": true
    },
    "features": {
      "livestreaming": true,
      "file-upload": true,
      "outbound-call": true,
      "sip-outbound-call": false,
      "transcription": true,
      "recording": true,
      "screen-sharing": true
    }
  }
}
```

## Security

- ✅ **Authentication Required**: Only logged-in users can request tokens
- ✅ **User Context**: Token includes user's name and email from Supabase auth
- ✅ **Moderator Rights**: All users get moderator privileges
- ✅ **2-Hour Expiration**: Tokens expire after 2 hours for security
- ✅ **CORS Enabled**: Proper CORS headers for frontend integration

## Error Handling

The function returns appropriate error responses:

- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Missing environment variables or JWT generation failure

## Testing

Test the function locally:

```bash
# Start Supabase locally
supabase start

# Test with curl (replace with your actual session token)
curl -X POST http://localhost:54321/functions/v1/get-jitsi-token \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "token": "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtMmVhZTQwNzk0YjI5NDdhZDkyZTAzNzFlNmMzZDBiZjQvU0FNUExFX0tFWV9JRCIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0..."
}
```
