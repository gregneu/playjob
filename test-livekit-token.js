// Test script for the lk-token Edge Function
// Run this in your browser console

async function testLiveKitToken() {
  console.log('🧪 Testing LiveKit token generation...')
  
  try {
    // Test GET request with query parameters
    console.log('\n1️⃣ Testing GET request...')
    const getResponse = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/lk-token?identity=test-user&room=test-room', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 GET Response status:', getResponse.status)
    
    if (getResponse.ok) {
      const getData = await getResponse.json()
      console.log('✅ GET Response:', getData)
      
      // Validate response structure
      if (getData.token && getData.wsUrl && getData.identity && getData.room) {
        console.log('✅ GET Response structure is valid')
        console.log('🔐 Token (first 50 chars):', getData.token.substring(0, 50) + '...')
        console.log('🌐 WebSocket URL:', getData.wsUrl)
        console.log('👤 Identity:', getData.identity)
        console.log('🏠 Room:', getData.room)
      } else {
        console.error('❌ GET Response missing required fields')
      }
    } else {
      const errorText = await getResponse.text()
      console.error('❌ GET Request failed:', getResponse.status, errorText)
    }

    // Test POST request with body
    console.log('\n2️⃣ Testing POST request...')
    const postResponse = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/lk-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity: 'post-test-user',
        room: 'post-test-room'
      })
    })

    console.log('📡 POST Response status:', postResponse.status)
    
    if (postResponse.ok) {
      const postData = await postResponse.json()
      console.log('✅ POST Response:', postData)
      
      // Validate response structure
      if (postData.token && postData.wsUrl && postData.identity && postData.room) {
        console.log('✅ POST Response structure is valid')
        console.log('🔐 Token (first 50 chars):', postData.token.substring(0, 50) + '...')
        console.log('🌐 WebSocket URL:', postData.wsUrl)
        console.log('👤 Identity:', postData.identity)
        console.log('🏠 Room:', postData.room)
      } else {
        console.error('❌ POST Response missing required fields')
      }
    } else {
      const errorText = await postResponse.text()
      console.error('❌ POST Request failed:', postResponse.status, errorText)
    }

    // Test default values (no parameters)
    console.log('\n3️⃣ Testing default values...')
    const defaultResponse = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/lk-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Default Response status:', defaultResponse.status)
    
    if (defaultResponse.ok) {
      const defaultData = await defaultResponse.json()
      console.log('✅ Default Response:', defaultData)
      
      // Check if default values are used
      if (defaultData.identity.startsWith('guest-') && defaultData.room === 'playjoob') {
        console.log('✅ Default values are working correctly')
      } else {
        console.log('⚠️ Default values may not be working as expected')
      }
    } else {
      const errorText = await defaultResponse.text()
      console.error('❌ Default Request failed:', defaultResponse.status, errorText)
    }

    console.log('\n🎉 LiveKit token function test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testLiveKitToken()
