

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


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_create_file"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    has_create_file_permission boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.subscription_tiers st ON c.subscription_tier = st.id
        JOIN public.tier_permissions tp ON st.id = tp.tier_id
        WHERE c.id = user_id AND tp.permission_id = 'CREATE_FILE'
    ) INTO has_create_file_permission;

    RETURN has_create_file_permission;
END;$$;


ALTER FUNCTION "public"."can_create_file"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_folder"("user_id" "uuid", "new_folder_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    has_create_folder_permission boolean;
    is_home_folder boolean;
BEGIN
    -- Check if the new folder is a home folder
    SELECT EXISTS (
        SELECT 1
        FROM workspace_items wi
        WHERE wi.id = new_folder_id AND wi.parent_folder_id IS NULL
    ) INTO is_home_folder;

    IF is_home_folder THEN
        RETURN true;  -- Allow creation if it is a home folder
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.subscription_tiers st ON c.subscription_tier = st.id
        JOIN public.tier_permissions tp ON st.id = tp.tier_id
        WHERE c.id = user_id AND tp.permission_id = 'CREATE_FOLDER'
    ) INTO has_create_folder_permission;

    RETURN has_create_folder_permission;
END;$$;


ALTER FUNCTION "public"."can_create_folder"("user_id" "uuid", "new_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_workspace"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    has_read_workspace_permission boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.subscription_tiers st ON c.subscription_tier = st.id
        JOIN public.tier_permissions tp ON st.id = tp.tier_id
        WHERE c.id = user_id AND tp.permission_id = 'READ_WORKSPACE'
    ) INTO has_read_workspace_permission;

    RETURN has_read_workspace_permission;
END;$$;


