#!/usr/bin/env bash
#
# Run the Supabase CLI with this repo's credentials.
#
# `supabase login` stores a token machine-wide in ~/.supabase/access-token,
# which is shared by every project on the machine — so logging in for sim8085
# would clobber the credentials for any other Supabase project here. The CLI
# also reads SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD from the
# environment and prefers them over the stored token, so this wrapper loads
# them from the repo's gitignored .env instead. Nothing sim8085-specific ever
# leaves this directory.
#
# Put these in .env (all optional, add what a given command needs):
#
#   SUPABASE_PROJECT_REF=jwpolccmatwapeehcysw
#   SUPABASE_ACCESS_TOKEN=sbp_...      # from https://supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD=...           # database password, not the anon key
#
# Usage:
#   ./scripts/supabase.sh link --project-ref "$SUPABASE_PROJECT_REF"
#   ./scripts/supabase.sh db pull
#   ./scripts/supabase.sh db push
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$root/.env" ]; then
    # `set -a` exports everything the file defines, which is what the CLI reads.
    set -a
    # shellcheck disable=SC1091
    . "$root/.env"
    set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ ! -f "$HOME/.supabase/access-token" ]; then
    echo "No SUPABASE_ACCESS_TOKEN in $root/.env, and no machine-wide login." >&2
    echo "Create a token at https://supabase.com/dashboard/account/tokens and add it to .env." >&2
    echo "(Commands using --db-url do not need a token and can be run without one.)" >&2
fi

cd "$root"
exec supabase "$@"
