export const MAX_FREE_FILES = 5;

import { supabase } from "../lib/supabase.js";

export async function canCreateFile(userId, tier) {
    if (tier !== "FREE") return true;

    const { count, error } = await getFileCount(userId);

    if (error) {
        console.error("Error fetching file count:", error);
        return false;
    }

    return (count || 0) < MAX_FREE_FILES;
}

async function getFileCount(userId) {
    const { data, error } = await supabase.rpc("user_file_count", { uid: userId });

    if (error) {
        console.error("Error fetching file count via RPC:", error);
        return { data: null, error }; // or fallback value like 0
    }

    return { count: data, error: null };
}
