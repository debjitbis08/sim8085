import { OPENAI_API_KEY } from "astro:env/server";
import { getUserFromRequest } from "../../lib/supabase-server.js";

export const prerender = false;

const requestCounts = new Map();

export async function POST({ request }) {
    const apiKey = OPENAI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "local";
    const now = Date.now();
    const timestamps = requestCounts.get(ip) || [];
    // Keep only entries within the last minute
    const WINDOW_MS = 60_000;
    const LIMIT = 20; // generous limit for legitimate use
    const recent = timestamps.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    requestCounts.set(ip, recent);
    if (recent.length > LIMIT) {
        return new Response(JSON.stringify({ error: "Too many requests, please slow down." }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        const { code, error } = await request.json();
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an 8085 assembler expert helping users understand errors.",
                    },
                    { role: "user", content: `Code:\n${code}\n\nError: ${error}` },
                ],
            }),
        });
        const data = await res.json();
        return new Response(JSON.stringify({ explanation: data.choices?.[0]?.message?.content ?? "" }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to fetch explanation" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
