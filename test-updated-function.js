// Test the updated get-jitsi-token Edge Function
// Run this in your browser console after logging into your app

async function testUpdatedFunction() {
  console.log('🧪 Testing updated get-jitsi-token function...')
  
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No active session. Please log in first.')
      return
    }

    console.log('✅ User is authenticated')
    
    // Test the function endpoint
    const response = await fetch('/functions/v1/get-jitsi-token', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Response status:', response.status)
    
    // Get response as text first
    const responseText = await response.text()
    console.log('📄 Response text (first 300 chars):', responseText.substring(0, 300))

    if (!response.ok) {
      console.error('❌ HTTP error:', response.status, response.statusText)
      
      // Try to parse as JSON for error details
      try {
        const errorData = JSON.parse(responseText)
        console.error('❌ Error details:', errorData)
        
        if (errorData.error === 'Missing Jitsi private key or App ID') {
          console.log('\n🔧 SOLUTION: You need to set the JITSI_PRIVATE_KEY environment variable:')
          console.log('   supabase secrets set JITSI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_HERE\\n-----END PRIVATE KEY-----"')
          console.log('\n📋 To get your private key:')
          console.log('   1. Go to https://jaas.8x8.vc/')
          console.log('   2. Navigate to your App → API Keys')
          console.log('   3. Copy the Private Key (full key including headers)')
          console.log('   4. Run the supabase secrets set command above')
        }
      } catch (parseError) {
        console.error('❌ Non-JSON error response:', responseText.substring(0, 500))
      }
      return
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText)
      const { token } = data
      
      if (!token) {
        console.error('❌ No token in response:', data)
        return
      }

      console.log('✅ JWT token received successfully!')
      console.log('🔐 Token (first 50 chars):', token.substring(0, 50) + '...')
      
      // Decode JWT payload
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('📋 JWT Payload:', payload)
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        console.error('❌ JWT token is expired')
        return
      }
      
      console.log('⏰ Token expires at:', new Date(payload.exp * 1000).toLocaleString())
      console.log('🎯 Function is working perfectly!')
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError)
      console.error('❌ Response was:', responseText.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testUpdatedFunction()
