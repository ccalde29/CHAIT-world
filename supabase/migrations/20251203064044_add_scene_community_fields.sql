-- Add community fields to scenarios table
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS import_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add index for querying public scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_public ON scenarios(is_public, published_at DESC) WHERE is_public = TRUE;

-- Add comment
COMMENT ON COLUMN scenarios.is_public IS 'Whether this scene is published to the community hub';
COMMENT ON COLUMN scenarios.published_at IS 'When the scene was published to the community';
COMMENT ON COLUMN scenarios.import_count IS 'Number of times this scene has been imported';
COMMENT ON COLUMN scenarios.view_count IS 'Number of times this scene has been viewed';

-- Create function to increment scenario views
CREATE OR REPLACE FUNCTION increment_scenario_views(scenario_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE scenarios
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = scenario_id;
END;
$$;
