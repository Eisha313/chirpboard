const { query, transaction } = require('../utils/dbHelpers');

const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

class HashtagService {
    /**
     * Extract hashtags from post content
     * @param {string} content - Post content
     * @returns {string[]} Array of hashtags (lowercase, without #)
     */
    extractHashtags(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const matches = content.match(HASHTAG_REGEX);
        if (!matches) {
            return [];
        }

        // Remove # and convert to lowercase, deduplicate
        const hashtags = [...new Set(
            matches.map(tag => tag.slice(1).toLowerCase())
        )];

        return hashtags.filter(tag => tag.length >= 2 && tag.length <= 100);
    }

    /**
     * Process hashtags for a new post
     * @param {number} postId - Post ID
     * @param {string} content - Post content
     * @returns {Promise<string[]>} Processed hashtags
     */
    async processPostHashtags(postId, content) {
        const hashtags = this.extractHashtags(content);

        if (hashtags.length === 0) {
            return [];
        }

        await transaction(async (client) => {
            for (const tag of hashtags) {
                // Upsert hashtag
                const hashtagResult = await client.query(
                    `INSERT INTO hashtags (tag, usage_count)
                     VALUES ($1, 1)
                     ON CONFLICT (tag) DO UPDATE
                     SET usage_count = hashtags.usage_count + 1,
                         updated_at = CURRENT_TIMESTAMP
                     RETURNING id`,
                    [tag]
                );

                const hashtagId = hashtagResult.rows[0].id;

                // Link post to hashtag
                await client.query(
                    `INSERT INTO post_hashtags (post_id, hashtag_id)
                     VALUES ($1, $2)
                     ON CONFLICT (post_id, hashtag_id) DO NOTHING`,
                    [postId, hashtagId]
                );
            }
        });

        return hashtags;
    }

    /**
     * Remove hashtag associations when a post is deleted
     * @param {number} postId - Post ID
     */
    async removePostHashtags(postId) {
        // Get hashtags associated with this post
        const associations = await query(
            `SELECT hashtag_id FROM post_hashtags WHERE post_id = $1`,
            [postId]
        );

        if (associations.rows.length === 0) {
            return;
        }

        await transaction(async (client) => {
            // Decrement usage counts
            for (const row of associations.rows) {
                await client.query(
                    `UPDATE hashtags
                     SET usage_count = GREATEST(usage_count - 1, 0),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [row.hashtag_id]
                );
            }

            // Remove associations
            await client.query(
                `DELETE FROM post_hashtags WHERE post_id = $1`,
                [postId]
            );
        });
    }

    /**
     * Get trending hashtags
     * @param {Object} options - Query options
     * @returns {Promise<Object[]>} Trending hashtags with usage stats
     */
    async getTrendingHashtags(options = {}) {
        const {
            limit = 10,
            hours = 24
        } = options;

        // Get hashtags with recent activity
        const result = await query(
            `SELECT 
                h.id,
                h.tag,
                h.usage_count AS total_usage,
                COUNT(ph.id) AS recent_usage,
                h.created_at
             FROM hashtags h
             LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
                AND ph.created_at > NOW() - INTERVAL '${hours} hours'
             GROUP BY h.id, h.tag, h.usage_count, h.created_at
             HAVING COUNT(ph.id) > 0
             ORDER BY COUNT(ph.id) DESC, h.usage_count DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows.map(row => ({
            id: row.id,
            tag: row.tag,
            totalUsage: parseInt(row.total_usage),
            recentUsage: parseInt(row.recent_usage),
            createdAt: row.created_at
        }));
    }

    /**
     * Get posts by hashtag
     * @param {string} tag - Hashtag (without #)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Posts with pagination info
     */
    async getPostsByHashtag(tag, options = {}) {
        const {
            limit = 20,
            offset = 0
        } = options;

        const normalizedTag = tag.toLowerCase().replace(/^#/, '');

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total
             FROM post_hashtags ph
             JOIN hashtags h ON ph.hashtag_id = h.id
             WHERE h.tag = $1`,
            [normalizedTag]
        );

        const total = parseInt(countResult.rows[0].total);

        // Get posts
        const result = await query(
            `SELECT 
                p.id,
                p.user_id,
                p.content,
                p.like_count,
                p.created_at,
                u.username,
                u.display_name,
                u.avatar_url
             FROM posts p
             JOIN post_hashtags ph ON p.id = ph.post_id
             JOIN hashtags h ON ph.hashtag_id = h.id
             JOIN users u ON p.user_id = u.id
             WHERE h.tag = $1
             ORDER BY p.created_at DESC
             LIMIT $2 OFFSET $3`,
            [normalizedTag, limit, offset]
        );

        return {
            posts: result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                content: row.content,
                likeCount: row.like_count,
                createdAt: row.created_at,
                author: {
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url
                }
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        };
    }

    /**
     * Search hashtags by prefix
     * @param {string} prefix - Search prefix
     * @param {number} limit - Max results
     * @returns {Promise<Object[]>} Matching hashtags
     */
    async searchHashtags(prefix, limit = 10) {
        const normalizedPrefix = prefix.toLowerCase().replace(/^#/, '');

        if (normalizedPrefix.length < 1) {
            return [];
        }

        const result = await query(
            `SELECT id, tag, usage_count
             FROM hashtags
             WHERE tag LIKE $1
             ORDER BY usage_count DESC, tag ASC
             LIMIT $2`,
            [`${normalizedPrefix}%`, limit]
        );

        return result.rows.map(row => ({
            id: row.id,
            tag: row.tag,
            usageCount: parseInt(row.usage_count)
        }));
    }

    /**
     * Get hashtag statistics
     * @param {string} tag - Hashtag
     * @returns {Promise<Object|null>} Hashtag stats or null if not found
     */
    async getHashtagStats(tag) {
        const normalizedTag = tag.toLowerCase().replace(/^#/, '');

        const result = await query(
            `SELECT 
                h.id,
                h.tag,
                h.usage_count,
                h.created_at,
                COUNT(DISTINCT ph.post_id) FILTER (WHERE ph.created_at > NOW() - INTERVAL '24 hours') as posts_24h,
                COUNT(DISTINCT ph.post_id) FILTER (WHERE ph.created_at > NOW() - INTERVAL '7 days') as posts_7d
             FROM hashtags h
             LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
             WHERE h.tag = $1
             GROUP BY h.id, h.tag, h.usage_count, h.created_at`,
            [normalizedTag]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            tag: row.tag,
            totalUsage: parseInt(row.usage_count),
            posts24h: parseInt(row.posts_24h),
            posts7d: parseInt(row.posts_7d),
            createdAt: row.created_at
        };
    }
}

module.exports = new HashtagService();
