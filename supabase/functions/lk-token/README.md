# LiveKit Token Generator

This Supabase Edge Function generates JWT tokens for LiveKit video conferencing.

## Environment Variables Required

Set these secrets in your Supabase project:

```bash
supabase secrets set LIVEKIT_WS_URL="wss://your-livekit-server.com"
supabase secrets set LIVEKIT_API_KEY="your-api-key"
supabase secrets set LIVEKIT_API_SECRET="your-api-secret"
```

## Usage

### GET Request
```
GET https://your-project.supabase.co/functions/v1/lk-token?identity=user123&room=meeting-room
```

### POST Request
```json
POST https://your-project.supabase.co/functions/v1/lk-token
Content-Type: application/json

{
  "identity": "user123",
  "room": "meeting-room"
}
```

## Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "wss://your-livekit-server.com",
  "identity": "user123",
  "room": "meeting-room"
}
```

## Features

- **HS256 JWT signing** using LiveKit API secret
- **CORS support** for browser requests
- **Flexible input**: GET query params or POST body
- **Default values**: Auto-generates guest identity and room name
- **Token expiration**: 1 hour from generation
- **Video permissions**: Full publish/subscribe access

## Deploy

```bash
supabase functions deploy lk-token
```
