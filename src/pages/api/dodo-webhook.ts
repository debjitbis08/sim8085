import type { APIRoute } from "astro";
import { createHmac } from "crypto";
import { supabaseAdminClient } from "../../lib/supabase-admin.js";
import { Webhook } from "standardwebhooks";
import { DODO_WEBHOOK_SECRET, DODO_PLUS_PRODUCT_ID } from "astro:env/server";

export const prerender = false;

const wh = new Webhook(DODO_WEBHOOK_SECRET);

export const POST: APIRoute = async ({ request }) => {
    if (!supabaseAdminClient) return new Response("No DB client", { status: 500 });
    if (!DODO_WEBHOOK_SECRET) return new Response("Secret missing", { status: 500 });

    const rawBody = await request.text();
    const headers = {
        "webhook-id": request.headers.get("webhook-id") || "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
        "webhook-signature": request.headers.get("webhook-signature") || "",
    };

    let payload;
    try {
        payload = wh.verify(rawBody, headers);
    } catch (err) {
        console.error("Signature verification failed:", err);
        return new Response("Invalid signature", { status: 401 });
    }

    if (payload.type !== "payment.succeeded" || payload.data.product_cart?.product_id !== DODO_PLUS_PRODUCT_ID) {
        return new Response("Ignored", { status: 200 });
    }

    const payment = payload.data;
    const email = payment.customer?.email || payment.email;
    if (!email) return new Response("Missing email", { status: 400 });

    const { data: user, error: userError } = await supabaseAdminClient
        .from("customers")
        .select("id")
        .eq("email", email)
        .single();

    if (userError || !user) {
        console.error("User not found:", userError);
        return new Response("User not found", { status: 404 });
    }

    // Update customer subscription
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months later

    const { error: updateError } = await supabaseAdminClient
        .from("customers")
        .update({
            subscription_tier: "PLUS",
            subscription_started_at: now.toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
        })
        .eq("id", user.id);

    if (updateError) {
        console.error("Failed to update subscription:", updateError);
        return new Response("Failed to upgrade user", { status: 500 });
    }

    return new Response("Success", { status: 200 });
};
