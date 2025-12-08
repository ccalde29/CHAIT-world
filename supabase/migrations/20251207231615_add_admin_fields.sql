-- Add admin fields to user_settings table
-- Sprint 1: Database & Backend Foundation

-- Add is_admin field (boolean, defaults to false)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Add admin_system_prompt field (text, optional override for all character prompts)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS admin_system_prompt TEXT DEFAULT NULL;

-- Add auto_approve_characters field (boolean, defaults to false)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS auto_approve_characters BOOLEAN DEFAULT false NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.user_settings.is_admin IS 'Admin flag - manually set in Supabase for admin users';
COMMENT ON COLUMN public.user_settings.admin_system_prompt IS 'Optional system prompt that prepends to all character prompts when set';
COMMENT ON COLUMN public.user_settings.auto_approve_characters IS 'When true, published characters auto-approve; when false, they require moderation';

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_user_settings_is_admin ON public.user_settings(is_admin) WHERE is_admin = true;
