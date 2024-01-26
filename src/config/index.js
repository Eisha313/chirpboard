require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chirpboard',
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
  }
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
