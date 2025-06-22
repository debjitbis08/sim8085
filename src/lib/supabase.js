import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/client";

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export let supabase = null;

const initCallbacks = [];

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    initCallbacks.forEach((cb) => {
        cb();
    });
}

export const onInit = (fn) => {
    if (!supabase) {
        initCallbacks.push(fn);
    } else {
        fn();
    }
};

export const getUser = async () => {
    if (!supabase) return { user: null, error: new Error("Supabase is not initialized") };

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    return { user, error };
};

export const getSession = async () => {
    if (!supabase) return { session: null, error: new Error("Supabse is not initialized") };

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    return { session, error };
};

export const getUserFromSession = async () => {
    if (!supabase) return { user: null, error: new Error("Supabse is not initialized") };

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    return { user: session?.user, error };
};

export const signOut = async () => {
    if (supabase) {
        await supabase.auth.signOut();
    }
};
