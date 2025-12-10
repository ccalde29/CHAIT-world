-- ============================================================================
-- Create community_reports table for reporting community characters and scenes
-- This is separate from character_reports which handles private character reports
-- ============================================================================

-- Create new community_reports table
CREATE TABLE IF NOT EXISTS "public"."community_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "community_character_id" "uuid",
    "community_scene_id" "uuid",
    "reporter_user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "report_type" VARCHAR(20) NOT NULL CHECK (report_type IN ('character', 'scene')),
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reviewed_at" timestamp without time zone,
    "reviewed_by" "uuid",
    "action_taken" "text",
    CONSTRAINT "community_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'actioned'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "character_or_scene_report" CHECK (
        (community_character_id IS NOT NULL AND community_scene_id IS NULL AND report_type = 'character') OR
        (community_scene_id IS NOT NULL AND community_character_id IS NULL AND report_type = 'scene')
    )
);

ALTER TABLE "public"."community_reports" OWNER TO "postgres";

-- Add primary key
ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id");

-- Add unique constraint to prevent duplicate reports
ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_unique_character" UNIQUE ("community_character_id", "reporter_user_id");

ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_unique_scene" UNIQUE ("community_scene_id", "reporter_user_id");

-- Add foreign key constraints pointing to the community tables
ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_character_id_fkey" 
FOREIGN KEY (community_character_id) REFERENCES "public"."community_characters"(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_scene_id_fkey" 
FOREIGN KEY (community_scene_id) REFERENCES "public"."community_scenes"(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."community_reports"
ADD CONSTRAINT "community_reports_reporter_fkey" 
FOREIGN KEY (reporter_user_id) REFERENCES "auth"."users"(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_community_reports_character_id ON "public"."community_reports"(community_character_id);
CREATE INDEX idx_community_reports_scene_id ON "public"."community_reports"(community_scene_id);
CREATE INDEX idx_community_reports_type ON "public"."community_reports"(report_type);
CREATE INDEX idx_community_reports_status ON "public"."community_reports"(status, created_at DESC);

-- Enable RLS
ALTER TABLE "public"."community_reports" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create community reports" ON "public"."community_reports"
FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own community reports" ON "public"."community_reports"
FOR SELECT USING (auth.uid() = reporter_user_id);

-- Grant permissions
GRANT ALL ON TABLE "public"."community_reports" TO "anon";
GRANT ALL ON TABLE "public"."community_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."community_reports" TO "service_role";

-- Add comments
COMMENT ON TABLE "public"."community_reports" IS 'Reports for both characters and scenes from the community hub';
COMMENT ON COLUMN "public"."community_reports".community_character_id IS 'ID of the reported community character (null for scene reports)';
COMMENT ON COLUMN "public"."community_reports".community_scene_id IS 'ID of the reported community scene (null for character reports)';
COMMENT ON COLUMN "public"."community_reports".report_type IS 'Type of report: character or scene';
