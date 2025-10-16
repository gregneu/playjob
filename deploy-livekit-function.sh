#!/bin/bash

# Deploy the lk-token Edge Function to Supabase
# This script deploys the LiveKit token generation function

echo "🚀 Deploying lk-token Edge Function..."

# Deploy the function
supabase functions deploy lk-token

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables:"
    echo "   supabase secrets set LIVEKIT_WS_URL=\"wss://your-livekit-server.com\""
    echo "   supabase secrets set LIVEKIT_API_KEY=\"your-api-key\""
    echo "   supabase secrets set LIVEKIT_API_SECRET=\"your-api-secret\""
    echo ""
    echo "2. Test the function:"
    echo "   curl -X GET \"https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/lk-token?identity=test&room=test\""
    echo ""
    echo "3. View in dashboard:"
    echo "   https://supabase.com/dashboard/project/cicmapcwlvdatmgwdylh/functions"
else
    echo "❌ Deployment failed!"
    exit 1
fi