ALTER FUNCTION "public"."can_read_workspace"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
    INSERT INTO public.customers (id, email, subscription_tier)
    VALUES (NEW.id, NEW.email, 'FREE'::text);
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."create_customer_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_file"("workspace_item_id" "uuid", "file_name" "text", "user_id" "uuid", "parent_folder_id" "uuid", "version_id" "uuid", "initial_content" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    -- Insert into workspace_items table
    INSERT INTO workspace_items (id, name, status_id, user_id, parent_folder_id)
    VALUES (workspace_item_id, file_name, 'ACTIVE', user_id, parent_folder_id);

    -- Insert into folders table
    INSERT INTO files (id)
    VALUES (workspace_item_id);

    INSERT INTO file_versions (id, file_id, content, is_latest)
    VALUES (version_id, workspace_item_id, initial_content, true);
END;$$;


ALTER FUNCTION "public"."create_new_file"("workspace_item_id" "uuid", "file_name" "text", "user_id" "uuid", "parent_folder_id" "uuid", "version_id" "uuid", "initial_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_folder"("workspace_item_id" "uuid", "folder_name" "text", "parent_folder_id" "uuid", "user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    -- Insert into workspace_items table
    INSERT INTO workspace_items (id, name, status_id, user_id, parent_folder_id)
    VALUES (workspace_item_id, folder_name, 'ACTIVE', user_id, parent_folder_id);

    -- Insert into folders table
    INSERT INTO folders (id)
    VALUES (workspace_item_id);
END;$$;


ALTER FUNCTION "public"."create_new_folder"("workspace_item_id" "uuid", "folder_name" "text", "parent_folder_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_folder"("folder_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM folders
        WHERE id = folder_id
    ) THEN
        RAISE EXCEPTION 'The provided ID does not correspond to a valid folder.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM workspace_items
        WHERE id = folder_id
          AND parent_folder_id IS NULL
    ) THEN
        RAISE EXCEPTION 'The Home folder cannot be deleted.';
    END IF;

  with recursive folder_tree as (
    select id
    from workspace_items 
    where id = folder_id
    union all
    select wi.id
    from workspace_items wi
    inner join folder_tree on wi.parent_folder_id = folder_tree.id
    where wi.status_id = 'ACTIVE'
  )

  UPDATE workspace_items
  SET status_id = 'DELETED'
  WHERE id IN (SELECT id FROM folder_tree);
END;$$;


ALTER FUNCTION "public"."delete_folder"("folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("permission_id" "text", "user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    has_permission_value boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.subscription_tiers st ON c.subscription_tier = st.id
        JOIN public.tier_permissions tp ON st.id = tp.tier_id
        WHERE c.id = user_id AND tp.permission_id = has_permission.permission_id
    ) INTO has_permission_value;

    RETURN has_permission_value;
END;$$;


ALTER FUNCTION "public"."has_permission"("permission_id" "text", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_file_count"("uid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$declare
  file_count integer;
begin
  select (
    select count(*)
    from workspace_items wi
    join files f on f.id = wi.id
    where wi.user_id = uid
      and wi.status_id = 'ACTIVE'
  ) into file_count;

  return file_count;
end;$$;


ALTER FUNCTION "public"."user_file_count"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_file_count_old"("user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$declare
  file_count integer;
begin
  select (
    select count(*)
    from workspace_items wi
    join files f on f.id = wi.id
    where wi.user_id = user_file_count.user_id
      and wi.status_id = 'ACTIVE'
  ) into file_count;

  return file_count;
end;$$;


ALTER FUNCTION "public"."user_file_count_old"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_tier"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    current_tier text;
BEGIN
    SELECT subscription_tier INTO current_tier
    FROM public.customers
    WHERE id = user_id;

    IF current_tier IS NULL THEN
        RETURN 'FREE';
    END IF;

    RETURN current_tier;
END;$$;


ALTER FUNCTION "public"."user_tier"("user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" NOT NULL,
    "subscription_tier" "text" DEFAULT 'FREE'::"text" NOT NULL,
    "subscription_expires_at" timestamp with time zone,
    "subscription_started_at" timestamp with time zone DEFAULT "now"(),
    "last_payment_id" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_versions" (
    "id" "uuid" NOT NULL,
    "content" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_id" "uuid" NOT NULL,
    "is_latest" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."file_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" NOT NULL
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" NOT NULL
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."license_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "subscription_tier" "text" NOT NULL,
    "is_redeemed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" NOT NULL
);


ALTER TABLE "public"."license_codes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."license_codes"."code" IS 'The license code';



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS 'List of all permissions that can be configured';



CREATE TABLE IF NOT EXISTS "public"."shared_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "share_id" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "name" "text" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "file_id" "uuid" NOT NULL,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shared_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_tiers" (
    "id" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tier_permissions" (
    "tier_id" "text" NOT NULL,
    "permission_id" "text" NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tier_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."tier_permissions" IS 'Permissions configuration for tier';



CREATE TABLE IF NOT EXISTS "public"."workspace_item_statuses" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."workspace_item_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_items" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_folder_id" "uuid"
);


ALTER TABLE "public"."workspace_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "user_id" "uuid" NOT NULL,
    "home_folder_id" "uuid" NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "file_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_versions"
    ADD CONSTRAINT "file_version_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license_codes"
    ADD CONSTRAINT "license_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."license_codes"
    ADD CONSTRAINT "license_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_share_id_key" UNIQUE ("share_id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tier_permissions"
    ADD CONSTRAINT "tier_permissions_pkey" PRIMARY KEY ("tier_id", "permission_id");



ALTER TABLE ONLY "public"."workspace_items"
    ADD CONSTRAINT "workspace_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_item_statuses"
    ADD CONSTRAINT "workspace_item_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspace_pkey" PRIMARY KEY ("user_id");



CREATE OR REPLACE TRIGGER "update_shared_files_updated_at" BEFORE UPDATE ON "public"."shared_files" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workspace_items_updated_at" BEFORE UPDATE ON "public"."workspace_items" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_subscription_tier_fkey" FOREIGN KEY ("subscription_tier") REFERENCES "public"."subscription_tiers"("id");



ALTER TABLE ONLY "public"."file_versions"
    ADD CONSTRAINT "file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."workspace_items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."workspace_items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."license_codes"
    ADD CONSTRAINT "license_codes_subscription_tier_fkey" FOREIGN KEY ("subscription_tier") REFERENCES "public"."subscription_tiers"("id");



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tier_permissions"
    ADD CONSTRAINT "tier_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id");



ALTER TABLE ONLY "public"."tier_permissions"
    ADD CONSTRAINT "tier_permissions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id");



ALTER TABLE ONLY "public"."workspace_items"
    ADD CONSTRAINT "workspace_item_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."workspace_item_statuses"("id");



ALTER TABLE ONLY "public"."workspace_items"
    ADD CONSTRAINT "workspace_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_items"
    ADD CONSTRAINT "workspace_items_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspace_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_home_folder_id_fkey" FOREIGN KEY ("home_folder_id") REFERENCES "public"."folders"("id");



CREATE POLICY "Authenticated users can read their items" ON "public"."workspace_items" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can read their own files if subscription_ti" ON "public"."files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "files"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can read their own folders" ON "public"."folders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "folders"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can read their own workspace" ON "public"."workspaces" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."shared_files" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."workspace_items" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."file_versions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."user_id" = "auth"."uid"()) AND ("wi"."id" = "file_versions"."file_id")))));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."shared_files" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."workspace_items" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."workspaces" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id and subscription tier" ON "public"."folders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "folders"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Enable insert for users based on user_id and subscription_tier" ON "public"."files" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "files"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."subscription_tiers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."tier_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."workspace_item_statuses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."shared_files" FOR SELECT USING (true);



