// ============================================================================
// Admin API Keys Routes
// Manage admin API credentials for token models
// backend/routes/admin-keys.js
// ============================================================================

const express = require('express');
const supabaseService = require('../services/SupabaseAdminTokenService');
const { requireAdmin } = require('../middleware/adminAuth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * GET /api/admin-keys
   * Get admin API keys (admin only)
   */
  router.get('/', requireAdmin, async (req, res) => {
    try {
      const userId = req.headers['user-id'];
      const keysData = await supabaseService.getAdminApiKeys(userId);
      
      const keys = {
        openai: keysData?.openai_key,
        anthropic: keysData?.anthropic_key,
        google: keysData?.google_key,
        openrouter: keysData?.openrouter_key
      };

      // Mask keys for security (show first 7 and last 4 chars)
      const maskedKeys = {};
      for (const [provider, key] of Object.entries(keys)) {
        if (key) {
          maskedKeys[provider] = key.substring(0, 7) + '...' + key.substring(key.length - 4);
        } else {
          maskedKeys[provider] = null;
        }
      }

      res.json({ keys: maskedKeys, hasKeys: keys });
    } catch (error) {
      console.error('[AdminKeys] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/admin-keys
   * Save or update admin API keys (admin only)
   */
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const userId = req.headers['user-id'];
      const { openai_key, anthropic_key, google_key, openrouter_key } = req.body;

      // Validate at least one key is provided
      if (!openai_key && !anthropic_key && !google_key && !openrouter_key) {
        return res.status(400).json({ error: 'At least one API key is required' });
      }

      await supabaseService.saveAdminApiKeys(userId, {
        openai: openai_key,
        anthropic: anthropic_key,
        google: google_key,
        openrouter: openrouter_key
      });

      res.json({ message: 'Admin API keys saved successfully' });
    } catch (error) {
      console.error('[AdminKeys] Error:', error);
      res.status(500).json({ error: 'Failed to save admin API keys' });
    }
  });

  /**
   * DELETE /api/admin-keys
   * Delete admin API keys (admin only)
   */
  router.delete('/', requireAdmin, async (req, res) => {
    try {
      const userId = req.headers['user-id'];
      await supabaseService.deleteAdminApiKeys(userId);
      res.json({ message: 'Admin API keys deleted successfully' });
    } catch (error) {
      console.error('[AdminKeys] Error:', error);
      res.status(500).json({ error: 'Failed to delete admin API keys' });
    }
  });

  return router;
};
