// ============================================================================
// Admin API Keys Service
// Manages API keys for admin users to power token models
// backend/services/AdminKeysService.js
// ============================================================================

const crypto = require('crypto');

class AdminKeysService {
  /**
   * Get admin API keys for a user (admin only)
   * @param {Object} db - Database instance
   * @param {string} userId - Admin user ID
   * @returns {Object} - API keys object
   */
  static getAdminKeys(db, userId) {
    try {
      const keys = db.localDb.get(
        'SELECT * FROM admin_api_keys WHERE user_id = ?',
        [userId]
      );

      if (!keys) {
        // Return empty structure if no keys exist
        return {
          openai_key: null,
          anthropic_key: null,
          google_key: null,
          openrouter_key: null
        };
      }

      // Decrypt keys before returning
      return {
        openai_key: keys.openai_key ? this.decrypt(keys.openai_key) : null,
        anthropic_key: keys.anthropic_key ? this.decrypt(keys.anthropic_key) : null,
        google_key: keys.google_key ? this.decrypt(keys.google_key) : null,
        openrouter_key: keys.openrouter_key ? this.decrypt(keys.openrouter_key) : null
      };
    } catch (error) {
      console.error('[AdminKeys] Error getting admin keys:', error);
      throw error;
    }
  }

  /**
   * Save or update admin API keys
   * @param {Object} db - Database instance
   * @param {string} userId - Admin user ID
   * @param {Object} keys - API keys to save
   * @returns {boolean} - Success status
   */
  static saveAdminKeys(db, userId, keys) {
    try {
      const existing = db.localDb.get(
        'SELECT user_id FROM admin_api_keys WHERE user_id = ?',
        [userId]
      );

      const encryptedKeys = {
        openai_key: keys.openai_key ? this.encrypt(keys.openai_key) : null,
        anthropic_key: keys.anthropic_key ? this.encrypt(keys.anthropic_key) : null,
        google_key: keys.google_key ? this.encrypt(keys.google_key) : null,
        openrouter_key: keys.openrouter_key ? this.encrypt(keys.openrouter_key) : null
      };

      if (existing) {
        // Update existing keys
        db.localDb.run(
          `UPDATE admin_api_keys SET
            openai_key = COALESCE(?, openai_key),
            anthropic_key = COALESCE(?, anthropic_key),
            google_key = COALESCE(?, google_key),
            openrouter_key = COALESCE(?, openrouter_key),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`,
          [
            encryptedKeys.openai_key,
            encryptedKeys.anthropic_key,
            encryptedKeys.google_key,
            encryptedKeys.openrouter_key,
            userId
          ]
        );
      } else {
        // Insert new keys
        db.localDb.run(
          `INSERT INTO admin_api_keys (
            user_id, openai_key, anthropic_key, google_key, openrouter_key
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            encryptedKeys.openai_key,
            encryptedKeys.anthropic_key,
            encryptedKeys.google_key,
            encryptedKeys.openrouter_key
          ]
        );
      }

      console.log(`[AdminKeys] Saved admin API keys for user ${userId}`);
      return true;
    } catch (error) {
      console.error('[AdminKeys] Error saving admin keys:', error);
      throw error;
    }
  }

  /**
   * Delete admin API keys
   * @param {Object} db - Database instance
   * @param {string} userId - Admin user ID
   * @returns {boolean} - Success status
   */
  static deleteAdminKeys(db, userId) {
    try {
      db.localDb.run('DELETE FROM admin_api_keys WHERE user_id = ?', [userId]);
      console.log(`[AdminKeys] Deleted admin API keys for user ${userId}`);
      return true;
    } catch (error) {
      console.error('[AdminKeys] Error deleting admin keys:', error);
      throw error;
    }
  }

  /**
   * Encrypt an API key
   * @param {string} text - Plain text key
   * @returns {string} - Encrypted key
   */
  static encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-please-change-in-production';
    const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt an API key
   * @param {string} text - Encrypted key
   * @returns {string} - Plain text key
   */
  static decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-please-change-in-production';
    const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');
    
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = AdminKeysService;
