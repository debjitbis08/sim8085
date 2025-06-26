import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    const country = request.headers.get("x-country") || "";
    return new Response(JSON.stringify({ country }), {
        headers: { "Content-Type": "application/json" },
    });
};
