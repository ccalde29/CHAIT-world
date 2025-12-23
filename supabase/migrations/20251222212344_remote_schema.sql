alter table "public"."character_reports" drop constraint "character_reports_report_type_check";

alter table "public"."community_reports" drop constraint "community_reports_report_type_check";

alter table "public"."character_reports" add constraint "character_reports_report_type_check" CHECK (((report_type)::text = ANY ((ARRAY['character'::character varying, 'scene'::character varying])::text[]))) not valid;

alter table "public"."character_reports" validate constraint "character_reports_report_type_check";

alter table "public"."community_reports" add constraint "community_reports_report_type_check" CHECK (((report_type)::text = ANY ((ARRAY['character'::character varying, 'scene'::character varying])::text[]))) not valid;

alter table "public"."community_reports" validate constraint "community_reports_report_type_check";


