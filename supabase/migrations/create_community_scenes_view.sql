-- Create community_scenes view to mirror community_characters pattern
-- This view shows all published scenes in the community hub

CREATE OR REPLACE VIEW public.community_scenes
WITH (security_invoker='on') AS
SELECT
    id,
    user_id,
    name,
    description,
    initial_message,
    atmosphere,
    background_image_url,
    background_image_filename,
    uses_custom_background,
    published_at,
    view_count,
    import_count
FROM public.scenarios
WHERE is_public = true
ORDER BY published_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.community_scenes TO authenticated;
