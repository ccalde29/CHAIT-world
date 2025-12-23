const { createClient } = require('@supabase/supabase-js');
const DatabaseService = require('../services/database');

// Lazy-load Supabase client to ensure environment variables are loaded
let supabase = null;
let db = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AdminAuth] Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

function getDB() {
  if (!db) {
    db = new DatabaseService();
  }
  return db;
}

/**
 * Middleware to check if user has admin privileges
 * Uses the is_admin flag from local user_settings_local table
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireAdmin(req, res, next) {
  try {
    const userId = req.headers['user-id'];

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not provided'
      });
    }

    // Check if user has admin privileges from local database
    const userSettings = await getDB().getUserSettings(userId);

    if (!userSettings || !userSettings.isAdmin) {
      console.warn(`[AdminAuth] Unauthorized admin access attempt by user: ${userId}`, { 
        settingsFound: !!userSettings,
        isAdmin: userSettings?.isAdmin 
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required for this action'
      });
    }

    // User is admin, proceed to next middleware
    console.log(`[AdminAuth] Admin access granted to user: ${userId}`);
    next();

  } catch (error) {
    console.error('[AdminAuth] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during authorization'
    });
  }
}

/**
 * Middleware to optionally check admin status and attach to request
 * Does not block non-admin users, just adds is_admin flag to req object
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function checkAdmin(req, res, next) {
  try {
    const userId = req.headers['user-id'];

    if (!userId) {
      req.isAdmin = false;
      return next();
    }

    // Check if user has admin privileges from local database
    const userSettings = await getDB().getUserSettings(userId);

    req.isAdmin = userSettings?.isAdmin || false;
    next();

  } catch (error) {
    console.error('[AdminAuth] Error in checkAdmin:', error);
    req.isAdmin = false;
    next();
  }
}

module.exports = {
  requireAdmin,
  checkAdmin
};
