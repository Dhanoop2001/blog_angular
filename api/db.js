const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'ecom';

let cachedClient = null;
let cachedDb = null;

async function connect() {
  if (cachedClient) return getCollections();

  const client = new MongoClient(mongoUri);
  await client.connect();
  
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;

  const usersCol = db.collection('users');
  const sessionsCol = db.collection('sessions');
  const resetsCol = db.collection('passwordResets');
  const blogsCol = db.collection('blogs');

  // Create indexes
  await Promise.all([
    blogsCol.createIndex({ createdAt: -1 }),
    blogsCol.createIndex({ _id: 1 }),
    resetsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  ].filter(Boolean));

  // Migrate blogs from JSON if empty
  const count = await blogsCol.countDocuments({});
  if (count === 0) {
    try {
      const fs = require('fs');
      const blogsPath = path.join(__dirname, '..', 'src', 'api', 'blogs.json');
      const jsonBlogs = JSON.parse(fs.readFileSync(blogsPath, 'utf8'));
      if (jsonBlogs && Array.isArray(jsonBlogs) && jsonBlogs.length > 0) {
        await blogsCol.insertMany(jsonBlogs);
        console.log(`Migrated ${jsonBlogs.length} blogs from JSON file`);
      }
    } catch (err) {
      console.warn('Blog JSON migration skipped:', err.message);
    }
  }

  console.log('Connected to MongoDB:', dbName);
  return getCollections();
}

function getCollections() {
  return {
    client: cachedClient,
    db: cachedDb,
    usersCol: cachedDb.collection('users'),
    sessionsCol: cachedDb.collection('sessions'),
    resetsCol: cachedDb.collection('passwordResets'),
    blogsCol: cachedDb.collection('blogs')
  };
}

module.exports = { connect, ObjectId };

