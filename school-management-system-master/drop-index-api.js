// Simple script to drop the old index via API
const axios = require('axios');

async function dropIndex() {
  try {
    // You'll need to provide your auth token or run this after logging in
    // For now, let's use the API endpoint directly
    console.log('📞 Calling API to drop old index...');
    console.log('⚠️  Note: You need to be logged in. If this fails, use the script instead.');
    
    const response = await axios.post('http://localhost:9999/api/attendance/drop-old-index', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data);
      console.error('💡 You may need to be authenticated. Try running the script instead:');
      console.error('   node server/scripts/dropOldAttendanceIndex.js');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

dropIndex();

