// @ts-check
import jwt from "jsonwebtoken";
import { SUPABASE_JWT_SECRET } from "astro:env/server";

function getToken(request) {
    let token = null;
    const auth = request.headers.get("authorization");
    if (auth && auth.startsWith("Bearer ")) {
        token = auth.slice(7);
    }
    if (!token) {
        const url = new URL(request.url);
        token = url.searchParams.get("access_token");
    }
    return token;
}

export async function getUserFromRequest(request) {
    if (!SUPABASE_JWT_SECRET) return { user: null, error: new Error("Supabase not configured") };

    const token = getToken(request);
    if (!token) {
        return { user: null, error: new Error("Missing access token") };
    }
    try {
        const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
        return { user: payload, error: null };
    } catch (error) {
        return { user: null, error };
    }
}
