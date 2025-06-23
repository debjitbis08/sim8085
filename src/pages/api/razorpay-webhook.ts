import type { APIRoute } from "astro";
import { createHmac } from "crypto";
import { supabase } from "../../lib/supabase.js";
import { RAZORPAY_WEBHOOK_SECRET } from "astro:env/server";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    if (!supabase) {
        return new Response("supabase not initialized", { status: 500 });
    }

    if (!RAZORPAY_WEBHOOK_SECRET) {
        return new Response("Razorpay secret not available", { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Verify webhook signature
    const expectedSignature = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

    if (signature !== expectedSignature) {
        return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Only handle successful one-time payments
    if (payload.event !== "payment.captured") {
        return new Response("Event ignored", { status: 200 });
    }

    const payment = payload.payload.payment.entity;
    const email = payment.email;

    if (!email) {
        return new Response("Missing email in payment", { status: 400 });
    }

    // Lookup user by email
    const { data: user, error: userError } = await supabase.from("auth.users").select("id").eq("email", email).single();

    if (userError || !user) {
        console.error("User not found:", userError);
        return new Response("User not found", { status: 404 });
    }

    // Update customer subscription
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months later

    const { error: updateError } = await supabase
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
