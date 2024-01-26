const db = require('../config/database');

class FollowService {
    /**
     * Follow a user
     * @param {number} followerId - ID of the user who wants to follow
     * @param {number} followingId - ID of the user to be followed
     * @returns {Promise<Object>} The created follow relationship
     */
    async follow(followerId, followingId) {
        if (followerId === followingId) {
            throw new Error('Users cannot follow themselves');
        }

        const query = `
            INSERT INTO follows (follower_id, following_id)
            VALUES ($1, $2)
            ON CONFLICT (follower_id, following_id) DO NOTHING
            RETURNING *
        `;

        const result = await db.query(query, [followerId, followingId]);
        
        if (result.rows.length === 0) {
            return { alreadyFollowing: true };
        }

        return result.rows[0];
    }

    /**
     * Unfollow a user
     * @param {number} followerId - ID of the user who wants to unfollow
     * @param {number} followingId - ID of the user to be unfollowed
     * @returns {Promise<boolean>} True if unfollowed, false if wasn't following
     */
    async unfollow(followerId, followingId) {
        const query = `
            DELETE FROM follows
            WHERE follower_id = $1 AND following_id = $2
            RETURNING id
        `;

        const result = await db.query(query, [followerId, followingId]);
        return result.rows.length > 0;
    }

    /**
     * Check if a user is following another user
     * @param {number} followerId - ID of the potential follower
     * @param {number} followingId - ID of the user potentially being followed
     * @returns {Promise<boolean>} True if following
     */
    async isFollowing(followerId, followingId) {
        const query = `
            SELECT 1 FROM follows
            WHERE follower_id = $1 AND following_id = $2
        `;

        const result = await db.query(query, [followerId, followingId]);
        return result.rows.length > 0;
    }

    /**
     * Get followers of a user
     * @param {number} userId - ID of the user
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of followers with user details
     */
    async getFollowers(userId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                f.created_at AS followed_at
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Get users that a user is following
     * @param {number} userId - ID of the user
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of followed users with details
     */
    async getFollowing(userId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                f.created_at AS followed_at
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = $1
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Get follow statistics for a user
     * @param {number} userId - ID of the user
     * @returns {Promise<Object>} Follower and following counts
     */
    async getFollowStats(userId) {
        const query = `
            SELECT 
                followers_count,
                following_count
            FROM user_follow_stats
            WHERE user_id = $1
        `;

        const result = await db.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return { followers_count: 0, following_count: 0 };
        }

        return result.rows[0];
    }

    /**
     * Get mutual followers (users who follow each other)
     * @param {number} userId - ID of the user
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of mutual followers
     */
    async getMutualFollowers(userId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url
            FROM follows f1
            JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            JOIN users u ON f1.follower_id = u.id
            WHERE f1.following_id = $1
            ORDER BY f1.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Get suggested users to follow based on mutual connections
     * @param {number} userId - ID of the user
     * @param {number} limit - Maximum suggestions to return
     * @returns {Promise<Array>} List of suggested users
     */
    async getSuggestedUsers(userId, limit = 10) {
        const query = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                COUNT(DISTINCT mutual.follower_id) AS mutual_followers_count
            FROM users u
            LEFT JOIN follows mutual ON u.id = mutual.following_id
            LEFT JOIN follows my_following ON mutual.follower_id = my_following.following_id AND my_following.follower_id = $1
            WHERE u.id != $1
            AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
            AND my_following.follower_id IS NOT NULL
            GROUP BY u.id
            ORDER BY mutual_followers_count DESC, u.created_at DESC
            LIMIT $2
        `;

        const result = await db.query(query, [userId, limit]);
        return result.rows;
    }
}

module.exports = new FollowService();
