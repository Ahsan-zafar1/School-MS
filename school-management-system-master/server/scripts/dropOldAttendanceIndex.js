const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function dropOldIndex() {
  try {
    // Connect to MongoDB - use the same connection string as server.js
    // Try both MONGO_URI and MONGODB_URI (server.js uses MONGODB_URI)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school-management';
    
    if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/school-management') {
      console.warn('⚠️  Using default MongoDB connection. If this fails, check your .env file.');
      console.log('💡 Your .env should contain: MONGODB_URI=your-connection-string');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`📍 Connection: ${maskedUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('attendances');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.partialFilterExpression) {
        console.log(`    Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    // Try to drop the old index
    let dropped = false;
    try {
      await collection.dropIndex('date_1_student_1');
      console.log('\n✅ Successfully dropped old index: date_1_student_1');
      dropped = true;
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound' || error.message.includes('not found')) {
        console.log('\nℹ️  Index date_1_student_1 does not exist (already dropped or never created)');
      } else {
        console.error('\n❌ Error dropping index:', error.message);
        throw error;
      }
    }

    // Verify indexes after dropping
    const indexesAfter = await collection.indexes();
    console.log('\n📋 Indexes after cleanup:');
    indexesAfter.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.partialFilterExpression) {
        console.log(`    Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    if (dropped) {
      console.log('\n✅ Index cleanup completed successfully!');
      console.log('💡 Restart your Node.js server to ensure new indexes are created properly.');
    } else {
      console.log('\n✅ Index check completed. No action needed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. Your MONGODB_URI in .env file is correct');
      console.error('   3. Your network/firewall allows the connection');
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
dropOldIndex();

