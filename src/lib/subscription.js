import { supabase } from "../lib/supabase.js";

export async function getUserTier() {
    if (!supabase) return { id: null, tier: "FREE" };

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error && error.name === "AuthSessionMissingError") {
        return { id: null, tier: "FREE" };
    }

    if (error || !user) throw new Error("Unable to fetch user ID");

    const { data, error: tierError } = await supabase
        .from("customers")
        .select("subscription_tier, tier_expires_at")
        .eq("id", user.id)
        .single();

    if (tierError) throw new Error("Unable to fetch user's subscription tier.");

    let { subscription_tier, tier_expires_at } = data;

    if (subscription_tier === "PLUS" && tier_expires_at && new Date(tier_expires_at) < new Date()) {
        await supabase.from("customers").update({ subscription_tier: "FREE", tier_expires_at: null }).eq("id", user.id);
        subscription_tier = "FREE";
    }

    return { id: user.id, tier: subscription_tier };
}
