import { createSignal, onMount, onCleanup } from "solid-js";
import { supabase } from "../lib/supabase.js";
import { v7 as uuidv7 } from "uuid";
import { WorkspaceTree } from "./WorkspaceTree.jsx";
import { store, setStore } from "../store/store.js";
import { FaSolidLock } from "solid-icons/fa";

export default function Workspace() {
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal(null);
    const [noSession, setNoSession] = createSignal(false);
    const [tier, setTier] = createSignal("FREE");
    const [userId, setUserId] = createSignal(null);

    async function fetchUserId() {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error && error.name === "AuthSessionMissingError") {
            setNoSession(true);
            return null;
        }

        if (error || user == null) throw new Error("Unable to fetch user ID");

        const { data: tier, error: tierFetchError } = await supabase
            .from("customers")
            .select("subscription_tier")
            .eq("id", user?.id)
            .single();

        if (tierFetchError) throw new Error("Unable to fetch user's subscription tier.");

        setTier(tier.subscription_tier);

        return { id: user?.id, tier: tier.subscription_tier };
    }

    async function createWorkspace(userId) {
        try {
            setLoading(true);

            // Step 1: Create a new workspace_item for the home folder
            const { data: workspaceItem, error: workspaceItemError } = await supabase
                .from("workspace_items")
                .insert([
                    {
                        id: uuidv7(),
                        name: "Home",
                        status_id: "ACTIVE", // Replace with the correct status_id
                        user_id: userId,
                        parent_folder_id: null, // No parent folder since this is the root
                    },
                ])
                .select()
                .single();

            if (workspaceItemError) throw workspaceItemError;

            // Step 2: Create a folder referencing the workspace_item
            const { data: folder, error: folderError } = await supabase
                .from("folders")
                .insert([{ id: workspaceItem.id }])
                .select()
                .single();

            if (folderError) throw folderError;

            // Step 3: Create the workspace referencing the folder
            const { data: workspace, error: workspaceError } = await supabase
                .from("workspaces")
                .insert([{ user_id: userId, home_folder_id: folder.id }])
                .select()
                .single();

            if (workspaceError) throw workspaceError;

            // Save the home folder ID
            setStore("homeFolderId", folder.id);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function getOrCreateWorkspace() {
        try {
            const { id: userId, tier } = (await fetchUserId()) || { id: null, tier: "FREE" };

            if (!userId || tier === "FREE") {
                setLoading(false);
                return;
            }

            setUserId(userId);

            // Step 1: Try to fetch the workspace for the current user
            const { data, error } = await supabase
                .from("workspaces")
                .select("home_folder_id")
                .eq("user_id", userId)
                .single();

            if (error && error.code !== "PGRST116") throw error; // Ignore "row not found" errors

            if (data) {
                // Workspace exists
                setStore("homeFolderId", data.home_folder_id);
            } else {
                // Workspace does not exist; create it
                await createWorkspace(userId);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    onMount(() => {
        setLoading(true);
        getOrCreateWorkspace();
    });

    const openPlusDialog = () => {
        window.dispatchEvent(
            new CustomEvent("showPlusDialog", {
                detail: {},
            }),
        );
    };

    return (
        <div class="">
            {loading() && <p>Loading...</p>}
            {error() && !noSession() && <p>Error: {error()}</p>}
            {!loading() && noSession() && (
                <div class="workspace-placeholder p-2">
                    <h2 class="flex items-center gap-2">
                        <FaSolidLock class="text-yellow-foreground stroke-2 text-xl" />
                        <span class="text-lg">Unlock your Workspace</span>
                    </h2>
                    <p class="mt-4" style={{ "line-height": "1.7rem" }}>
                        With the <span class="bg-yellow-foreground text-black px-2 rounded-sm inline-block">Plus</span>{" "}
                        plan.
                    </p>
                    <p class="mt-4 text-sm">
                        Log in to access and purchase the one-time Plus plan to access these features.
                    </p>
                    <div class="mt-6">
                        <button
                            type="button"
                            class="rounded bg-terminal hover:bg-terminal-700 p-2 w-full text-white"
                            onClick={openPlusDialog}
                        >
                            Know More
                        </button>
                    </div>
                </div>
            )}
            {!loading() && !error() && !noSession() && (
                <WorkspaceTree
                    folder={{ id: store.homeFolderId, parentFolderId: null, name: "Home", status_id: "ACTIVE" }}
                    userId={userId()}
                    tier={tier()}
                />
            )}
        </div>
    );
}
