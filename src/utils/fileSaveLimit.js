export const MAX_FREE_FILES = 5;

import { supabase } from "../lib/supabase.js";

export async function canCreateFile(userId, tier) {
    if (tier !== "FREE") return true;

    const { count, error } = await supabase
        .from("files")
        .select("id", { count: "exact", head: true })
        .eq("workspace_items.user_id", userId)
        .eq("workspace_items.status_id", "ACTIVE");

    if (error) {
        console.error("Error fetching file count:", error);
        return false;
    }

    return (count || 0) < MAX_FREE_FILES;
}
