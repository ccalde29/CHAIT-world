-- Drop the old views
DROP VIEW IF EXISTS public.community_scenes;
DROP VIEW IF EXISTS public.community_characters;

-- Create community_characters table (separate from user characters)
CREATE TABLE IF NOT EXISTS public.community_characters (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    original_character_id uuid NOT NULL, -- Reference to the original character
    creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    name character varying(50) NOT NULL,
    age character varying(50),
    sex character varying(50),
    personality text,
    appearance text,
    background text,
    avatar text,
    color character varying(100),
    chat_examples text,
    tags text[],
    temperature numeric DEFAULT 0.7,
    max_tokens integer DEFAULT 150,
    context_window integer DEFAULT 10,
    memory_enabled boolean DEFAULT false,
    avatar_image_url text,
    avatar_image_filename text,
    uses_custom_image boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    hidden_fields jsonb DEFAULT '[]'::jsonb,
    published_at timestamp without time zone DEFAULT now(),
    view_count integer DEFAULT 0,
    import_count integer DEFAULT 0,
    favorite_count integer DEFAULT 0,
    moderation_status character varying(20) DEFAULT 'approved',
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Create community_scenes table (separate from user scenarios)
CREATE TABLE IF NOT EXISTS public.community_scenes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    original_scenario_id uuid NOT NULL, -- Reference to the original scenario
    creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    name character varying(50) NOT NULL,
    description text,
    initial_message text,
    atmosphere character varying(100),
    background_image_url text,
    background_image_filename text,
    uses_custom_background boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    hidden_fields jsonb DEFAULT '[]'::jsonb,
    published_at timestamp without time zone DEFAULT now(),
    view_count integer DEFAULT 0,
    import_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_community_characters_creator ON public.community_characters(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_community_characters_published ON public.community_characters(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_characters_original ON public.community_characters(original_character_id);

CREATE INDEX IF NOT EXISTS idx_community_scenes_creator ON public.community_scenes(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_community_scenes_published ON public.community_scenes(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_scenes_original ON public.community_scenes(original_scenario_id);

-- Enable RLS
ALTER TABLE public.community_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_characters
CREATE POLICY "Anyone can view community characters"
ON public.community_characters FOR SELECT
USING (true);

CREATE POLICY "Only creators can delete their community characters"
ON public.community_characters FOR DELETE
USING (auth.uid() = creator_user_id);

-- RLS Policies for community_scenes
CREATE POLICY "Anyone can view community scenes"
ON public.community_scenes FOR SELECT
USING (true);

CREATE POLICY "Only creators can delete their community scenes"
ON public.community_scenes FOR DELETE
USING (auth.uid() = creator_user_id);

-- Grant access
GRANT SELECT ON public.community_characters TO authenticated;
GRANT SELECT ON public.community_scenes TO authenticated;
GRANT DELETE ON public.community_characters TO authenticated;
GRANT DELETE ON public.community_scenes TO authenticated;

-- Add comments
COMMENT ON TABLE public.community_characters IS 'Published characters available in the Community Hub - separate copies from user characters';
COMMENT ON TABLE public.community_scenes IS 'Published scenes available in the Community Hub - separate copies from user scenarios';
COMMENT ON COLUMN public.community_characters.original_character_id IS 'ID of the original character this was published from';
COMMENT ON COLUMN public.community_scenes.original_scenario_id IS 'ID of the original scenario this was published from';
