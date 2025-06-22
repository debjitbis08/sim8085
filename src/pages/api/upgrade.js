import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { SUPABASE_URL } from "astro:env/client";

export const prerender = false;

function getRazorpay() {
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        return new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET,
        });
    }
    return null;
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST({ request }) {
    try {
        const { amount = 40000 } = await request.json();
        const razorpay = getRazorpay();
        if (!razorpay || !supabase) {
            return new Response(JSON.stringify({ error: "Razorpay or Supabase not configured" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
            });
        }
        const order = await razorpay.orders.create({ amount, currency: "INR" });
        return new Response(
            JSON.stringify({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: RAZORPAY_KEY_ID,
            }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function PUT({ request }) {
    try {
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
        if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new Response(JSON.stringify({ error: "Missing parameters" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        if (!RAZORPAY_KEY_SECRET || !supabase) {
            return new Response(JSON.stringify({ error: "Razorpay or Supabase not configured" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
            });
        }
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);

        const { error } = await supabase
            .from("customers")
            .update({ subscription_tier: "PLUS", tier_expires_at: expiresAt.toISOString() })
            .eq("id", userId);
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
