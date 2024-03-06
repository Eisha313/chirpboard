const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

async function initializeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database initialized successfully');
  } catch (err) {
    console.warn('Database not available, running in limited mode:', err.message);
  }
}

module.exports = {
  initializeDatabase,
  query: (text, params) => pool.query(text, params),
  
  getClient: async () => {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);
    
    // Track if client has been released
    let released = false;
    
    // Override release to prevent double-release
    client.release = () => {
      if (released) {
        console.warn('Client already released, ignoring duplicate release call');
        return;
      }
      released = true;
      return originalRelease();
    };
    
    // Add timeout for unreleased clients
    const timeout = setTimeout(() => {
      if (!released) {
        console.error('Client has been checked out for too long, releasing');
        client.release();
      }
    }, 30000);
    
    client.query = (...args) => {
      return originalQuery(...args);
    };
    
    // Clear timeout when released
    const wrappedRelease = client.release;
    client.release = () => {
      clearTimeout(timeout);
      return wrappedRelease();
    };
    
    return client;
  },
  
  pool
};
