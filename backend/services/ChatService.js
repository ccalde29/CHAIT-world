// backend/services/ChatService.js
// Handles chat session and message operations

class ChatService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Create a new chat session
     */
    async createChatSession(userId, sessionData) {
        try {
            console.log('📝 Creating chat session for user:', userId);

            const { data, error } = await this.supabase
            .from('chat_sessions')
            .insert({
                user_id: userId,
                scenario_id: sessionData.scenario,
                active_characters: sessionData.activeCharacters || [],
                title: sessionData.title || `Chat - ${new Date().toLocaleDateString()}`,
                group_mode: sessionData.groupMode || 'natural',
                message_count: 0
            })
            .select()
            .single();

            if (error) {
                console.error('❌ Error creating chat session:', error);
                throw error;
            }

            console.log('✅ Chat session created:', data.id);
            return data;

        } catch (error) {
            console.error('Database error creating chat session:', error);
            throw error;
        }
    }

    /**
     * Save a chat message
     */
    async saveChatMessage(sessionId, messageData) {
        try {
            console.log('💬 Saving message to session:', sessionId);

            const { data, error } = await this.supabase
            .from('messages')
            .insert({
                session_id: sessionId,
                type: messageData.type,
                content: messageData.content,
                character_id: messageData.character || null,
                timestamp: new Date().toISOString()
            })
            .select()
            .single();

            if (error) {
                console.error('❌ Error saving message:', error);
                throw error;
            }

            // Update session message count and last activity
            const { data: session } = await this.supabase
              .from('chat_sessions')
              .select('message_count')
              .eq('id', sessionId)
              .single();

            // Then increment it
            await this.supabase
              .from('chat_sessions')
              .update({
                message_count: (session?.message_count || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);

            console.log('✅ Message saved successfully');
            return data;

        } catch (error) {
            console.error('Database error saving chat message:', error);
            // Don't throw - chat should continue even if message save fails
            return null;
        }
    }

    /**
     * Get chat session with messages
     */
    async getChatSession(userId, sessionId) {
        try {
            const { data: session, error: sessionError } = await this.supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

            if (sessionError) throw sessionError;
            if (!session) return null;

            const { data: messages, error: messagesError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

            if (messagesError) throw messagesError;

            return {
                ...session,
                messages: messages || []
            };

        } catch (error) {
            console.error('Database error getting chat session:', error);
            throw error;
        }
    }

    /**
     * Get chat history for user
     */
    async getChatHistory(userId, limit = 20) {
        try {
            const { data, error } = await this.supabase
            .from('chat_sessions')
            .select(`
                    *,
                    messages (
                        id,
                        content,
                        type,
                        character_id,
                        timestamp
                    )
                `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(limit);

            if (error) throw error;

            // Format sessions with latest message
            const formattedSessions = data.map(session => ({
                ...session,
                latest_message: session.messages?.[session.messages.length - 1] || null,
                messages: undefined // Remove full messages array from list view
            }));

            return formattedSessions;

        } catch (error) {
            console.error('Database error getting chat history:', error);
            throw error;
        }
    }

    /**
     * Update chat session activity timestamp
     */
    async updateChatSessionActivity(sessionId) {
        try {
            const { error } = await this.supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('Database error updating session activity:', error);
            return false;
        }
    }

    /**
     * Update chat session
     */
    async updateChatSession(userId, sessionId, updates) {
        try {
            const { data, error } = await this.supabase
            .from('chat_sessions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .eq('user_id', userId)
            .select()
            .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Database error updating chat session:', error);
            throw error;
        }
    }

    /**
     * Delete chat session
     */
    async deleteChatSession(userId, sessionId) {
        try {
            // Delete messages first (cascade should handle this, but being explicit)
            await this.supabase
            .from('messages')
            .delete()
            .eq('session_id', sessionId);

            // Delete session
            const { error } = await this.supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', userId);

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('Database error deleting chat session:', error);
            throw error;
        }
    }
}

module.exports = ChatService;
