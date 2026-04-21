(async ()=>{
  const { MongoClient } = require('mongodb');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB || 'ecom';
  const client = new MongoClient(mongoUri);
  try{
    await client.connect();
    const db = client.db(dbName);
    const users = await db.collection('users').countDocuments();
    const sessions = await db.collection('sessions').countDocuments();
    const resets = await db.collection('passwordResets').countDocuments();
    console.log('counts:', { users, sessions, resets });
  }catch(e){
    console.error('error', e && e.message);
  }finally{ await client.close(); }
})();
