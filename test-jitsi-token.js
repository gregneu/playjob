// Test script for the get-jitsi-token Edge Function
// Run this in your browser console after logging into your app

async function testJitsiToken() {
  try {
    // Get the current session token (you need to be logged in)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No active session. Please log in first.')
      return
    }

    console.log('🔑 Testing Jitsi token generation...')
    
    const response = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/get-jitsi-token', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Failed to get Jitsi token:', errorData)
      return
    }

    const { token } = await response.json()
    console.log('✅ Jitsi token obtained successfully!')
    console.log('🔐 Token (first 50 chars):', token.substring(0, 50) + '...')
    
    // Decode the JWT payload to verify it
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('📋 Token payload:', payload)
      console.log('⏰ Expires at:', new Date(payload.exp * 1000).toLocaleString())
    } catch (e) {
      console.log('⚠️ Could not decode token payload')
    }
    
    return token
  } catch (error) {
    console.error('❌ Error testing Jitsi token:', error)
  }
}

// Run the test
testJitsiToken()
