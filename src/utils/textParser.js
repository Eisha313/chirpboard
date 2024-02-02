/**
 * Text parsing utilities for ChirpBoard
 */

const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Parse post content and extract entities
 * @param {string} content - Raw post content
 * @returns {Object} Parsed entities
 */
function parseContent(content) {
    if (!content || typeof content !== 'string') {
        return {
            hashtags: [],
            mentions: [],
            urls: [],
            plainText: ''
        };
    }

    const hashtags = [];
    const mentions = [];
    const urls = [];

    let match;

    // Extract hashtags
    while ((match = HASHTAG_REGEX.exec(content)) !== null) {
        const tag = match[1].toLowerCase();
        if (tag.length >= 2 && tag.length <= 100 && !hashtags.includes(tag)) {
            hashtags.push(tag);
        }
    }

    // Extract mentions
    while ((match = MENTION_REGEX.exec(content)) !== null) {
        const username = match[1].toLowerCase();
        if (username.length >= 2 && username.length <= 50 && !mentions.includes(username)) {
            mentions.push(username);
        }
    }

    // Extract URLs
    while ((match = URL_REGEX.exec(content)) !== null) {
        const url = match[1];
        if (!urls.includes(url)) {
            urls.push(url);
        }
    }

    // Get plain text (without entities)
    const plainText = content
        .replace(HASHTAG_REGEX, '')
        .replace(MENTION_REGEX, '')
        .replace(URL_REGEX, '')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        hashtags,
        mentions,
        urls,
        plainText
    };
}

/**
 * Highlight entities in content for display
 * @param {string} content - Raw content
 * @returns {Object[]} Array of content segments with type info
 */
function highlightEntities(content) {
    if (!content || typeof content !== 'string') {
        return [];
    }

    const segments = [];
    let lastIndex = 0;

    // Combined regex for all entity types
    const combinedRegex = /(#[a-zA-Z0-9_]+)|(@[a-zA-Z0-9_]+)|(https?:\/\/[^\s]+)/g;

    let match;
    while ((match = combinedRegex.exec(content)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: content.slice(lastIndex, match.index)
            });
        }

        // Determine entity type
        const value = match[0];
        let type = 'text';

        if (value.startsWith('#')) {
            type = 'hashtag';
        } else if (value.startsWith('@')) {
            type = 'mention';
        } else if (value.startsWith('http')) {
            type = 'url';
        }

        segments.push({ type, value });
        lastIndex = match.index + value.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        segments.push({
            type: 'text',
            value: content.slice(lastIndex)
        });
    }

    return segments;
}

/**
 * Validate post content
 * @param {string} content - Post content
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateContent(content, options = {}) {
    const {
        maxLength = 280,
        minLength = 1,
        maxHashtags = 10,
        maxMentions = 10,
        maxUrls = 5
    } = options;

    const errors = [];

    if (!content || typeof content !== 'string') {
        return {
            valid: false,
            errors: ['Content is required']
        };
    }

    const trimmed = content.trim();

    if (trimmed.length < minLength) {
        errors.push(`Content must be at least ${minLength} character(s)`);
    }

    if (trimmed.length > maxLength) {
        errors.push(`Content must not exceed ${maxLength} characters`);
    }

    const parsed = parseContent(trimmed);

    if (parsed.hashtags.length > maxHashtags) {
        errors.push(`Maximum ${maxHashtags} hashtags allowed`);
    }

    if (parsed.mentions.length > maxMentions) {
        errors.push(`Maximum ${maxMentions} mentions allowed`);
    }

    if (parsed.urls.length > maxUrls) {
        errors.push(`Maximum ${maxUrls} URLs allowed`);
    }

    return {
        valid: errors.length === 0,
        errors,
        parsed,
        characterCount: trimmed.length,
        remainingCharacters: maxLength - trimmed.length
    };
}

module.exports = {
    parseContent,
    highlightEntities,
    validateContent,
    HASHTAG_REGEX,
    MENTION_REGEX,
    URL_REGEX
};
