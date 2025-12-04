-- Add INSERT and UPDATE policies for community tables

-- Community Characters INSERT policy
CREATE POLICY "Creators can insert community characters"
ON public.community_characters FOR INSERT
WITH CHECK (auth.uid() = creator_user_id);

-- Community Characters UPDATE policy
CREATE POLICY "Creators can update their community characters"
ON public.community_characters FOR UPDATE
USING (auth.uid() = creator_user_id)
WITH CHECK (auth.uid() = creator_user_id);

-- Community Scenes INSERT policy
CREATE POLICY "Creators can insert community scenes"
ON public.community_scenes FOR INSERT
WITH CHECK (auth.uid() = creator_user_id);

-- Community Scenes UPDATE policy
CREATE POLICY "Creators can update their community scenes"
ON public.community_scenes FOR UPDATE
USING (auth.uid() = creator_user_id)
WITH CHECK (auth.uid() = creator_user_id);

-- Grant INSERT and UPDATE permissions
GRANT INSERT, UPDATE ON public.community_characters TO authenticated;
GRANT INSERT, UPDATE ON public.community_scenes TO authenticated;
