const { v4: uuidv4 } = require('uuid');

// Maximum characters allowed per post
const MAX_POST_LENGTH = 280;

// Hashtag extraction regex
const HASHTAG_REGEX = /#[\w]+/g;

/**
 * Service for managing posts, likes, and engagement metrics
 */
class PostService {
	constructor() {
		// In-memory storage (replace with database in production)
		this.posts = new Map();
	}

	/**
	 * Create a new post with hashtag extraction
	 * @param {string} userId - Author's user ID
	 * @param {string} content - Post content
	 * @returns {Object} Created post object
	 */
	createPost(userId, content) {
		if (content.length > MAX_POST_LENGTH) {
			throw new Error(`Post exceeds ${MAX_POST_LENGTH} character limit`);
		}

		const hashtags = content.match(HASHTAG_REGEX) || [];
		const post = {
			id: uuidv4(),
			userId,
			content,
			hashtags: hashtags.map(tag => tag.toLowerCase()),
			likes: new Set(),
			likeCount: 0,
			createdAt: new Date().toISOString(),
			engagement: 0
		};

		this.posts.set(post.id, post);
		return this._serializePost(post);
	}

	/**
	 * Like or unlike a post
	 * @param {string} postId - Post ID to like
	 * @param {string} userId - User performing the like
	 * @returns {Object|null} Updated post or null if not found
	 */
	likePost(postId, userId) {
		const post = this.posts.get(postId);
		if (!post) return null;

		if (post.likes.has(userId)) {
			// Unlike
			post.likes.delete(userId);
			post.likeCount--;
		} else {
			// Like
			post.likes.add(userId);
			post.likeCount++;
		}

		// Update engagement score
		post.engagement = this._calculateEngagement(post);
		return this._serializePost(post);
	}

	/**
	 * Get all posts sorted by creation date
	 * @returns {Array} Array of posts
	 */
	getAllPosts() {
		return Array.from(this.posts.values())
			.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
			.map(post => this._serializePost(post));
	}

	/**
	 * Get trending posts based on engagement algorithm
	 * @param {number} limit - Maximum posts to return
	 * @returns {Array} Array of trending posts
	 */
	getTrendingPosts(limit = 10) {
		return Array.from(this.posts.values())
			.map(post => ({
				...post,
				engagement: this._calculateEngagement(post)
			}))
			.sort((a, b) => b.engagement - a.engagement)
			.slice(0, limit)
			.map(post => this._serializePost(post));
	}

	/**
	 * Get posts by a specific user
	 * @param {string} userId - User ID
	 * @returns {Array} Array of user's posts
	 */
	getPostsByUser(userId) {
		return Array.from(this.posts.values())
			.filter(post => post.userId === userId)
			.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
			.map(post => this._serializePost(post));
	}

	/**
	 * Get personalized feed for user based on who they follow
	 * @param {string} userId - User ID
	 * @param {UserService} userService - User service instance
	 * @returns {Array} Personalized feed
	 */
	getFeedForUser(userId, userService) {
		const user = userService.getUser(userId);
		if (!user) return this.getAllPosts();

		const following = new Set(user.following);
		following.add(userId); // Include own posts

		return Array.from(this.posts.values())
			.filter(post => following.has(post.userId))
			.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
			.map(post => this._serializePost(post));
	}

	/**
	 * Get total likes received by a user
	 * @param {string} userId - User ID
	 * @returns {number} Total likes
	 */
	getTotalLikesForUser(userId) {
		return Array.from(this.posts.values())
			.filter(post => post.userId === userId)
			.reduce((total, post) => total + post.likeCount, 0);
	}

	/**
	 * Calculate engagement score for trending algorithm
	 * Considers likes, recency, and hashtag count
	 */
	_calculateEngagement(post) {
		const ageHours = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
		const recencyBoost = Math.max(0, 1 - (ageHours / 48)); // Decay over 48 hours
		const hashtagBoost = post.hashtags.length * 0.1;

		return (post.likeCount * 2) + (recencyBoost * 5) + hashtagBoost;
	}

	/**
	 * Serialize post for API response (convert Set to Array)
	 */
	_serializePost(post) {
		return {
			...post,
			likes: Array.from(post.likes),
			engagement: this._calculateEngagement(post)
		};
	}
}

module.exports = { PostService, MAX_POST_LENGTH };