// Comprehensive debug script for Jitsi integration
// Run this in your browser console after logging into your app

async function debugJitsiIntegration() {
  console.log('🔍 Starting comprehensive Jitsi integration debug...')
  
  try {
    // 1. Check authentication
    console.log('\n1️⃣ Checking authentication...')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No active session. Please log in first.')
      return
    }
    
    console.log('✅ User is authenticated')
    console.log('👤 User:', session.user.email)
    console.log('🔑 Session token (first 20 chars):', session.access_token.substring(0, 20) + '...')

    // 2. Test Edge Function endpoint
    console.log('\n2️⃣ Testing Edge Function endpoint...')
    
    const response = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/get-jitsi-token', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Response status:', response.status)
    console.log('📡 Response status text:', response.statusText)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

    // Get response as text first
    const responseText = await response.text()
    console.log('📄 Response text (first 500 chars):', responseText.substring(0, 500))

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

    // 3. Parse and validate JWT
    console.log('\n3️⃣ Parsing and validating JWT...')
    
    try {
      const data = JSON.parse(responseText)
      const { token } = data
      
      if (!token) {
        console.error('❌ No token in response:', data)
        return
      }

      console.log('✅ JWT token received')
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
      console.log('🎯 Token is valid and ready to use!')
      
    } catch (parseError) {
      console.error('❌ Failed to parse JWT:', parseError)
      return
    }

    // 4. Test Jitsi API availability
    console.log('\n4️⃣ Testing Jitsi API availability...')
    
    if (window.JitsiMeetExternalAPI) {
      console.log('✅ JitsiMeetExternalAPI is available')
    } else {
      console.log('⚠️ JitsiMeetExternalAPI not loaded, testing script loading...')
      
      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.onload = () => {
        console.log('✅ Jitsi script loaded successfully')
        if (window.JitsiMeetExternalAPI) {
          console.log('✅ JitsiMeetExternalAPI is now available')
        }
      }
      script.onerror = (error) => {
        console.error('❌ Failed to load Jitsi script:', error)
      }
      document.body.appendChild(script)
    }

    console.log('\n🎉 Debug complete! If all steps passed, your Jitsi integration should work.')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug
debugJitsiIntegration()
