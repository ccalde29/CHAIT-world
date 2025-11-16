// backend/routes/chat-sessions.js
// Routes for chat session management

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    /**
     * Create a new chat session
     * POST /api/chat/sessions
     */
    router.post('/sessions', async (req, res) => {
        try {
            const { scenario, activeCharacters, title } = req.body;

            const session = await db.createChatSession(req.userId, {
                scenario,
                activeCharacters,
                title: title || `Chat in ${scenario}`,
                groupMode: 'natural'
            });

            res.status(201).json(session);
        } catch (error) {
            console.error('Error creating chat session:', error);
            res.status(500).json({ error: 'Failed to create chat session' });
        }
    });

    /**
     * Get all chat sessions for user
     * GET /api/chat/sessions
     */
    router.get('/sessions', async (req, res) => {
        try {
            const sessions = await db.getChatHistory(req.userId, 20);
            res.json({ sessions });
        } catch (error) {
            console.error('Error fetching chat sessions:', error);
            res.status(500).json({ error: 'Failed to fetch chat sessions' });
        }
    });

    /**
     * Get a specific chat session
     * GET /api/chat/sessions/:sessionId
     */
    router.get('/sessions/:sessionId', async (req, res) => {
        try {
            const session = await db.getChatSession(req.userId, req.params.sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Chat session not found' });
            }
            res.json(session);
        } catch (error) {
            console.error('Error fetching chat session:', error);
            res.status(500).json({ error: 'Failed to fetch chat session' });
        }
    });

    /**
     * Update chat session
     * PUT /api/chat/sessions/:sessionId
     */
    router.put('/sessions/:sessionId', async (req, res) => {
        try {
            const { title } = req.body;
            const session = await db.updateChatSession(req.userId, req.params.sessionId, { title });
            res.json(session);
        } catch (error) {
            console.error('Error updating chat session:', error);
            res.status(500).json({ error: 'Failed to update chat session' });
        }
    });

    /**
     * Delete chat session
     * DELETE /api/chat/sessions/:sessionId
     */
    router.delete('/sessions/:sessionId', async (req, res) => {
        try {
            await db.deleteChatSession(req.userId, req.params.sessionId);
            res.json({ message: 'Chat session deleted successfully' });
        } catch (error) {
            console.error('Error deleting chat session:', error);
            res.status(500).json({ error: 'Failed to delete chat session' });
        }
    });

    return router;
};
