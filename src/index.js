const express = require('express');
const { PostService } = require('./services/postService');
const { UserService } = require('./services/userService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize services
const postService = new PostService();
const userService = new UserService();

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Post routes
app.get('/api/posts', (req, res) => {
	const { trending, userId } = req.query;
	let posts;

	if (trending === 'true') {
		posts = postService.getTrendingPosts();
	} else if (userId) {
		posts = postService.getFeedForUser(userId, userService);
	} else {
		posts = postService.getAllPosts();
	}

	res.json({ posts });
});

app.post('/api/posts', (req, res) => {
	const { userId, content } = req.body;

	if (!userId || !content) {
		return res.status(400).json({ error: 'userId and content are required' });
	}

	try {
		const post = postService.createPost(userId, content);
		userService.incrementPostCount(userId);
		res.status(201).json({ post });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});

app.post('/api/posts/:id/like', (req, res) => {
	const { id } = req.params;
	const { userId } = req.body;

	if (!userId) {
		return res.status(400).json({ error: 'userId is required' });
	}

	const result = postService.likePost(id, userId);
	if (!result) {
		return res.status(404).json({ error: 'Post not found' });
	}

	res.json({ post: result, animated: true });
});

// User routes
app.get('/api/users/:id', (req, res) => {
	const user = userService.getUser(req.params.id);
	if (!user) {
		return res.status(404).json({ error: 'User not found' });
	}

	const activityFeed = postService.getPostsByUser(req.params.id);
	res.json({ user, activityFeed });
});

app.post('/api/users', (req, res) => {
	const { username, bio, avatar } = req.body;

	if (!username) {
		return res.status(400).json({ error: 'username is required' });
	}

	const user = userService.createUser(username, bio, avatar);
	res.status(201).json({ user });
});

app.post('/api/users/:id/follow', (req, res) => {
	const { followerId } = req.body;
	const targetId = req.params.id;

	if (!followerId) {
		return res.status(400).json({ error: 'followerId is required' });
	}

	const result = userService.followUser(followerId, targetId);
	if (!result.success) {
		return res.status(400).json({ error: result.error });
	}

	res.json({ message: result.message });
});

// Leaderboard route
app.get('/api/leaderboard', (req, res) => {
	const leaderboard = userService.getLeaderboard(postService);
	res.json({ leaderboard });
});

// Start server
app.listen(PORT, () => {
	console.log(`🐦 Chirpboard running on http://localhost:${PORT}`);
});

module.exports = app;