const db = require('../config/database');

class FeedService {
    /**
     * Get personalized home feed for a user
     * Shows posts from users they follow, ordered by recency
     * @param {number} userId - ID of the user
     * @param {Object} options - Pagination and filter options
     * @returns {Promise<Array>} List of posts for the feed
     */
    async getHomeFeed(userId, options = {}) {
        const { limit = 20, offset = 0, includeOwnPosts = true } = options;

        let userFilter = '';
        if (includeOwnPosts) {
            userFilter = 'AND (p.user_id = $1 OR f.follower_id = $1)';
        } else {
            userFilter = 'AND f.follower_id = $1';
        }

        const query = `
            SELECT DISTINCT
                p.id,
                p.content,
                p.hashtags,
                p.created_at,
                p.updated_at,
                u.id AS author_id,
                u.username AS author_username,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar,
                COALESCE(l.like_count, 0) AS like_count,
                COALESCE(r.reaction_counts, '{}')::jsonb AS reaction_counts,
                EXISTS(
                    SELECT 1 FROM likes 
                    WHERE post_id = p.id AND user_id = $1
                ) AS user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN follows f ON p.user_id = f.following_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS like_count
                FROM likes
                GROUP BY post_id
            ) l ON p.id = l.post_id
            LEFT JOIN (
                SELECT post_id, jsonb_object_agg(reaction_type, count) AS reaction_counts
                FROM (
                    SELECT post_id, reaction_type, COUNT(*) AS count
                    FROM reactions
                    GROUP BY post_id, reaction_type
                ) r_sub
                GROUP BY post_id
            ) r ON p.id = r.post_id
            WHERE p.deleted_at IS NULL
            ${userFilter}
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Get global/public feed showing all posts
     * @param {number} viewerId - ID of the viewing user (for like status)
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of all public posts
     */
    async getGlobalFeed(viewerId = null, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const likeCheckClause = viewerId 
            ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $3)` 
            : 'false';

        const params = viewerId 
            ? [limit, offset, viewerId] 
            : [limit, offset];

        const query = `
            SELECT 
                p.id,
                p.content,
                p.hashtags,
                p.created_at,
                u.id AS author_id,
                u.username AS author_username,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar,
                COALESCE(l.like_count, 0) AS like_count,
                ${likeCheckClause} AS user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS like_count
                FROM likes
                GROUP BY post_id
            ) l ON p.id = l.post_id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get feed for posts containing a specific hashtag
     * @param {string} hashtag - Hashtag to filter by (without #)
     * @param {number} viewerId - ID of the viewing user
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of posts with the hashtag
     */
    async getHashtagFeed(hashtag, viewerId = null, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, '');

        const likeCheckClause = viewerId 
            ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $4)` 
            : 'false';

        const params = viewerId 
            ? [normalizedHashtag, limit, offset, viewerId] 
            : [normalizedHashtag, limit, offset];

        const query = `
            SELECT 
                p.id,
                p.content,
                p.hashtags,
                p.created_at,
                u.id AS author_id,
                u.username AS author_username,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar,
                COALESCE(l.like_count, 0) AS like_count,
                ${likeCheckClause} AS user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS like_count
                FROM likes
                GROUP BY post_id
            ) l ON p.id = l.post_id
            WHERE p.deleted_at IS NULL
            AND $1 = ANY(p.hashtags)
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get user's activity feed (their own posts)
     * @param {number} userId - ID of the user whose feed to get
     * @param {number} viewerId - ID of the viewing user
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of user's posts
     */
    async getUserFeed(userId, viewerId = null, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const likeCheckClause = viewerId 
            ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $4)` 
            : 'false';

        const params = viewerId 
            ? [userId, limit, offset, viewerId] 
            : [userId, limit, offset];

        const query = `
            SELECT 
                p.id,
                p.content,
                p.hashtags,
                p.created_at,
                u.id AS author_id,
                u.username AS author_username,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar,
                COALESCE(l.like_count, 0) AS like_count,
                ${likeCheckClause} AS user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS like_count
                FROM likes
                GROUP BY post_id
            ) l ON p.id = l.post_id
            WHERE p.user_id = $1
            AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new FeedService();
