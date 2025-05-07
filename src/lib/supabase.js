import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const getUser = async () => {
    if (!supabase) return { user: null, error: new Error("Supabse is not initialized") };

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
