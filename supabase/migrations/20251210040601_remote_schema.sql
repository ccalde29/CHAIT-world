


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_old_chat_sessions"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive sessions older than 90 days with no activity
    UPDATE chat_sessions
    SET is_archived = true
    WHERE last_activity < (NOW() - INTERVAL '90 days')
    AND is_archived = false;
    
    -- Delete archived sessions older than 1 year
    DELETE FROM chat_sessions
    WHERE is_archived = true 
    AND created_at < (NOW() - INTERVAL '1 year');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_chat_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_memories"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM character_memories
    WHERE importance_score < 0.1 
    AND last_accessed < (NOW() - INTERVAL '90 days')
    AND access_count < 3;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_memories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_session_states"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete session states older than 30 days
  DELETE FROM character_session_state
  WHERE updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_session_states"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_character_feedback_stats"("p_character_id" character varying) RETURNS TABLE("avg_rating" double precision, "total_feedback" integer, "rating_distribution" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(rating)::FLOAT as avg_rating,
        COUNT(*)::INTEGER as total_feedback,
        json_build_object(
            '5_star', COUNT(*) FILTER (WHERE rating = 5),
            '4_star', COUNT(*) FILTER (WHERE rating = 4),
            '3_star', COUNT(*) FILTER (WHERE rating = 3),
            '2_star', COUNT(*) FILTER (WHERE rating = 2),
            '1_star', COUNT(*) FILTER (WHERE rating = 1)
        ) as rating_distribution
    FROM response_feedback 
    WHERE character_id = p_character_id;
END;
$$;


ALTER FUNCTION "public"."get_character_feedback_stats"("p_character_id" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid") RETURNS TABLE("mood" character varying, "intensity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT current_mood, mood_intensity
  FROM character_session_state
  WHERE character_id = p_character_id
    AND session_id = p_session_id
    AND user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_character_relationships"("p_character_id" "text", "p_user_id" "uuid", "p_target_type" "text" DEFAULT 'character'::"text") RETURNS TABLE("id" integer, "character_id" character varying, "target_type" character varying, "target_id" character varying, "relationship_type" character varying, "trust_level" double precision, "familiarity_level" double precision, "emotional_bond" double precision, "custom_context" "text", "last_interaction" timestamp with time zone, "interaction_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.character_id,
    cr.target_type,
    cr.target_id,
    cr.relationship_type,
    cr.trust_level,
    cr.familiarity_level,
    cr.emotional_bond,
    cr.custom_context,
    cr.last_interaction,
    cr.interaction_count,
    cr.created_at
  FROM character_relationships cr
  WHERE cr.character_id = p_character_id
    AND cr.user_id = p_user_id
    AND cr.target_type = p_target_type;
END;
$$;


ALTER FUNCTION "public"."get_character_relationships"("p_character_id" "text", "p_user_id" "uuid", "p_target_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_decrypted_api_keys"("p_user_id" "uuid", "p_encryption_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_encrypted TEXT;
  v_decrypted TEXT;
BEGIN
  SELECT api_keys_encrypted INTO v_encrypted
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF v_encrypted IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  v_decrypted := pgp_sym_decrypt(v_encrypted::bytea, p_encryption_key);
  RETURN v_decrypted::jsonb;
END;
$$;


ALTER FUNCTION "public"."get_decrypted_api_keys"("p_user_id" "uuid", "p_encryption_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_characters"("limit_count" integer DEFAULT 10) RETURNS TABLE("character_id" "uuid", "name" "text", "popularity_score" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    (COALESCE(c.import_count, 0) * 2 + COALESCE(c.view_count, 0)) as popularity_score
  FROM characters c
  WHERE c.is_public = true 
    AND c.moderation_status = 'approved'
  ORDER BY popularity_score DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_popular_characters"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_tags"("tag_limit" integer DEFAULT 20) RETURNS TABLE("tag" "text", "usage_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(tags) as tag,
    COUNT(*) as usage_count
  FROM characters
  WHERE is_public = true 
    AND moderation_status = 'approved'
    AND tags IS NOT NULL
  GROUP BY tag
  ORDER BY usage_count DESC, tag ASC
  LIMIT tag_limit;
END;
$$;


ALTER FUNCTION "public"."get_popular_tags"("tag_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert default user settings with proper error handling
  BEGIN
    INSERT INTO public.user_settings (
      user_id,
      api_provider,
      ollama_base_url,
      ollama_model,
      default_scenario,
      preferences
    ) VALUES (
      NEW.id,
      'openai',
      'http://localhost:11434',
      'llama2', 
      'coffee-shop',
      '{"responseDelay": true, "showTypingIndicator": true, "maxCharactersInGroup": 5}'::jsonb
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- User settings already exist, ignore
      NULL;
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to create user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_access_count"("memory_id" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE character_memories 
    SET access_count = access_count + 1
    WHERE id = memory_id
    RETURNING access_count INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$;


ALTER FUNCTION "public"."increment_access_count"("memory_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_access_count"("memory_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE character_memories 
    SET access_count = COALESCE(access_count, 0) + 1,
        last_accessed = NOW()
    WHERE id = memory_id;
END;
$$;


ALTER FUNCTION "public"."increment_access_count"("memory_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_character_views"("character_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE characters 
  SET view_count = view_count + 1
  WHERE id = character_id AND is_public = true;
END;
$$;


ALTER FUNCTION "public"."increment_character_views"("character_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_message_count"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE chat_sessions
    SET
        message_count = COALESCE(message_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."increment_message_count"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_message_count"("p_session_id" "uuid") IS 'Increments the message count for a chat session and updates the timestamp';



CREATE OR REPLACE FUNCTION "public"."increment_scenario_views"("scenario_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE scenarios
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = scenario_id;
END;
$$;


ALTER FUNCTION "public"."increment_scenario_views"("scenario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_public = true AND OLD.is_public = false THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_published_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_character_learning_pattern"("p_character_id" character varying, "p_learning_type" character varying, "p_pattern_data" "jsonb", "p_confidence_adjustment" double precision DEFAULT 0.1) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO character_learning (
        character_id, 
        learning_type, 
        pattern_data, 
        confidence_score,
        usage_count
    )
    VALUES (
        p_character_id,
        p_learning_type,
        p_pattern_data,
        LEAST(1.0, 0.5 + p_confidence_adjustment),
        1
    )
    ON CONFLICT (character_id, learning_type) 
    DO UPDATE SET
        pattern_data = EXCLUDED.pattern_data,
        confidence_score = LEAST(1.0, character_learning.confidence_score + p_confidence_adjustment),
        usage_count = character_learning.usage_count + 1,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_character_learning_pattern"("p_character_id" character varying, "p_learning_type" character varying, "p_pattern_data" "jsonb", "p_confidence_adjustment" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_import_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE characters 
  SET import_count = import_count + 1
  WHERE id = NEW.original_character_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_import_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_memory_importance"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE character_memories
    SET importance_score = GREATEST(0.1, 
        importance_score * 0.995 + -- Natural decay
        CASE 
            WHEN last_accessed > (NOW() - INTERVAL '7 days') THEN 0.01
            WHEN last_accessed > (NOW() - INTERVAL '30 days') THEN 0.005
            ELSE -0.01
        END +
        (access_count::FLOAT / 1000.0) * 0.005 -- Access reinforcement
    )
    WHERE created_at < (NOW() - INTERVAL '1 day');
END;
$$;


ALTER FUNCTION "public"."update_memory_importance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."character_relationships" (
    "id" integer NOT NULL,
    "character_id" character varying(50) NOT NULL,
    "user_id" "uuid",
    "target_type" character varying(20),
    "target_id" character varying(100),
    "relationship_type" character varying(30) DEFAULT 'neutral'::character varying,
    "trust_level" double precision DEFAULT 0.5,
    "familiarity_level" double precision DEFAULT 0.1,
    "emotional_bond" double precision DEFAULT 0.0,
    "last_interaction" timestamp with time zone DEFAULT "now"(),
    "interaction_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_context" "text",
    CONSTRAINT "character_relationships_emotional_bond_check" CHECK ((("emotional_bond" >= ('-1.0'::numeric)::double precision) AND ("emotional_bond" <= (1.0)::double precision))),
    CONSTRAINT "character_relationships_familiarity_level_check" CHECK ((("familiarity_level" >= (0.0)::double precision) AND ("familiarity_level" <= (1.0)::double precision))),
    CONSTRAINT "character_relationships_trust_level_check" CHECK ((("trust_level" >= (0.0)::double precision) AND ("trust_level" <= (1.0)::double precision)))
);


ALTER TABLE "public"."character_relationships" OWNER TO "postgres";


COMMENT ON TABLE "public"."character_relationships" IS 'Tracks relationships between characters and users, or between characters themselves (bot-to-bot)';



COMMENT ON COLUMN "public"."character_relationships"."custom_context" IS 'Custom description of the relationship (e.g., "We grew up together", "Met in college")';



CREATE OR REPLACE FUNCTION "public"."upsert_bot_relationship"("p_character_id" "text", "p_user_id" "uuid", "p_target_character_id" "text", "p_relationship_type" character varying, "p_trust_level" double precision, "p_familiarity_level" double precision, "p_emotional_bond" double precision, "p_custom_context" "text" DEFAULT NULL::"text") RETURNS "public"."character_relationships"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result character_relationships;
BEGIN
  INSERT INTO character_relationships (
    character_id,
    user_id,
    target_type,
    target_id,
    relationship_type,
    trust_level,
    familiarity_level,
    emotional_bond,
    custom_context,
    interaction_count
  )
  VALUES (
    p_character_id,
    p_user_id,
    'character',
    p_target_character_id,
    p_relationship_type,
    p_trust_level,
    p_familiarity_level,
    p_emotional_bond,
    p_custom_context,
    1
  )
  ON CONFLICT (character_id, user_id, target_type, target_id)
  DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    trust_level = EXCLUDED.trust_level,
    familiarity_level = EXCLUDED.familiarity_level,
    emotional_bond = EXCLUDED.emotional_bond,
    custom_context = EXCLUDED.custom_context,
    last_interaction = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."upsert_bot_relationship"("p_character_id" "text", "p_user_id" "uuid", "p_target_character_id" "text", "p_relationship_type" character varying, "p_trust_level" double precision, "p_familiarity_level" double precision, "p_emotional_bond" double precision, "p_custom_context" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid", "p_mood" character varying, "p_intensity" double precision) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO character_session_state (
    character_id,
    session_id,
    user_id,
    current_mood,
    mood_intensity,
    mood_updated_at
  )
  VALUES (
    p_character_id,
    p_session_id,
    p_user_id,
    p_mood,
    p_intensity,
    NOW()
  )
  ON CONFLICT (character_id, session_id, user_id)
  DO UPDATE SET
    current_mood = p_mood,
    mood_intensity = p_intensity,
    mood_updated_at = NOW(),
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid", "p_mood" character varying, "p_intensity" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_encrypted_api_keys"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_encryption_key" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_settings (user_id, api_keys_encrypted)
  VALUES (
    p_user_id,
    pgp_sym_encrypt(p_api_keys::text, p_encryption_key)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    api_keys_encrypted = pgp_sym_encrypt(p_api_keys::text, p_encryption_key),
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_encrypted_api_keys"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_encryption_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_ollama_settings" "jsonb", "p_group_dynamics_mode" character varying, "p_message_delay" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_settings (
    user_id,
    api_keys,
    ollama_settings,
    group_dynamics_mode,
    message_delay
  )
  VALUES (
    p_user_id,
    p_api_keys,
    p_ollama_settings,
    p_group_dynamics_mode,
    p_message_delay
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    api_keys = p_api_keys,
    ollama_settings = p_ollama_settings,
    group_dynamics_mode = p_group_dynamics_mode,
    message_delay = p_message_delay,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_ollama_settings" "jsonb", "p_group_dynamics_mode" character varying, "p_message_delay" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_character_for_publish"("char_id" "uuid") RETURNS TABLE("is_valid" boolean, "error_message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  char_record RECORD;
BEGIN
  SELECT * INTO char_record FROM characters WHERE id = char_id;
  
  -- Check age
  IF char_record.age < 18 THEN
    RETURN QUERY SELECT false, 'Character must be 18 or older';
    RETURN;
  END IF;
  
  -- Check required fields
  IF char_record.name IS NULL OR char_record.name = '' THEN
    RETURN QUERY SELECT false, 'Character name is required';
    RETURN;
  END IF;
  
  IF char_record.personality IS NULL OR char_record.personality = '' THEN
    RETURN QUERY SELECT false, 'Character personality is required';
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Character is valid for publishing'::TEXT;
END;
$$;


ALTER FUNCTION "public"."validate_character_for_publish"("char_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_imports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "original_character_id" "uuid" NOT NULL,
    "imported_character_id" "uuid" NOT NULL,
    "imported_by_user_id" "uuid" NOT NULL,
    "imported_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_learning" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_interactions" integer DEFAULT 0,
    "topics_discussed" "jsonb" DEFAULT '[]'::"jsonb",
    "emotional_patterns" "jsonb" DEFAULT '[]'::"jsonb",
    "avg_response_quality" numeric(3,2) DEFAULT 0.5,
    "learning_insights" "jsonb" DEFAULT '[]'::"jsonb",
    "last_interaction" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_learning" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_memories" (
    "id" integer NOT NULL,
    "character_id" character varying(50) NOT NULL,
    "user_id" "uuid",
    "memory_type" character varying(20) NOT NULL,
    "target_entity" character varying(100),
    "memory_content" "text" NOT NULL,
    "importance_score" double precision DEFAULT 0.5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "last_accessed" timestamp with time zone DEFAULT "now"(),
    "access_count" integer DEFAULT 1,
    CONSTRAINT "character_memories_importance_score_check" CHECK ((("importance_score" >= (0.0)::double precision) AND ("importance_score" <= (1.0)::double precision)))
);


ALTER TABLE "public"."character_memories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."character_memories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."character_memories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."character_memories_id_seq" OWNED BY "public"."character_memories"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."character_relationships_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."character_relationships_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."character_relationships_id_seq" OWNED BY "public"."character_relationships"."id";



CREATE TABLE IF NOT EXISTS "public"."character_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "reporter_user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reviewed_at" timestamp without time zone,
    "reviewed_by" "uuid",
    "action_taken" "text",
    CONSTRAINT "character_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'actioned'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."character_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_session_state" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_mood" character varying(30) DEFAULT 'neutral'::character varying,
    "mood_intensity" double precision DEFAULT 0.5,
    "mood_updated_at" timestamp without time zone DEFAULT "now"(),
    "messages_this_session" integer DEFAULT 0,
    "last_spoke_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "character_session_state_mood_intensity_check" CHECK ((("mood_intensity" >= (0)::double precision) AND ("mood_intensity" <= (1)::double precision)))
);


ALTER TABLE "public"."character_session_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."character_session_state" IS 'Tracks character emotional states and speaking patterns per session';



CREATE TABLE IF NOT EXISTS "public"."character_topic_engagement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_keyword" character varying(100) NOT NULL,
    "engagement_count" integer DEFAULT 1,
    "last_discussed" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_topic_engagement" OWNER TO "postgres";


COMMENT ON TABLE "public"."character_topic_engagement" IS 'Tracks character interest in specific topics over time';



CREATE TABLE IF NOT EXISTS "public"."characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(50) NOT NULL,
    "personality" "text" NOT NULL,
    "avatar" character varying(10) DEFAULT '🤖'::character varying,
    "color" character varying(50) DEFAULT 'from-gray-500 to-slate-500'::character varying,
    "response_style" character varying(20) DEFAULT 'custom'::character varying,
    "is_default" boolean DEFAULT false,
    "is_modified_default" boolean DEFAULT false,
    "original_id" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_image_url" "text",
    "avatar_image_filename" "text",
    "uses_custom_image" boolean DEFAULT false,
    "age" integer DEFAULT 18 NOT NULL,
    "sex" "text",
    "appearance" "text",
    "background" "text",
    "chat_examples" "jsonb" DEFAULT '[]'::"jsonb",
    "relationships" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "temperature" double precision DEFAULT 0.7,
    "max_tokens" integer DEFAULT 150,
    "context_window" integer DEFAULT 8000,
    "memory_enabled" boolean DEFAULT true,
    "is_public" boolean DEFAULT false,
    "published_at" timestamp without time zone,
    "moderation_status" "text" DEFAULT 'pending'::"text",
    "view_count" integer DEFAULT 0,
    "import_count" integer DEFAULT 0,
    "ai_provider" character varying(50) DEFAULT 'openai'::character varying,
    "ai_model" character varying(100) DEFAULT 'gpt-3.5-turbo'::character varying,
    "fallback_provider" character varying(50),
    "fallback_model" character varying(100),
    "is_locked" boolean DEFAULT false,
    "hidden_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "voice_traits" "jsonb" DEFAULT '{"humor": 0.5, "optimism": 0.5, "formality": 0.5, "verbosity": 0.5, "directness": 0.5, "emotiveness": 0.5, "intellectualism": 0.5}'::"jsonb",
    "speech_patterns" "jsonb" DEFAULT '{"uses_slang": false, "avoided_words": [], "favored_phrases": [], "punctuation_style": "casual", "uses_contractions": true, "typical_sentence_length": "medium"}'::"jsonb",
    CONSTRAINT "age_minimum" CHECK (("age" >= 18)),
    CONSTRAINT "character_name_length" CHECK ((("length"(("name")::"text") >= 1) AND ("length"(("name")::"text") <= 50))),
    CONSTRAINT "context_window_range" CHECK ((("context_window" >= 1000) AND ("context_window" <= 32000))),
    CONSTRAINT "max_tokens_range" CHECK ((("max_tokens" >= 50) AND ("max_tokens" <= 1000))),
    CONSTRAINT "moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "personality_length" CHECK ((("length"("personality") >= 20) AND ("length"("personality") <= 500))),
    CONSTRAINT "temperature_range" CHECK ((("temperature" >= (0)::double precision) AND ("temperature" <= (2)::double precision)))
);


ALTER TABLE "public"."characters" OWNER TO "postgres";


COMMENT ON COLUMN "public"."characters"."ai_provider" IS 'AI provider: openai, anthropic, openrouter, google, ollama';



COMMENT ON COLUMN "public"."characters"."ai_model" IS 'Specific model identifier (e.g., gpt-4, claude-3-opus-20240229)';



COMMENT ON COLUMN "public"."characters"."fallback_provider" IS 'Fallback provider if primary fails';



COMMENT ON COLUMN "public"."characters"."fallback_model" IS 'Fallback model if primary fails';



COMMENT ON COLUMN "public"."characters"."is_locked" IS 'Indicates if character has privacy restrictions when published';



COMMENT ON COLUMN "public"."characters"."hidden_fields" IS 'Array of field names to hide on import (e.g., ["personality", "appearance", "background"])';



COMMENT ON COLUMN "public"."characters"."voice_traits" IS 'Structured personality traits for consistent voice (formality, verbosity, emotiveness, etc.)';



COMMENT ON COLUMN "public"."characters"."speech_patterns" IS 'Speech patterns and preferences (phrases, contractions, slang usage)';



CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" character varying(255),
    "scenario_id" character varying(50),
    "active_characters" "text"[],
    "group_mode" character varying(20) DEFAULT 'natural'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false,
    "last_message_at" timestamp with time zone,
    "updated_at" timestamp without time zone,
    "message_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{"tone": "neutral", "key_topics": [], "avg_message_length": 0, "significant_moments": []}'::"jsonb"
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_sessions"."metadata" IS 'Session metadata for continuity (tone, topics, moments)';



CREATE TABLE IF NOT EXISTS "public"."community_characters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "original_character_id" "uuid" NOT NULL,
    "creator_user_id" "uuid" NOT NULL,
    "name" character varying(50) NOT NULL,
    "age" character varying(50),
    "sex" character varying(50),
    "personality" "text",
    "appearance" "text",
    "background" "text",
    "avatar" "text",
    "color" character varying(100),
    "chat_examples" "text",
    "tags" "text"[],
    "temperature" numeric DEFAULT 0.7,
    "max_tokens" integer DEFAULT 150,
    "context_window" integer DEFAULT 10,
    "memory_enabled" boolean DEFAULT false,
    "avatar_image_url" "text",
    "avatar_image_filename" "text",
    "uses_custom_image" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "hidden_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "published_at" timestamp without time zone DEFAULT "now"(),
    "view_count" integer DEFAULT 0,
    "import_count" integer DEFAULT 0,
    "favorite_count" integer DEFAULT 0,
    "moderation_status" character varying(20) DEFAULT 'approved'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_characters" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_characters" IS 'Published characters available in the Community Hub - separate copies from user characters';



COMMENT ON COLUMN "public"."community_characters"."original_character_id" IS 'ID of the original character this was published from';



CREATE TABLE IF NOT EXISTS "public"."community_scenes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "original_scenario_id" "uuid" NOT NULL,
    "creator_user_id" "uuid" NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "initial_message" "text",
    "atmosphere" character varying(100),
    "background_image_url" "text",
    "background_image_filename" "text",
    "uses_custom_background" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "hidden_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "published_at" timestamp without time zone DEFAULT "now"(),
    "view_count" integer DEFAULT 0,
    "import_count" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_scenes" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_scenes" IS 'Published scenes available in the Community Hub - separate copies from user scenarios';



COMMENT ON COLUMN "public"."community_scenes"."original_scenario_id" IS 'ID of the original scenario this was published from';



CREATE TABLE IF NOT EXISTS "public"."custom_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by_admin_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "display_name" character varying(150) NOT NULL,
    "description" "text",
    "openrouter_model_id" character varying(200) NOT NULL,
    "custom_system_prompt" "text",
    "temperature" numeric(3,2) DEFAULT 0.8,
    "max_tokens" integer DEFAULT 150,
    "is_active" boolean DEFAULT true,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "custom_models_max_tokens_check" CHECK ((("max_tokens" >= 50) AND ("max_tokens" <= 1000))),
    CONSTRAINT "custom_models_temperature_check" CHECK ((("temperature" >= (0)::numeric) AND ("temperature" <= 2.0)))
);


ALTER TABLE "public"."custom_models" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_models" IS 'Admin-managed custom AI model configurations with preset prompts and settings via OpenRouter';



COMMENT ON COLUMN "public"."custom_models"."name" IS 'Internal unique identifier (e.g., creative-storyteller)';



COMMENT ON COLUMN "public"."custom_models"."display_name" IS 'User-facing display name (e.g., Creative Storyteller)';



COMMENT ON COLUMN "public"."custom_models"."openrouter_model_id" IS 'The actual OpenRouter model ID to use (e.g., anthropic/claude-3.5-sonnet)';



COMMENT ON COLUMN "public"."custom_models"."custom_system_prompt" IS 'System prompt prepended to all character prompts using this model';



COMMENT ON COLUMN "public"."custom_models"."is_active" IS 'Whether this model is available for selection (inactive models hidden from users)';



COMMENT ON COLUMN "public"."custom_models"."tags" IS 'Categorization tags (e.g., creative, analytical, roleplay, nsfw)';



CREATE TABLE IF NOT EXISTS "public"."hidden_default_characters" (
    "user_id" "uuid" NOT NULL,
    "character_id" character varying(50) NOT NULL,
    "hidden_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hidden_default_characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" integer NOT NULL,
    "session_id" "text",
    "sender_type" character varying(20),
    "sender_id" character varying(100),
    "content" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" character varying(50),
    "character_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "mood_at_time" character varying(30),
    "mood_intensity" double precision,
    "is_primary_response" boolean DEFAULT false,
    "response_metadata" "jsonb" DEFAULT '{"model": "", "provider": "", "tokens_used": 0, "temperature_used": 0.8}'::"jsonb",
    CONSTRAINT "messages_mood_intensity_check" CHECK ((("mood_intensity" >= (0)::double precision) AND ("mood_intensity" <= (1)::double precision)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."mood_at_time" IS 'Character mood when this message was sent';



COMMENT ON COLUMN "public"."messages"."mood_intensity" IS 'Intensity of the mood (0.0-1.0)';



COMMENT ON COLUMN "public"."messages"."is_primary_response" IS 'Whether this was the primary responding character';



COMMENT ON COLUMN "public"."messages"."response_metadata" IS 'Metadata about how the response was generated';



CREATE SEQUENCE IF NOT EXISTS "public"."messages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."messages_id_seq" OWNED BY "public"."messages"."id";



CREATE OR REPLACE VIEW "public"."moderation_queue" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "user_id",
    NULL::character varying(50) AS "name",
    NULL::"text" AS "personality",
    NULL::character varying(10) AS "avatar",
    NULL::character varying(50) AS "color",
    NULL::character varying(20) AS "response_style",
    NULL::boolean AS "is_default",
    NULL::boolean AS "is_modified_default",
    NULL::character varying(50) AS "original_id",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::"text" AS "avatar_image_url",
    NULL::"text" AS "avatar_image_filename",
    NULL::boolean AS "uses_custom_image",
    NULL::integer AS "age",
    NULL::"text" AS "sex",
    NULL::"text" AS "appearance",
    NULL::"text" AS "background",
    NULL::"jsonb" AS "chat_examples",
    NULL::"jsonb" AS "relationships",
    NULL::"text"[] AS "tags",
    NULL::double precision AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::integer AS "context_window",
    NULL::boolean AS "memory_enabled",
    NULL::boolean AS "is_public",
    NULL::timestamp without time zone AS "published_at",
    NULL::"text" AS "moderation_status",
    NULL::integer AS "view_count",
    NULL::integer AS "import_count",
    NULL::bigint AS "report_count";


ALTER VIEW "public"."moderation_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(50) NOT NULL,
    "description" character varying(200) NOT NULL,
    "initial_message" "text" NOT NULL,
    "atmosphere" character varying(100) DEFAULT 'neutral'::character varying,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "background_image_url" "text",
    "background_image_filename" "text",
    "uses_custom_background" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "import_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "is_locked" boolean DEFAULT false,
    "hidden_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "narrator_enabled" boolean DEFAULT false,
    "narrator_ai_provider" character varying(50) DEFAULT 'openai'::character varying,
    "narrator_ai_model" character varying(100),
    "narrator_temperature" numeric(3,2) DEFAULT 0.7,
    "narrator_max_tokens" integer DEFAULT 100,
    "narrator_trigger_mode" character varying(50) DEFAULT 'manual'::character varying,
    "narrator_interval" integer DEFAULT 5,
    "narrator_personality" "text",
    "context_rules" "jsonb" DEFAULT '{"noise_level": 0.5, "time_of_day": "afternoon", "setting_type": "casual", "allowed_topics": [], "restricted_topics": [], "formality_required": 0.3}'::"jsonb",
    "scene_state" "jsonb" DEFAULT '{"active_npcs": [], "crowd_level": "moderate", "recent_events": [], "ambient_details": []}'::"jsonb",
    "character_modifiers" "jsonb" DEFAULT '{}'::"jsonb",
    "scene_cues" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "description_length" CHECK ((("length"(("description")::"text") >= 1) AND ("length"(("description")::"text") <= 200))),
    CONSTRAINT "initial_message_length" CHECK ((("length"("initial_message") >= 1) AND ("length"("initial_message") <= 500))),
    CONSTRAINT "scenario_name_length" CHECK ((("length"(("name")::"text") >= 1) AND ("length"(("name")::"text") <= 50)))
);


ALTER TABLE "public"."scenarios" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scenarios"."initial_message" IS 'The message shown at the start of every chat in this scene. Sets the atmosphere and provides context for the conversation.';



COMMENT ON COLUMN "public"."scenarios"."is_public" IS 'Whether this scene is published to the community hub';



COMMENT ON COLUMN "public"."scenarios"."published_at" IS 'When the scene was published to the community';



COMMENT ON COLUMN "public"."scenarios"."import_count" IS 'Number of times this scene has been imported';



COMMENT ON COLUMN "public"."scenarios"."view_count" IS 'Number of times this scene has been viewed';



COMMENT ON COLUMN "public"."scenarios"."is_locked" IS 'Indicates if scene has privacy restrictions when published';



COMMENT ON COLUMN "public"."scenarios"."hidden_fields" IS 'Array of field names to hide on import (e.g., ["description"])';



COMMENT ON COLUMN "public"."scenarios"."narrator_enabled" IS 'Whether AI narrator auto-responses are enabled for this scene';



COMMENT ON COLUMN "public"."scenarios"."narrator_ai_provider" IS 'AI provider for narrator (openai, anthropic, openrouter, google, ollama, lmstudio, custom)';



COMMENT ON COLUMN "public"."scenarios"."narrator_ai_model" IS 'Specific model ID for narrator narration';



COMMENT ON COLUMN "public"."scenarios"."narrator_temperature" IS 'Temperature setting for narrator generation (0.0-1.5, default 0.7)';



COMMENT ON COLUMN "public"."scenarios"."narrator_max_tokens" IS 'Maximum tokens for narrator responses (50-200, default 100)';



COMMENT ON COLUMN "public"."scenarios"."narrator_trigger_mode" IS 'When narrator should respond: manual, auto_interval, scene_change, action_based';



COMMENT ON COLUMN "public"."scenarios"."narrator_interval" IS 'Number of messages between narrator interventions (for auto_interval mode, range 3-15)';



COMMENT ON COLUMN "public"."scenarios"."narrator_personality" IS 'Optional custom narrator style/personality for this scene (e.g., "poetic", "matter-of-fact")';



COMMENT ON COLUMN "public"."scenarios"."context_rules" IS 'Scene context rules (formality, noise level, allowed topics)';



COMMENT ON COLUMN "public"."scenarios"."scene_state" IS 'Dynamic scene state (crowd level, NPCs, events)';



COMMENT ON COLUMN "public"."scenarios"."character_modifiers" IS 'Character-specific instructions for this scene';



COMMENT ON COLUMN "public"."scenarios"."scene_cues" IS 'Recurring scene messages or triggers';



CREATE TABLE IF NOT EXISTS "public"."scene_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "scene_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "scene_comments_comment_check" CHECK ((("length"("comment") >= 1) AND ("length"("comment") <= 1000)))
);


ALTER TABLE "public"."scene_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."scene_comments" IS 'User comments on published scenes in Community Hub';



CREATE TABLE IF NOT EXISTS "public"."user_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size_bytes" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_images_type_check" CHECK (("type" = ANY (ARRAY['character'::"text", 'persona'::"text", 'scene'::"text"])))
);


ALTER TABLE "public"."user_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_personas" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "name" character varying(100) NOT NULL,
    "personality" "text" NOT NULL,
    "interests" "text"[],
    "communication_style" "text",
    "avatar" character varying(10) DEFAULT '👤'::character varying,
    "color" character varying(50) DEFAULT 'from-blue-500 to-indigo-500'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_image_url" "text",
    "avatar_image_filename" "text",
    "uses_custom_image" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ai_provider" character varying(50) DEFAULT 'openai'::character varying,
    "ai_model" character varying(100),
    "temperature" numeric(3,2) DEFAULT 0.8,
    "max_tokens" integer DEFAULT 150
);


ALTER TABLE "public"."user_personas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_personas"."ai_provider" IS 'AI provider for persona auto-responses (openai, anthropic, openrouter, google, ollama, lmstudio, custom)';



COMMENT ON COLUMN "public"."user_personas"."ai_model" IS 'Specific model ID to use for this persona (e.g., gpt-4o-mini, claude-3-5-haiku-20241022)';



COMMENT ON COLUMN "public"."user_personas"."temperature" IS 'Temperature setting for AI generation (0.0-1.5, default 0.8)';



COMMENT ON COLUMN "public"."user_personas"."max_tokens" IS 'Maximum tokens for persona responses (50-500, default 150)';



CREATE SEQUENCE IF NOT EXISTS "public"."user_personas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_personas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_personas_id_seq" OWNED BY "public"."user_personas"."id";



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "api_keys" "jsonb" DEFAULT '{}'::"jsonb",
    "ollama_settings" "jsonb" DEFAULT '{"baseUrl": "http://localhost:11434"}'::"jsonb",
    "group_dynamics_mode" character varying(50) DEFAULT 'natural'::character varying,
    "message_delay" integer DEFAULT 1200,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "api_keys_encrypted" "text",
    "active_persona_id" integer,
    "is_admin" boolean DEFAULT false NOT NULL,
    "admin_system_prompt" "text",
    "auto_approve_characters" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'User preferences and API keys for v1.5';



COMMENT ON COLUMN "public"."user_settings"."api_keys" IS 'Encrypted API keys: {openai, anthropic, openrouter, google}';



COMMENT ON COLUMN "public"."user_settings"."ollama_settings" IS 'Ollama configuration: {baseUrl, models}';



COMMENT ON COLUMN "public"."user_settings"."active_persona_id" IS 'The currently active persona for this user';



COMMENT ON COLUMN "public"."user_settings"."is_admin" IS 'Admin flag - manually set in Supabase for admin users';



COMMENT ON COLUMN "public"."user_settings"."admin_system_prompt" IS 'Optional system prompt that prepends to all character prompts when set';



COMMENT ON COLUMN "public"."user_settings"."auto_approve_characters" IS 'When true, published characters auto-approve; when false, they require moderation';



ALTER TABLE ONLY "public"."character_memories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."character_memories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."character_relationships" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."character_relationships_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_personas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_personas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."character_comments"
    ADD CONSTRAINT "character_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_favorites"
    ADD CONSTRAINT "character_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_favorites"
    ADD CONSTRAINT "character_favorites_user_character_unique" UNIQUE ("user_id", "character_id");



ALTER TABLE ONLY "public"."character_imports"
    ADD CONSTRAINT "character_imports_original_character_id_imported_by_user_id_key" UNIQUE ("original_character_id", "imported_by_user_id");



ALTER TABLE ONLY "public"."character_imports"
    ADD CONSTRAINT "character_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_learning"
    ADD CONSTRAINT "character_learning_character_id_user_id_key" UNIQUE ("character_id", "user_id");



ALTER TABLE ONLY "public"."character_learning"
    ADD CONSTRAINT "character_learning_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_memories"
    ADD CONSTRAINT "character_memories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_relationships"
    ADD CONSTRAINT "character_relationships_character_id_user_id_target_type_ta_key" UNIQUE ("character_id", "user_id", "target_type", "target_id");



ALTER TABLE ONLY "public"."character_relationships"
    ADD CONSTRAINT "character_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_reports"
    ADD CONSTRAINT "character_reports_character_id_reporter_user_id_key" UNIQUE ("character_id", "reporter_user_id");



ALTER TABLE ONLY "public"."character_reports"
    ADD CONSTRAINT "character_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_session_state"
    ADD CONSTRAINT "character_session_state_character_id_session_id_user_id_key" UNIQUE ("character_id", "session_id", "user_id");



ALTER TABLE ONLY "public"."character_session_state"
    ADD CONSTRAINT "character_session_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_topic_engagement"
    ADD CONSTRAINT "character_topic_engagement_character_id_user_id_topic_keywo_key" UNIQUE ("character_id", "user_id", "topic_keyword");



ALTER TABLE ONLY "public"."character_topic_engagement"
    ADD CONSTRAINT "character_topic_engagement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_characters"
    ADD CONSTRAINT "community_characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_scenes"
    ADD CONSTRAINT "community_scenes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_models"
    ADD CONSTRAINT "custom_models_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."custom_models"
    ADD CONSTRAINT "custom_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hidden_default_characters"
    ADD CONSTRAINT "hidden_default_characters_pkey" PRIMARY KEY ("user_id", "character_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."scene_comments"
    ADD CONSTRAINT "scene_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_images"
    ADD CONSTRAINT "user_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_personas"
    ADD CONSTRAINT "user_personas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



CREATE INDEX "character_comments_character_id_idx" ON "public"."character_comments" USING "btree" ("character_id");



CREATE INDEX "character_comments_created_at_idx" ON "public"."character_comments" USING "btree" ("created_at");



CREATE INDEX "character_comments_user_id_idx" ON "public"."character_comments" USING "btree" ("user_id");



CREATE INDEX "idx_char_session_state_character" ON "public"."character_session_state" USING "btree" ("character_id");



CREATE INDEX "idx_char_session_state_session" ON "public"."character_session_state" USING "btree" ("session_id");



CREATE INDEX "idx_char_session_state_user" ON "public"."character_session_state" USING "btree" ("user_id");



CREATE INDEX "idx_character_comments_character" ON "public"."character_comments" USING "btree" ("character_id");



CREATE INDEX "idx_character_comments_not_deleted" ON "public"."character_comments" USING "btree" ("character_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_character_comments_user" ON "public"."character_comments" USING "btree" ("user_id");



CREATE INDEX "idx_character_favorites_character" ON "public"."character_favorites" USING "btree" ("character_id");



CREATE INDEX "idx_character_favorites_created" ON "public"."character_favorites" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_character_favorites_user" ON "public"."character_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_character_learning_user_char" ON "public"."character_learning" USING "btree" ("user_id", "character_id");



CREATE INDEX "idx_character_memories_accessed" ON "public"."character_memories" USING "btree" ("last_accessed" DESC);



CREATE INDEX "idx_character_memories_character_user" ON "public"."character_memories" USING "btree" ("character_id", "user_id");



CREATE INDEX "idx_character_memories_importance" ON "public"."character_memories" USING "btree" ("importance_score" DESC);



CREATE INDEX "idx_character_memories_type" ON "public"."character_memories" USING "btree" ("memory_type");



CREATE INDEX "idx_character_relationships_character_user" ON "public"."character_relationships" USING "btree" ("character_id", "user_id");



CREATE INDEX "idx_character_relationships_interaction" ON "public"."character_relationships" USING "btree" ("last_interaction" DESC);



CREATE INDEX "idx_character_relationships_target" ON "public"."character_relationships" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_characters_created_at" ON "public"."characters" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_characters_memory" ON "public"."characters" USING "btree" ("memory_enabled") WHERE ("memory_enabled" = true);



CREATE INDEX "idx_characters_moderation" ON "public"."characters" USING "btree" ("moderation_status", "published_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_characters_public" ON "public"."characters" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_characters_published" ON "public"."characters" USING "btree" ("published_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_characters_tags" ON "public"."characters" USING "gin" ("tags");



CREATE INDEX "idx_characters_user" ON "public"."characters" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_characters_user_id" ON "public"."characters" USING "btree" ("user_id");



CREATE INDEX "idx_characters_voice_traits" ON "public"."characters" USING "gin" ("voice_traits");



CREATE INDEX "idx_chat_sessions_archived" ON "public"."chat_sessions" USING "btree" ("user_id", "is_archived", "created_at" DESC);



CREATE INDEX "idx_chat_sessions_metadata" ON "public"."chat_sessions" USING "gin" ("metadata");



CREATE INDEX "idx_chat_sessions_user_activity" ON "public"."chat_sessions" USING "btree" ("user_id", "last_activity" DESC);



CREATE INDEX "idx_chat_sessions_user_updated" ON "public"."chat_sessions" USING "btree" ("user_id", "updated_at");



CREATE INDEX "idx_community_characters_creator" ON "public"."community_characters" USING "btree" ("creator_user_id");



CREATE INDEX "idx_community_characters_original" ON "public"."community_characters" USING "btree" ("original_character_id");



CREATE INDEX "idx_community_characters_published" ON "public"."community_characters" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_community_scenes_creator" ON "public"."community_scenes" USING "btree" ("creator_user_id");



CREATE INDEX "idx_community_scenes_original" ON "public"."community_scenes" USING "btree" ("original_scenario_id");



CREATE INDEX "idx_community_scenes_published" ON "public"."community_scenes" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_custom_models_active" ON "public"."custom_models" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_custom_models_created_by" ON "public"."custom_models" USING "btree" ("created_by_admin_id");



CREATE INDEX "idx_custom_models_tags" ON "public"."custom_models" USING "gin" ("tags");



CREATE INDEX "idx_hidden_characters_user_id" ON "public"."hidden_default_characters" USING "btree" ("user_id");



CREATE INDEX "idx_imports_original" ON "public"."character_imports" USING "btree" ("original_character_id");



CREATE INDEX "idx_imports_user" ON "public"."character_imports" USING "btree" ("imported_by_user_id", "imported_at" DESC);



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_type", "sender_id");



CREATE INDEX "idx_messages_session" ON "public"."messages" USING "btree" ("session_id");



CREATE INDEX "idx_messages_session_time" ON "public"."messages" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "idx_reports_character" ON "public"."character_reports" USING "btree" ("character_id");



CREATE INDEX "idx_reports_status" ON "public"."character_reports" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_scenarios_context_rules" ON "public"."scenarios" USING "gin" ("context_rules");



CREATE INDEX "idx_scenarios_created_at" ON "public"."scenarios" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scenarios_narrator_enabled" ON "public"."scenarios" USING "btree" ("narrator_enabled") WHERE ("narrator_enabled" = true);



CREATE INDEX "idx_scenarios_public" ON "public"."scenarios" USING "btree" ("is_public", "published_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_scenarios_user_id" ON "public"."scenarios" USING "btree" ("user_id");



CREATE INDEX "idx_scene_comments_created" ON "public"."scene_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scene_comments_not_deleted" ON "public"."scene_comments" USING "btree" ("scene_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_scene_comments_scene" ON "public"."scene_comments" USING "btree" ("scene_id");



CREATE INDEX "idx_scene_comments_user" ON "public"."scene_comments" USING "btree" ("user_id");



CREATE INDEX "idx_topic_engagement_character" ON "public"."character_topic_engagement" USING "btree" ("character_id");



CREATE INDEX "idx_topic_engagement_keyword" ON "public"."character_topic_engagement" USING "btree" ("topic_keyword");



CREATE INDEX "idx_topic_engagement_user" ON "public"."character_topic_engagement" USING "btree" ("user_id");



CREATE INDEX "idx_user_images_user_type" ON "public"."user_images" USING "btree" ("user_id", "type");



CREATE INDEX "idx_user_personas_ai_provider" ON "public"."user_personas" USING "btree" ("ai_provider");



CREATE INDEX "idx_user_personas_user_id" ON "public"."user_personas" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_active_persona" ON "public"."user_settings" USING "btree" ("active_persona_id");



CREATE INDEX "idx_user_settings_is_admin" ON "public"."user_settings" USING "btree" ("is_admin") WHERE ("is_admin" = true);



CREATE INDEX "idx_user_settings_user" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "scene_comments_created_at_idx" ON "public"."scene_comments" USING "btree" ("created_at");



CREATE INDEX "scene_comments_scene_id_idx" ON "public"."scene_comments" USING "btree" ("scene_id");



CREATE INDEX "scene_comments_user_id_idx" ON "public"."scene_comments" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."moderation_queue" WITH ("security_invoker"='on') AS
 SELECT "c"."id",
    "c"."user_id",
    "c"."name",
    "c"."personality",
    "c"."avatar",
    "c"."color",
    "c"."response_style",
    "c"."is_default",
    "c"."is_modified_default",
    "c"."original_id",
    "c"."created_at",
    "c"."updated_at",
    "c"."avatar_image_url",
    "c"."avatar_image_filename",
    "c"."uses_custom_image",
    "c"."age",
    "c"."sex",
    "c"."appearance",
    "c"."background",
    "c"."chat_examples",
    "c"."relationships",
    "c"."tags",
    "c"."temperature",
    "c"."max_tokens",
    "c"."context_window",
    "c"."memory_enabled",
    "c"."is_public",
    "c"."published_at",
    "c"."moderation_status",
    "c"."view_count",
    "c"."import_count",
    "count"(DISTINCT "cr"."id") AS "report_count"
   FROM ("public"."characters" "c"
     LEFT JOIN "public"."character_reports" "cr" ON ((("c"."id" = "cr"."character_id") AND ("cr"."status" = 'pending'::"text"))))
  WHERE (("c"."is_public" = true) AND ("c"."moderation_status" = ANY (ARRAY['pending'::"text", 'rejected'::"text"])))
  GROUP BY "c"."id"
  ORDER BY "c"."published_at" DESC;



CREATE OR REPLACE TRIGGER "trigger_set_published_timestamp" BEFORE UPDATE ON "public"."characters" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_import_count" AFTER INSERT ON "public"."character_imports" FOR EACH ROW EXECUTE FUNCTION "public"."update_import_count"();



CREATE OR REPLACE TRIGGER "update_character_learning_updated_at" BEFORE UPDATE ON "public"."character_learning" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_characters_updated_at" BEFORE UPDATE ON "public"."characters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scenarios_updated_at" BEFORE UPDATE ON "public"."scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_personas_updated_at" BEFORE UPDATE ON "public"."user_personas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."character_comments"
    ADD CONSTRAINT "character_comments_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."community_characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_comments"
    ADD CONSTRAINT "character_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_imports"
    ADD CONSTRAINT "character_imports_imported_character_id_fkey" FOREIGN KEY ("imported_character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_imports"
    ADD CONSTRAINT "character_imports_original_character_id_fkey" FOREIGN KEY ("original_character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_learning"
    ADD CONSTRAINT "character_learning_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_memories"
    ADD CONSTRAINT "character_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."character_relationships"
    ADD CONSTRAINT "character_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."character_reports"
    ADD CONSTRAINT "character_reports_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_session_state"
    ADD CONSTRAINT "character_session_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_topic_engagement"
    ADD CONSTRAINT "character_topic_engagement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."community_characters"
    ADD CONSTRAINT "community_characters_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_scenes"
    ADD CONSTRAINT "community_scenes_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_models"
    ADD CONSTRAINT "custom_models_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hidden_default_characters"
    ADD CONSTRAINT "hidden_default_characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scene_comments"
    ADD CONSTRAINT "scene_comments_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."community_scenes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scene_comments"
    ADD CONSTRAINT "scene_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_images"
    ADD CONSTRAINT "user_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_personas"
    ADD CONSTRAINT "user_personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_active_persona_id_fkey" FOREIGN KEY ("active_persona_id") REFERENCES "public"."user_personas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view community characters" ON "public"."community_characters" FOR SELECT USING (true);



CREATE POLICY "Anyone can view community scenes" ON "public"."community_scenes" FOR SELECT USING (true);



CREATE POLICY "Creators can insert community characters" ON "public"."community_characters" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Creators can insert community scenes" ON "public"."community_scenes" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Creators can update their community characters" ON "public"."community_characters" FOR UPDATE USING (("auth"."uid"() = "creator_user_id")) WITH CHECK (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Creators can update their community scenes" ON "public"."community_scenes" FOR UPDATE USING (("auth"."uid"() = "creator_user_id")) WITH CHECK (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Only creators can delete their community characters" ON "public"."community_characters" FOR DELETE USING (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Only creators can delete their community scenes" ON "public"."community_scenes" FOR DELETE USING (("auth"."uid"() = "creator_user_id"));



CREATE POLICY "Public characters are viewable by everyone" ON "public"."characters" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can access their own chat sessions" ON "public"."chat_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can access their own memories" ON "public"."character_memories" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can access their own relationships" ON "public"."character_relationships" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create imports" ON "public"."character_imports" FOR INSERT WITH CHECK (("auth"."uid"() = "imported_by_user_id"));



CREATE POLICY "Users can create reports" ON "public"."character_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_user_id"));



CREATE POLICY "Users can create their own characters" ON "public"."characters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own scenarios" ON "public"."scenarios" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own images" ON "public"."user_images" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own character session states" ON "public"."character_session_state" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own characters" ON "public"."characters" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own persona" ON "public"."user_personas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own scenarios" ON "public"."scenarios" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own scene comments" ON "public"."scene_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own settings" ON "public"."user_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own topic engagements" ON "public"."character_topic_engagement" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own character learning" ON "public"."character_learning" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own images" ON "public"."user_images" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own character session states" ON "public"."character_session_state" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own characters" ON "public"."characters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own persona" ON "public"."user_personas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own scenarios" ON "public"."scenarios" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own scene comments" ON "public"."scene_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own topic engagements" ON "public"."character_topic_engagement" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own hidden characters" ON "public"."hidden_default_characters" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own character learning" ON "public"."character_learning" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own images" ON "public"."user_images" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own character session states" ON "public"."character_session_state" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own characters" ON "public"."characters" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own persona" ON "public"."user_personas" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own scenarios" ON "public"."scenarios" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own scene comments" ON "public"."scene_comments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own topic engagements" ON "public"."character_topic_engagement" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view non-deleted scene comments" ON "public"."scene_comments" FOR SELECT USING (("is_deleted" = false));



CREATE POLICY "Users can view own character learning" ON "public"."character_learning" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own images" ON "public"."user_images" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their imports" ON "public"."character_imports" FOR SELECT USING (("auth"."uid"() = "imported_by_user_id"));



CREATE POLICY "Users can view their own character session states" ON "public"."character_session_state" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own characters" ON "public"."characters" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own persona" ON "public"."user_personas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reports" ON "public"."character_reports" FOR SELECT USING (("auth"."uid"() = "reporter_user_id"));



CREATE POLICY "Users can view their own scenarios" ON "public"."scenarios" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own topic engagements" ON "public"."character_topic_engagement" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."character_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_learning" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_memories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_session_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_topic_engagement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_scenes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_models_delete_admin" ON "public"."custom_models" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_settings"
  WHERE (("user_settings"."user_id" = "auth"."uid"()) AND ("user_settings"."is_admin" = true)))));



CREATE POLICY "custom_models_insert_admin" ON "public"."custom_models" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_settings"
  WHERE (("user_settings"."user_id" = "auth"."uid"()) AND ("user_settings"."is_admin" = true)))));



CREATE POLICY "custom_models_select_active" ON "public"."custom_models" FOR SELECT USING (("is_active" = true));



CREATE POLICY "custom_models_update_admin" ON "public"."custom_models" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_settings"
  WHERE (("user_settings"."user_id" = "auth"."uid"()) AND ("user_settings"."is_admin" = true)))));



ALTER TABLE "public"."hidden_default_characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scene_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_personas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_chat_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_chat_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_chat_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_memories"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_memories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_memories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_session_states"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_session_states"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_session_states"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_character_feedback_stats"("p_character_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_character_feedback_stats"("p_character_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_character_feedback_stats"("p_character_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_character_relationships"("p_character_id" "text", "p_user_id" "uuid", "p_target_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_character_relationships"("p_character_id" "text", "p_user_id" "uuid", "p_target_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_character_relationships"("p_character_id" "text", "p_user_id" "uuid", "p_target_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_decrypted_api_keys"("p_user_id" "uuid", "p_encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_decrypted_api_keys"("p_user_id" "uuid", "p_encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_decrypted_api_keys"("p_user_id" "uuid", "p_encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_characters"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_characters"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_characters"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_tags"("tag_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_tags"("tag_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_tags"("tag_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_access_count"("memory_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_character_views"("character_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_character_views"("character_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_character_views"("character_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_message_count"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_message_count"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_message_count"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_scenario_views"("scenario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_scenario_views"("scenario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_scenario_views"("scenario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_published_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_published_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_published_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_character_learning_pattern"("p_character_id" character varying, "p_learning_type" character varying, "p_pattern_data" "jsonb", "p_confidence_adjustment" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."update_character_learning_pattern"("p_character_id" character varying, "p_learning_type" character varying, "p_pattern_data" "jsonb", "p_confidence_adjustment" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_character_learning_pattern"("p_character_id" character varying, "p_learning_type" character varying, "p_pattern_data" "jsonb", "p_confidence_adjustment" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_import_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_import_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_import_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_memory_importance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_memory_importance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_memory_importance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."character_relationships" TO "anon";
GRANT ALL ON TABLE "public"."character_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."character_relationships" TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_bot_relationship"("p_character_id" "text", "p_user_id" "uuid", "p_target_character_id" "text", "p_relationship_type" character varying, "p_trust_level" double precision, "p_familiarity_level" double precision, "p_emotional_bond" double precision, "p_custom_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_bot_relationship"("p_character_id" "text", "p_user_id" "uuid", "p_target_character_id" "text", "p_relationship_type" character varying, "p_trust_level" double precision, "p_familiarity_level" double precision, "p_emotional_bond" double precision, "p_custom_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_bot_relationship"("p_character_id" "text", "p_user_id" "uuid", "p_target_character_id" "text", "p_relationship_type" character varying, "p_trust_level" double precision, "p_familiarity_level" double precision, "p_emotional_bond" double precision, "p_custom_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid", "p_mood" character varying, "p_intensity" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid", "p_mood" character varying, "p_intensity" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_character_mood"("p_character_id" "text", "p_session_id" "text", "p_user_id" "uuid", "p_mood" character varying, "p_intensity" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_encrypted_api_keys"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_encrypted_api_keys"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_encrypted_api_keys"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_ollama_settings" "jsonb", "p_group_dynamics_mode" character varying, "p_message_delay" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_ollama_settings" "jsonb", "p_group_dynamics_mode" character varying, "p_message_delay" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_api_keys" "jsonb", "p_ollama_settings" "jsonb", "p_group_dynamics_mode" character varying, "p_message_delay" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_character_for_publish"("char_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_character_for_publish"("char_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_character_for_publish"("char_id" "uuid") TO "service_role";



























GRANT ALL ON TABLE "public"."character_comments" TO "anon";
GRANT ALL ON TABLE "public"."character_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."character_comments" TO "service_role";



GRANT ALL ON TABLE "public"."character_favorites" TO "anon";
GRANT ALL ON TABLE "public"."character_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."character_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."character_imports" TO "anon";
GRANT ALL ON TABLE "public"."character_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."character_imports" TO "service_role";



GRANT ALL ON TABLE "public"."character_learning" TO "anon";
GRANT ALL ON TABLE "public"."character_learning" TO "authenticated";
GRANT ALL ON TABLE "public"."character_learning" TO "service_role";



GRANT ALL ON TABLE "public"."character_memories" TO "anon";
GRANT ALL ON TABLE "public"."character_memories" TO "authenticated";
GRANT ALL ON TABLE "public"."character_memories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."character_memories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."character_memories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."character_memories_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."character_relationships_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."character_relationships_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."character_relationships_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."character_reports" TO "anon";
GRANT ALL ON TABLE "public"."character_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."character_reports" TO "service_role";



GRANT ALL ON TABLE "public"."character_session_state" TO "anon";
GRANT ALL ON TABLE "public"."character_session_state" TO "authenticated";
GRANT ALL ON TABLE "public"."character_session_state" TO "service_role";



GRANT ALL ON TABLE "public"."character_topic_engagement" TO "anon";
GRANT ALL ON TABLE "public"."character_topic_engagement" TO "authenticated";
GRANT ALL ON TABLE "public"."character_topic_engagement" TO "service_role";



GRANT ALL ON TABLE "public"."characters" TO "anon";
GRANT ALL ON TABLE "public"."characters" TO "authenticated";
GRANT ALL ON TABLE "public"."characters" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."community_characters" TO "anon";
GRANT ALL ON TABLE "public"."community_characters" TO "authenticated";
GRANT ALL ON TABLE "public"."community_characters" TO "service_role";



GRANT ALL ON TABLE "public"."community_scenes" TO "anon";
GRANT ALL ON TABLE "public"."community_scenes" TO "authenticated";
GRANT ALL ON TABLE "public"."community_scenes" TO "service_role";



GRANT ALL ON TABLE "public"."custom_models" TO "anon";
GRANT ALL ON TABLE "public"."custom_models" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_models" TO "service_role";



GRANT ALL ON TABLE "public"."hidden_default_characters" TO "anon";
GRANT ALL ON TABLE "public"."hidden_default_characters" TO "authenticated";
GRANT ALL ON TABLE "public"."hidden_default_characters" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."moderation_queue" TO "anon";
GRANT ALL ON TABLE "public"."moderation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."moderation_queue" TO "service_role";



GRANT ALL ON TABLE "public"."scenarios" TO "anon";
GRANT ALL ON TABLE "public"."scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."scene_comments" TO "anon";
GRANT ALL ON TABLE "public"."scene_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."scene_comments" TO "service_role";



GRANT ALL ON TABLE "public"."user_images" TO "anon";
GRANT ALL ON TABLE "public"."user_images" TO "authenticated";
GRANT ALL ON TABLE "public"."user_images" TO "service_role";



GRANT ALL ON TABLE "public"."user_personas" TO "anon";
GRANT ALL ON TABLE "public"."user_personas" TO "authenticated";
GRANT ALL ON TABLE "public"."user_personas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_personas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_personas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_personas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

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



