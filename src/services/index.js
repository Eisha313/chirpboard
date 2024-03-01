const serviceFactory = require('./serviceFactory');
const BaseService = require('./baseService');
const PostService = require('./postService');
const UserService = require('./userService');
const LikeService = require('./likeService');
const FollowService = require('./followService');
const FeedService = require('./feedService');
const LeaderboardService = require('./leaderboardService');
const HashtagService = require('./hashtagService');

// Register all services
serviceFactory.register('post', PostService);
serviceFactory.register('user', UserService);
serviceFactory.register('like', LikeService);
serviceFactory.register('follow', FollowService);
serviceFactory.register('feed', FeedService);
serviceFactory.register('leaderboard', LeaderboardService);
serviceFactory.register('hashtag', HashtagService);

async function initializeServices() {
  await serviceFactory.initialize();
  return serviceFactory.getAll();
}

function getServices() {
  return serviceFactory.getAll();
}

function getService(name) {
  return serviceFactory.get(name);
}

function resetServices() {
  serviceFactory.reset();
}

module.exports = {
  serviceFactory,
  BaseService,
  initializeServices,
  getServices,
  getService,
  resetServices,
  // Direct exports for backward compatibility
  PostService,
  UserService,
  LikeService,
  FollowService,
  FeedService,
  LeaderboardService,
  HashtagService
};
