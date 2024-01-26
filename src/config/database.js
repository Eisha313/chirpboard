const { Pool } = require('pg');
const config = require('./index');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      connectionString: config.database.url,
      max: config.database.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.isConnected = false;
    });

    this.pool.on('connect', () => {
      this.isConnected = true;
    });

    // Test the connection
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('Database connected successfully');
    } catch (err) {
      console.error('Database connection failed:', err.message);
      throw err;
    }

    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.getPool().query(text, params);
      const duration = Date.now() - start;
      if (config.env === 'development') {
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
      }
      return result;
    } catch (err) {
      console.error('Query error:', { text: text.substring(0, 50), error: err.message });
      throw err;
    }
  }

  async transaction(callback) {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new Database();
