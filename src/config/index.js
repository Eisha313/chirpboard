require('dotenv').config();

const config = {
    server: {
        port: parseInt(process.env.PORT, 10) || 3000,
        env: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        isTest: process.env.NODE_ENV === 'test'
    },
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chirpboard',
        testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/chirpboard_test'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },
    posts: {
        maxLength: parseInt(process.env.MAX_POST_LENGTH, 10) || 280,
        maxHashtags: parseInt(process.env.MAX_HASHTAGS_PER_POST, 10) || 10
    },
    engagement: {
        trendingWindowHours: 24,
        trendingMinLikes: 5,
        leaderboardSize: 10
    }
};

// Validate required configuration in production
if (config.server.isProduction) {
    const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}

module.exports = config;
