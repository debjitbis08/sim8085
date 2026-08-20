-- Local development seed.
--
-- `supabase db pull` dumps schema only, so the reference tables that
-- production fills by hand come up empty locally. The sign-up trigger inserts
-- a customers row with subscription_tier 'FREE', which fails against an empty
-- subscription_tiers — meaning no local account can be created at all until
-- these rows exist. Everything here is configuration, not user data.
--
-- Run automatically by `supabase db reset`.

INSERT INTO public.subscription_tiers (id, name) VALUES
    ('FREE', 'Free'),
    ('PLUS', 'Plus')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.permissions (id, description) VALUES
    ('READ_WORKSPACE', 'Read the saved workspace'),
    ('CREATE_FILE',    'Create a file in the workspace'),
    ('CREATE_FOLDER',  'Create a folder in the workspace')
ON CONFLICT (id) DO NOTHING;

-- Free accounts may read and create files; folders are a Plus feature. The
-- per-tier file cap lives in the client (MAX_FREE_FILES), not in
-- configuration, so these rows carry no settings.
INSERT INTO public.tier_permissions (tier_id, permission_id) VALUES
    ('FREE', 'READ_WORKSPACE'),
    ('FREE', 'CREATE_FILE'),
    ('PLUS', 'READ_WORKSPACE'),
    ('PLUS', 'CREATE_FILE'),
    ('PLUS', 'CREATE_FOLDER')
ON CONFLICT (tier_id, permission_id) DO NOTHING;
