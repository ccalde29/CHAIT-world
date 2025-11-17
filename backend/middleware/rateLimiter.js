const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../constants/defaults');

/**
 * Rate limiter for AI API calls to prevent abuse and control costs
 */
const aiCallLimiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.AI_CALLS_PER_MINUTE,
  message: {
    error: 'Too many AI requests. Please slow down and try again in a minute.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use user ID as key for per-user rate limiting
  keyGenerator: (req) => {
    // Use user-id header if available, otherwise fall back to standardKeyGenerator behavior
    return req.headers['user-id'];
  }
});

/**
 * Rate limiter for general API calls
 * More permissive than AI limiter
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.GENERAL_REQUESTS_PER_MINUTE,
  message: {
    error: 'Too many requests. Please try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['user-id'];
  }
});

/**
 * Stricter rate limiter for expensive operations (image uploads, etc.)
 */
const uploadLimiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.UPLOADS_PER_MINUTE,
  message: {
    error: 'Too many uploads. Please wait a minute before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['user-id'];
  }
});

module.exports = {
  aiCallLimiter,
  generalLimiter,
  uploadLimiter
};