CREATE POLICY "Enable update for users based on user id" ON "public"."shared_files" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Enable update for users based on user_id" ON "public"."file_versions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."user_id" = "auth"."uid"()) AND ("wi"."id" = "file_versions"."file_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."user_id" = "auth"."uid"()) AND ("wi"."id" = "file_versions"."file_id")))));



CREATE POLICY "Enable update for users based on user_id" ON "public"."workspace_items" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable update for users based on user_id and subscription_tier" ON "public"."files" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "files"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."id" = "files"."id") AND ("wi"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Enable users to view their own data only" ON "public"."customers" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."file_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_items" "wi"
  WHERE (("wi"."user_id" = "auth"."uid"()) AND ("wi"."id" = "file_versions"."file_id")))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."license_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_item_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";























































































































































































GRANT ALL ON FUNCTION "public"."can_create_file"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_file"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_file"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_folder"("user_id" "uuid", "new_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_folder"("user_id" "uuid", "new_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_folder"("user_id" "uuid", "new_folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_workspace"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_workspace"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_workspace"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_customer_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_customer_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_customer_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_file"("workspace_item_id" "uuid", "file_name" "text", "user_id" "uuid", "parent_folder_id" "uuid", "version_id" "uuid", "initial_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_file"("workspace_item_id" "uuid", "file_name" "text", "user_id" "uuid", "parent_folder_id" "uuid", "version_id" "uuid", "initial_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_file"("workspace_item_id" "uuid", "file_name" "text", "user_id" "uuid", "parent_folder_id" "uuid", "version_id" "uuid", "initial_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_folder"("workspace_item_id" "uuid", "folder_name" "text", "parent_folder_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_folder"("workspace_item_id" "uuid", "folder_name" "text", "parent_folder_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_folder"("workspace_item_id" "uuid", "folder_name" "text", "parent_folder_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_folder"("folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_folder"("folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_folder"("folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("permission_id" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_id" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_id" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_file_count"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_file_count"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_file_count"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_file_count_old"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_file_count_old"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_file_count_old"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_tier"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_tier"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_tier"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."file_versions" TO "anon";
GRANT ALL ON TABLE "public"."file_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."file_versions" TO "service_role";



GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."license_codes" TO "anon";
GRANT ALL ON TABLE "public"."license_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."license_codes" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."shared_files" TO "anon";
GRANT ALL ON TABLE "public"."shared_files" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_files" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_tiers" TO "anon";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."tier_permissions" TO "anon";
GRANT ALL ON TABLE "public"."tier_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."tier_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_item_statuses" TO "anon";
GRANT ALL ON TABLE "public"."workspace_item_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_item_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_items" TO "anon";
GRANT ALL ON TABLE "public"."workspace_items" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_items" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
































-- Added by hand after `supabase db diff --linked` reported it missing.
--
-- `supabase db pull` dumps the `public` schema only, so it captured
-- `public.create_customer_entry()` but not the trigger that fires it, which is
-- an object on `auth.users`. Without this, a database rebuilt from these
-- migrations creates the `customers` table and the function but never runs it:
-- new sign-ups get no `customers` row, and `getUserTier()` fails on `.single()`.
CREATE OR REPLACE TRIGGER "after_user_insert"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."create_customer_entry"();
