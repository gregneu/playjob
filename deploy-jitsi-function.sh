#!/bin/bash

# Deploy the get-jitsi-token Edge Function to Supabase

echo "🚀 Deploying get-jitsi-token Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy get-jitsi-token

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Set your environment variables:"
    echo "   supabase secrets set JITSI_APP_ID=your-app-id"
    echo "   supabase secrets set JITSI_PRIVATE_KEY='your-private-key'"
    echo "   supabase secrets set JITSI_KEY_ID=your-key-id"
    echo ""
    echo "2. Test the function with the test script:"
    echo "   Open your app, log in, and run the test-jitsi-token.js script in browser console"
    echo ""
    echo "3. The function will be available at:"
    echo "   https://your-project.supabase.co/functions/v1/get-jitsi-token"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
