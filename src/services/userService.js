const { v4: uuidv4 } = require('uuid');

// Default avatar for new users
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg';

/**
 * Service for managing user profiles, follows, and leaderboard
 */
class UserService {
	constructor() {
		// In-memory storage (replace with database in production)
		this.users = new Map();
	}

	/**
	 * Create a new user profile
	 * @param {string} username - Display name
	 * @param {string} bio - User biography
	 * @param {string} avatar - Avatar URL
	 * @returns {Object} Created user object
	 */
	createUser(username, bio = '', avatar = null) {
		const user = {
			id: uuidv4(),
			username,
			bio,
			avatar: avatar || `${DEFAULT_AVATAR}?seed=${username}`,
			followers: [],
			following: [],
			postCount: 0,
			createdAt: new Date().toISOString()
		};

		this.users.set(user.id, user);
		return user;
	}

	/**
	 * Get user by ID
	 * @param {string} userId - User ID
	 * @returns {Object|null} User object or null
	 */
	getUser(userId) {
		return this.users.get(userId) || null;
	}

	/**
	 * Update user profile
	 * @param {string} userId - User ID
	 * @param {Object} updates - Fields to update
	 * @returns {Object|null} Updated user or null
	 */
	updateUser(userId, updates) {
		const user = this.users.get(userId);
		if (!user) return null;

		const allowedFields = ['username', 'bio', 'avatar'];
		allowedFields.forEach(field => {
			if (updates[field] !== undefined) {
				user[field] = updates[field];
			}
		});

		return user;
	}

	/**
	 * Follow another user
	 * @param {string} followerId - User who wants to follow
	 * @param {string} targetId - User to be followed
	 * @returns {Object} Result object
	 */
	followUser(followerId, targetId) {
		if (followerId === targetId) {
			return { success: false, error: 'Cannot follow yourself' };
		}

		const follower = this.users.get(followerId);
		const target = this.users.get(targetId);

		if (!follower || !target) {
			return { success: false, error: 'User not found' };
		}

		// Check if already following
		if (follower.following.includes(targetId)) {
			// Unfollow
			follower.following = follower.following.filter(id => id !== targetId);
			target.followers = target.followers.filter(id => id !== followerId);
			return { success: true, message: 'Unfollowed successfully' };
		}

		// Follow
		follower.following.push(targetId);
		target.followers.push(followerId);
		return { success: true, message: 'Followed successfully' };
	}

	/**
	 * Increment post count for user
	 * @param {string} userId - User ID
	 */
	incrementPostCount(userId) {
		const user = this.users.get(userId);
		if (user) {
			user.postCount++;
		}
	}

	/**
	 * Get community leaderboard
	 * @param {PostService} postService - Post service for likes calculation
	 * @param {number} limit - Maximum users to return
	 * @returns {Array} Leaderboard entries
	 */
	getLeaderboard(postService, limit = 10) {
		return Array.from(this.users.values())
			.map(user => {
				const totalLikes = postService.getTotalLikesForUser(user.id);
				const activityScore = this._calculateActivityScore(user, totalLikes);

				return {
					id: user.id,
					username: user.username,
					avatar: user.avatar,
					postCount: user.postCount,
					followerCount: user.followers.length,
					totalLikes,
					activityScore
				};
			})
			.sort((a, b) => b.activityScore - a.activityScore)
			.slice(0, limit)
			.map((entry, index) => ({
				rank: index + 1,
				...entry
			}));
	}

	/**
	 * Calculate activity score for leaderboard ranking
	 * Considers posts, followers, and likes received
	 */
	_calculateActivityScore(user, totalLikes) {
		const postWeight = 3;
		const followerWeight = 2;
		const likeWeight = 1;

		return (
			(user.postCount * postWeight) +
			(user.followers.length * followerWeight) +
			(totalLikes * likeWeight)
		);
	}

	/**
	 * Get all users (for admin/debug)
	 * @returns {Array} All users
	 */
	getAllUsers() {
		return Array.from(this.users.values());
	}
}

module.exports = { UserService };