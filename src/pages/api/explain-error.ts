import { OPENAI_API_KEY } from "astro:env/server";
import { getUserFromRequest } from "../../lib/supabase-server.js";
import { openAiErrorMessage } from "../../lib/openai-errors.js";

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
                model: "gpt-5.5",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an 8085 assembler expert helping users understand errors. " +
                            "Explain the cause, then give a concrete fix. " +
                            "Use markdown, with assembly in fenced code blocks. Keep it under 150 words.",
                    },
                    { role: "user", content: `Code:\n${code}\n\nError: ${error}` },
                ],
            }),
        });
        const data = await res.json();

        if (!res.ok) {
            console.error("OpenAI error", res.status, data?.error?.code, data?.error?.message);
            return new Response(JSON.stringify({ error: openAiErrorMessage(res.status, data?.error?.code) }), {
                status: 502,
                headers: { "Content-Type": "application/json" },
            });
        }

        const explanation = data.choices?.[0]?.message?.content ?? "";
        if (!explanation) {
            console.error("OpenAI returned no explanation", JSON.stringify(data).slice(0, 500));
            return new Response(JSON.stringify({ error: "AI returned an empty response. Please try again." }), {
                status: 502,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ explanation }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Failed to fetch explanation", err);
        return new Response(JSON.stringify({ error: "Failed to fetch explanation" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
