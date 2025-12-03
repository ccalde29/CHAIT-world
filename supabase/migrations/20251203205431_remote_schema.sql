drop extension if exists "pg_net";

create or replace view "public"."community_scenes" as  SELECT id,
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
  WHERE (is_public = true)
  ORDER BY published_at DESC;


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Users can delete character avatars"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'character-avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete images in their own folder"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete scene backgrounds"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'scene-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can manage their own images"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update character avatars"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'character-avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update images in their own folder"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update scene backgrounds"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'scene-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload character avatars"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'character-avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload images to their own folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload scene backgrounds"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'scene-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view character avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'character-avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view images in their own folder"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view own images"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'user-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view scene backgrounds"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'scene-backgrounds'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



