/**
 * Fixes E11000 duplicate key on username (null) by dropping the old
 * non-sparse unique index and letting Mongoose recreate a sparse unique index.
 * Run once: node server/scripts/fixUsernameIndex.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('users');

    const indexes = await collection.indexes();
    const usernameIndex = indexes.find((i) => i.key && i.key.username === 1);
    if (usernameIndex) {
      if (!usernameIndex.sparse) {
        await collection.dropIndex(usernameIndex.name);
        console.log('Dropped old non-sparse index:', usernameIndex.name);
      } else {
        console.log('username index is already sparse; no change needed.');
        process.exit(0);
        return;
      }
    }

    // Recreate sparse unique index so multiple users can have username: null
    await collection.createIndex(
      { username: 1 },
      { unique: true, sparse: true }
    );
    console.log('Created sparse unique index on username. Multiple null usernames are now allowed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
