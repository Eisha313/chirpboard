const { query, transaction, withRetry } = require('../utils/dbHelpers');
const config = require('../config');

class LeaderboardService {
    constructor() {
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.cache = {
            topLiked: { data: null, timestamp: 0 },
            mostActive: { data: null, timestamp: 0 },
            trending: { data: null, timestamp: 0 }
        };
    }

    isCacheValid(cacheKey) {
        const cache = this.cache[cacheKey];
        return cache.data && (Date.now() - cache.timestamp) < this.cacheTimeout;
    }

    setCache(cacheKey, data) {
        this.cache[cacheKey] = {
            data,
            timestamp: Date.now()
        };
    }

    async getTopLikedUsers(limit = 10, offset = 0) {
        if (this.isCacheValid('topLiked') && offset === 0) {
            return this.cache.topLiked.data.slice(0, limit);
        }

        const sql = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                COUNT(DISTINCT p.id) as post_count,
                COALESCE(SUM(p.like_count), 0) as total_likes,
                COALESCE(AVG(p.like_count), 0) as avg_likes_per_post
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            WHERE u.is_active = true
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio
            HAVING COUNT(p.id) > 0
            ORDER BY total_likes DESC, avg_likes_per_post DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await withRetry(() => query(sql, [limit, offset]));
        const users = result.rows.map(row => ({
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            bio: row.bio,
            stats: {
                postCount: parseInt(row.post_count),
                totalLikes: parseInt(row.total_likes),
                avgLikesPerPost: parseFloat(row.avg_likes_per_post).toFixed(2)
            }
        }));

        if (offset === 0) {
            this.setCache('topLiked', users);
        }

        return users;
    }

    async getMostActiveUsers(limit = 10, offset = 0, timeframeDays = 30) {
        if (this.isCacheValid('mostActive') && offset === 0) {
            return this.cache.mostActive.data.slice(0, limit);
        }

        const sql = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                COUNT(DISTINCT p.id) as posts_count,
                COUNT(DISTINCT r.id) as reactions_count,
                (COUNT(DISTINCT p.id) * 2 + COUNT(DISTINCT r.id)) as activity_score
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id AND p.created_at > NOW() - INTERVAL '${timeframeDays} days'
            LEFT JOIN reactions r ON u.id = r.user_id AND r.created_at > NOW() - INTERVAL '${timeframeDays} days'
            WHERE u.is_active = true
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio
            HAVING (COUNT(DISTINCT p.id) + COUNT(DISTINCT r.id)) > 0
            ORDER BY activity_score DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await withRetry(() => query(sql, [limit, offset]));
        const users = result.rows.map(row => ({
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            bio: row.bio,
            stats: {
                postsCount: parseInt(row.posts_count),
                reactionsCount: parseInt(row.reactions_count),
                activityScore: parseInt(row.activity_score)
            }
        }));

        if (offset === 0) {
            this.setCache('mostActive', users);
        }

        return users;
    }

    async getTrendingPosts(limit = 10, offset = 0, hoursAgo = 24) {
        if (this.isCacheValid('trending') && offset === 0) {
            return this.cache.trending.data.slice(0, limit);
        }

        // Trending algorithm: (likes * 2 + views) / (hours_since_post + 2)^1.5
        const sql = `
            SELECT 
                p.id,
                p.content,
                p.user_id,
                p.like_count,
                p.view_count,
                p.created_at,
                u.username,
                u.display_name,
                u.avatar_url,
                (
                    (COALESCE(p.like_count, 0) * 2 + COALESCE(p.view_count, 0)) /
                    POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5)
                ) as trending_score
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.created_at > NOW() - INTERVAL '${hoursAgo} hours'
                AND u.is_active = true
            ORDER BY trending_score DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await withRetry(() => query(sql, [limit, offset]));
        const posts = result.rows.map(row => ({
            id: row.id,
            content: row.content,
            likeCount: parseInt(row.like_count) || 0,
            viewCount: parseInt(row.view_count) || 0,
            createdAt: row.created_at,
            trendingScore: parseFloat(row.trending_score).toFixed(4),
            author: {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name,
                avatarUrl: row.avatar_url
            }
        }));

        if (offset === 0) {
            this.setCache('trending', posts);
        }

        return posts;
    }

    async getCommunityStats() {
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                (SELECT COUNT(*) FROM posts) as total_posts,
                (SELECT COUNT(*) FROM reactions) as total_reactions,
                (SELECT COUNT(*) FROM follows) as total_follows,
                (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '24 hours') as posts_today,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week
        `;

        const result = await query(sql);
        const stats = result.rows[0];

        return {
            totalUsers: parseInt(stats.total_users),
            totalPosts: parseInt(stats.total_posts),
            totalReactions: parseInt(stats.total_reactions),
            totalFollows: parseInt(stats.total_follows),
            postsToday: parseInt(stats.posts_today),
            newUsersThisWeek: parseInt(stats.new_users_week)
        };
    }

    async getUserRank(userId) {
        const likesRankSql = `
            SELECT rank FROM (
                SELECT 
                    u.id,
                    RANK() OVER (ORDER BY COALESCE(SUM(p.like_count), 0) DESC) as rank
                FROM users u
                LEFT JOIN posts p ON u.id = p.user_id
                WHERE u.is_active = true
                GROUP BY u.id
            ) rankings
            WHERE id = $1
        `;

        const activityRankSql = `
            SELECT rank FROM (
                SELECT 
                    u.id,
                    RANK() OVER (ORDER BY (COUNT(DISTINCT p.id) * 2 + COUNT(DISTINCT r.id)) DESC) as rank
                FROM users u
                LEFT JOIN posts p ON u.id = p.user_id AND p.created_at > NOW() - INTERVAL '30 days'
                LEFT JOIN reactions r ON u.id = r.user_id AND r.created_at > NOW() - INTERVAL '30 days'
                WHERE u.is_active = true
                GROUP BY u.id
            ) rankings
            WHERE id = $1
        `;

        const [likesResult, activityResult] = await Promise.all([
            query(likesRankSql, [userId]),
            query(activityRankSql, [userId])
        ]);

        return {
            userId,
            likesRank: likesResult.rows[0]?.rank || null,
            activityRank: activityResult.rows[0]?.rank || null
        };
    }

    clearCache() {
        this.cache = {
            topLiked: { data: null, timestamp: 0 },
            mostActive: { data: null, timestamp: 0 },
            trending: { data: null, timestamp: 0 }
        };
    }
}

module.exports = new LeaderboardService();
