require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'chirpboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  posts: {
    maxLength: parseInt(process.env.POST_MAX_LENGTH, 10) || 280,
    hashtagLimit: parseInt(process.env.HASHTAG_LIMIT, 10) || 10,
  },
  
  feed: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  trending: {
    timeWindowHours: 24,
    minEngagement: 5,
  },
  
  leaderboard: {
    cacheTimeSeconds: 300,
    topUsersLimit: 50,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
};

// Validate required config in production
if (config.env === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
