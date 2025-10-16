// Test script to verify the Edge Function deployment
// Run this in your browser console after logging into your app

async function testFunctionDeployment() {
  try {
    console.log('🧪 Testing Edge Function deployment...')
    
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No active session. Please log in first.')
      return
    }

    console.log('✅ User is authenticated')
    
    // Test the function endpoint
    const response = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/get-jitsi-token', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Function error:', errorData)
      
      if (errorData.error === 'Missing Jitsi private key or App ID') {
        console.log('🔧 You need to set the JITSI_PRIVATE_KEY environment variable:')
        console.log('   supabase secrets set JITSI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_HERE\\n-----END PRIVATE KEY-----"')
      }
      return
    }

    const { token } = await response.json()
    console.log('✅ Function is working!')
    console.log('🔐 Token received (first 50 chars):', token.substring(0, 50) + '...')
    
    // Decode the JWT payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('📋 Token payload:', payload)
      console.log('⏰ Expires at:', new Date(payload.exp * 1000).toLocaleString())
    } catch (e) {
      console.log('⚠️ Could not decode token payload')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testFunctionDeployment()
