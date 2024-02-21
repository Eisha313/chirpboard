require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { initializeDatabase } = require('./config/database');
const { globalErrorHandler, setupGlobalHandlers, asyncHandler } = require('./utils/errorHandler');
const apiResponse = require('./utils/apiResponse');

const postService = require('./services/postService');
const userService = require('./services/userService');
const likeService = require('./services/likeService');
const followService = require('./services/followService');
const feedService = require('./services/feedService');
const leaderboardService = require('./services/leaderboardService');
const hashtagService = require('./services/hashtagService');

// Setup global error handlers
setupGlobalHandlers();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  handler: (req, res) => {
    res.status(429).json(apiResponse.rateLimited(60));
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(apiResponse.success({ status: 'healthy', version: '1.0.0' }));
});

// API Routes
app.get('/api/posts', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const posts = await postService.getAllPosts(parseInt(page), parseInt(limit));
  res.json(apiResponse.success(posts));
}));

app.get('/api/posts/:id', asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id);
  if (!post) {
    return res.status(404).json(apiResponse.notFound('Post'));
  }
  res.json(apiResponse.success(post));
}));

app.post('/api/posts', asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.body);
  res.status(201).json(apiResponse.created(post, 'Post created successfully'));
}));

app.delete('/api/posts/:id', asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id);
  res.json(apiResponse.deleted('Post deleted successfully'));
}));

app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(apiResponse.success(users));
}));

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json(apiResponse.notFound('User'));
  }
  res.json(apiResponse.success(user));
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json(apiResponse.created(user, 'User created successfully'));
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(apiResponse.success(user, 'User updated successfully'));
}));

app.post('/api/posts/:postId/like', asyncHandler(async (req, res) => {
  const { userId, reactionType } = req.body;
  const result = await likeService.toggleLike(req.params.postId, userId, reactionType);
  res.json(apiResponse.success(result));
}));

app.get('/api/posts/:postId/reactions', asyncHandler(async (req, res) => {
  const reactions = await likeService.getPostReactions(req.params.postId);
  res.json(apiResponse.success(reactions));
}));

app.post('/api/users/:userId/follow/:targetId', asyncHandler(async (req, res) => {
  const result = await followService.followUser(req.params.userId, req.params.targetId);
  res.json(apiResponse.success(result));
}));

app.delete('/api/users/:userId/follow/:targetId', asyncHandler(async (req, res) => {
  await followService.unfollowUser(req.params.userId, req.params.targetId);
  res.json(apiResponse.deleted('Unfollowed successfully'));
}));

app.get('/api/users/:userId/followers', asyncHandler(async (req, res) => {
  const followers = await followService.getFollowers(req.params.userId);
  res.json(apiResponse.success(followers));
}));

app.get('/api/users/:userId/following', asyncHandler(async (req, res) => {
  const following = await followService.getFollowing(req.params.userId);
  res.json(apiResponse.success(following));
}));

app.get('/api/feed/:userId', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const feed = await feedService.getHomeFeed(req.params.userId, parseInt(page), parseInt(limit));
  res.json(apiResponse.success(feed));
}));

app.get('/api/feed/:userId/discover', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const feed = await feedService.getDiscoverFeed(req.params.userId, parseInt(page), parseInt(limit));
  res.json(apiResponse.success(feed));
}));

app.get('/api/leaderboard', asyncHandler(async (req, res) => {
  const { type = 'engagement', period = 'weekly' } = req.query;
  const leaderboard = await leaderboardService.getLeaderboard(type, period);
  res.json(apiResponse.success(leaderboard));
}));

app.get('/api/hashtags/trending', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const trending = await hashtagService.getTrendingHashtags(parseInt(limit));
  res.json(apiResponse.success(trending));
}));

app.get('/api/hashtags/:tag/posts', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const posts = await hashtagService.getPostsByHashtag(req.params.tag, parseInt(page), parseInt(limit));
  res.json(apiResponse.success(posts));
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json(apiResponse.notFound('Endpoint'));
});

// Global error handler (must be last)
app.use(globalErrorHandler);

async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    app.listen(config.port, () => {
      console.log(`ChirpBoard server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
