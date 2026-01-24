import { supabase } from "../lib/supabase.js";

const TIER_CACHE_KEY = "userTierCache";
const TIER_CACHE_TTL_PLUS = 5 * 60 * 1000; // 5 mins
const TIER_CACHE_TTL_FREE = 5 * 60 * 1000; // 5 mins

export async function getUserTier({ forceRefresh = false } = {}) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { id: null, tier: "FREE" };
    }

    const cached = readTierFromCache();
    const now = Date.now();

    if (
        !forceRefresh &&
        cached &&
        cached.userId === user.id &&
        ((cached.tier === "PLUS" && now - cached.lastCheckedAt < TIER_CACHE_TTL_PLUS) ||
            (cached.tier === "FREE" && now - cached.lastCheckedAt < TIER_CACHE_TTL_FREE))
    ) {
        return { id: user.id, tier: cached.tier };
    }

    const { data, error } = await supabase
        .from("customers")
        .select("subscription_tier, subscription_expires_at")
        .eq("id", user.id)
        .single();

    if (error) throw new Error("Unable to fetch user's subscription tier.");

    let { subscription_tier, subscription_expires_at } = data;

    // downgrade if expired
    if (subscription_tier === "PLUS" && subscription_expires_at && new Date(subscription_expires_at) < new Date()) {
        await supabase
            .from("customers")
            .update({ subscription_tier: "FREE", subscription_expires_at: null })
            .eq("id", user.id);

        subscription_tier = "FREE";
    }

    writeTierToCache({ tier: subscription_tier, userId: user.id });

    return { id: user.id, tier: subscription_tier };
}

export async function getUserTierWithExpiry() {
    const { tier } = await getUserTier();
    const res = await supabase.from("customers").select("subscription_tier, subscription_expires_at").single();

    return {
        tier,
        subscription_expires_at: res.data?.subscription_expires_at ?? null,
    };
}

function readTierFromCache() {
    const raw = localStorage.getItem(TIER_CACHE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed.tier || !parsed.userId || !parsed.lastCheckedAt) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeTierToCache({ tier, userId }) {
    localStorage.setItem(
        TIER_CACHE_KEY,
        JSON.stringify({
            tier,
            userId,
            lastCheckedAt: Date.now(),
        }),
    );
}
