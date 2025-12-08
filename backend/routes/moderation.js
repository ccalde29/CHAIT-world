// ============================================================================
// Moderation Routes
// Handles admin moderation operations (queue, reports, approve/reject)
// backend/routes/moderation.js
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('../middleware/adminAuth');

// Lazy-load Supabase client to ensure environment variables are loaded
let supabase = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Moderation] Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

// ============================================================================
// MODERATION QUEUE
// ============================================================================

/**
 * GET /api/moderation/queue
 * Get all characters pending moderation
 * Returns community characters with moderation_status = 'pending' or 'rejected'
 * Admin only
 */
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { data: queue, error } = await getSupabase()
      .from('community_characters')
      .select('*')
      .in('moderation_status', ['pending', 'rejected'])
      .order('published_at', { ascending: false });

    if (error) {
      console.error('[Moderation] Error fetching queue:', error);
      return res.status(500).json({ error: 'Failed to fetch moderation queue' });
    }

    // Add report count for each character (if needed later)
    // For now, just return the characters
    const queueWithReportCount = queue.map(char => ({
      ...char,
      report_count: 0 // TODO: Add actual report count if character_reports table exists
    }));

    res.json({
      queue: queueWithReportCount || [],
      total: queueWithReportCount?.length || 0
    });

  } catch (error) {
    console.error('[Moderation] Error in /queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics for community characters
 * Admin only
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get counts for different statuses from community_characters
    const { count: pendingCount } = await getSupabase()
      .from('community_characters')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'pending');

    const { count: approvedCount } = await getSupabase()
      .from('community_characters')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'approved');

    const { count: rejectedCount } = await getSupabase()
      .from('community_characters')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'rejected');

    // Character reports count (table may not exist yet)
    let unresolvedReports = 0;
    try {
      const { count } = await getSupabase()
        .from('character_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      unresolvedReports = count || 0;
    } catch (error) {
      // character_reports table doesn't exist yet
      console.log('[Moderation] character_reports table not found (expected if not created yet)');
    }

    res.json({
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      rejected: rejectedCount || 0,
      unresolvedReports
    });

  } catch (error) {
    console.error('[Moderation] Error in /stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CHARACTER REPORTS
// ============================================================================

/**
 * GET /api/moderation/reports
 * Get all character reports
 * Optional query params:
 * - status: 'pending', 'reviewed', 'actioned', 'dismissed'
 * - characterId: filter by specific character
 * Admin only
 */
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const { status, characterId } = req.query;

    let query = getSupabase()
      .from('character_reports')
      .select(`
        *,
        characters:character_id (
          id,
          name,
          user_id,
          moderation_status
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (characterId) {
      query = query.eq('character_id', characterId);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('[Moderation] Error fetching reports:', error);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }

    res.json({
      reports: reports || [],
      total: reports?.length || 0
    });

  } catch (error) {
    console.error('[Moderation] Error in /reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/moderation/reports/:reportId/resolve
 * Resolve a character report
 * Body: { action: 'dismiss' | 'unpublish', notes?: string }
 * Admin only
 */
router.post('/reports/:reportId/resolve', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { reportId } = req.params;
    const { action, notes } = req.body;

    if (!action || !['dismiss', 'unpublish'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "dismiss" or "unpublish"' });
    }

    // Get the report to find the character
    const { data: report, error: fetchError } = await getSupabase()
      .from('character_reports')
      .select('*, characters:character_id (id, name, user_id)')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // If action is unpublish, unpublish the character
    if (action === 'unpublish') {
      const { error: unpublishError } = await getSupabase()
        .from('characters')
        .update({
          is_public: false,
          moderation_status: 'rejected'
        })
        .eq('id', report.character_id);

      if (unpublishError) {
        console.error('[Moderation] Error unpublishing character:', unpublishError);
        return res.status(500).json({ error: 'Failed to unpublish character' });
      }
    }

    // Update the report status
    const { data: updatedReport, error: updateError } = await getSupabase()
      .from('character_reports')
      .update({
        status: action === 'unpublish' ? 'actioned' : 'dismissed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        action_taken: notes || action
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      console.error('[Moderation] Error updating report:', updateError);
      return res.status(500).json({ error: 'Failed to update report' });
    }

    console.log(`[Moderation] Report ${reportId} resolved with action: ${action}`);
    res.json({
      message: 'Report resolved successfully',
      report: updatedReport,
      action
    });

  } catch (error) {
    console.error('[Moderation] Error in /reports/:reportId/resolve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// APPROVE/REJECT CHARACTERS
// ============================================================================

/**
 * POST /api/moderation/approve/:characterId
 * Approve a community character for publication
 * Admin only
 */
router.post('/approve/:characterId', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;

    // Update community character moderation status to approved
    const { data: character, error } = await getSupabase()
      .from('community_characters')
      .update({
        moderation_status: 'approved'
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) {
      console.error('[Moderation] Error approving character:', error);
      return res.status(500).json({ error: 'Failed to approve character' });
    }

    if (!character) {
      return res.status(404).json({ error: 'Community character not found' });
    }

    console.log(`[Moderation] Community character ${characterId} approved by admin ${userId}`);
    res.json({
      message: 'Character approved successfully',
      character
    });

  } catch (error) {
    console.error('[Moderation] Error in /approve/:characterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/moderation/reject/:characterId
 * Reject a community character (sets to rejected status)
 * Body: { reason?: string }
 * Admin only
 */
router.post('/reject/:characterId', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;
    const { reason } = req.body;

    // Update community character: set to rejected status
    const { data: character, error } = await getSupabase()
      .from('community_characters')
      .update({
        moderation_status: 'rejected'
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) {
      console.error('[Moderation] Error rejecting character:', error);
      return res.status(500).json({ error: 'Failed to reject character' });
    }

    if (!character) {
      return res.status(404).json({ error: 'Community character not found' });
    }

    // Log the rejection reason if provided
    if (reason) {
      console.log(`[Moderation] Community character ${characterId} rejected by admin ${userId}. Reason: ${reason}`);
    } else {
      console.log(`[Moderation] Community character ${characterId} rejected by admin ${userId}`);
    }

    res.json({
      message: 'Character rejected',
      character,
      reason: reason || 'No reason provided'
    });

  } catch (error) {
    console.error('[Moderation] Error in /reject/:characterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/moderation/bulk-approve
 * Approve multiple community characters at once
 * Body: { characterIds: string[] }
 * Admin only
 */
router.post('/bulk-approve', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterIds } = req.body;

    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return res.status(400).json({ error: 'characterIds must be a non-empty array' });
    }

    const { data: characters, error } = await getSupabase()
      .from('community_characters')
      .update({ moderation_status: 'approved' })
      .in('id', characterIds)
      .select();

    if (error) {
      console.error('[Moderation] Error bulk approving:', error);
      return res.status(500).json({ error: 'Failed to bulk approve characters' });
    }

    console.log(`[Moderation] ${characters.length} community characters bulk approved by admin ${userId}`);
    res.json({
      message: `${characters.length} characters approved successfully`,
      count: characters.length
    });

  } catch (error) {
    console.error('[Moderation] Error in /bulk-approve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
