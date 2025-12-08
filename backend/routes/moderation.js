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
 * Uses the moderation_queue view which includes:
 * - Characters with moderation_status = 'pending' or 'rejected'
 * - Characters where is_public = true
 * - Report count for each character
 * Admin only
 */
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { data: queue, error } = await getSupabase()
      .from('moderation_queue')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('[Moderation] Error fetching queue:', error);
      return res.status(500).json({ error: 'Failed to fetch moderation queue' });
    }

    res.json({
      queue: queue || [],
      total: queue?.length || 0
    });

  } catch (error) {
    console.error('[Moderation] Error in /queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics
 * Admin only
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get counts for different statuses
    const { data: pendingCount } = await getSupabase()
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('moderation_status', 'pending');

    const { data: approvedCount } = await supabase
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('moderation_status', 'approved');

    const { data: rejectedCount } = await supabase
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('moderation_status', 'rejected');

    const { data: unresolvedReports } = await supabase
      .from('character_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      rejected: rejectedCount || 0,
      unresolvedReports: unresolvedReports || 0
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
 * Approve a character for publication
 * Admin only
 */
router.post('/approve/:characterId', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;

    // Update character moderation status to approved
    const { data: character, error } = await getSupabase()
      .from('characters')
      .update({
        moderation_status: 'approved'
      })
      .eq('id', characterId)
      .eq('is_public', true) // Only approve public characters
      .select()
      .single();

    if (error) {
      console.error('[Moderation] Error approving character:', error);
      return res.status(500).json({ error: 'Failed to approve character' });
    }

    if (!character) {
      return res.status(404).json({ error: 'Character not found or not public' });
    }

    console.log(`[Moderation] Character ${characterId} approved by admin ${userId}`);
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
 * Reject a character and unpublish it
 * Body: { reason?: string }
 * Admin only
 */
router.post('/reject/:characterId', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;
    const { reason } = req.body;

    // Update character: set to rejected and unpublish
    const { data: character, error } = await getSupabase()
      .from('characters')
      .update({
        moderation_status: 'rejected',
        is_public: false
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) {
      console.error('[Moderation] Error rejecting character:', error);
      return res.status(500).json({ error: 'Failed to reject character' });
    }

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Log the rejection reason if provided
    if (reason) {
      console.log(`[Moderation] Character ${characterId} rejected by admin ${userId}. Reason: ${reason}`);
    } else {
      console.log(`[Moderation] Character ${characterId} rejected by admin ${userId}`);
    }

    res.json({
      message: 'Character rejected and unpublished',
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
 * Approve multiple characters at once
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
      .from('characters')
      .update({ moderation_status: 'approved' })
      .in('id', characterIds)
      .eq('is_public', true)
      .select();

    if (error) {
      console.error('[Moderation] Error bulk approving:', error);
      return res.status(500).json({ error: 'Failed to bulk approve characters' });
    }

    console.log(`[Moderation] ${characters.length} characters bulk approved by admin ${userId}`);
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
