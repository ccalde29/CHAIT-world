-- Create function to increment message count for a chat session
CREATE OR REPLACE FUNCTION increment_message_count(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE chat_sessions
    SET
        message_count = COALESCE(message_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_session_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION increment_message_count IS 'Increments the message count for a chat session and updates the timestamp';
