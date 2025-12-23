// backend/middleware/offlineMode.js
// Middleware to handle offline mode gracefully

/**
 * Middleware to check if operation requires community/online features
 * Allows local operations to proceed even when offline
 */
function requireOnline(req, res, next) {
    // Check if we're in local mode and Supabase is unavailable
    if (req.app.locals.db && req.app.locals.db.isLocalMode && req.app.locals.db.isLocalMode()) {
        if (!req.app.locals.db.isCommunityAvailable || !req.app.locals.db.isCommunityAvailable()) {
            return res.status(503).json({
                error: 'This feature requires internet connection',
                offline: true,
                message: 'Community features are currently unavailable. Please check your internet connection.'
            });
        }
    }
    next();
}

/**
 * Middleware to mark endpoints as offline-capable
 * These endpoints work without Supabase
 */
function offlineCapable(req, res, next) {
    req.offlineCapable = true;
    next();
}

/**
 * Global error handler for database connection issues
 */
function handleDatabaseError(error, req, res, next) {
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('fetch failed')) {
        // If in local mode, inform about offline status
        if (req.app.locals.db && req.app.locals.db.isLocalMode && req.app.locals.db.isLocalMode()) {
            return res.status(503).json({
                error: 'Connection failed',
                offline: true,
                message: 'Unable to connect to online services. Local features remain available.',
                localMode: true
            });
        }
    }
    
    // Pass to next error handler
    next(error);
}

module.exports = {
    requireOnline,
    offlineCapable,
    handleDatabaseError
};
