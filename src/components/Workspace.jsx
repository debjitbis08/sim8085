import { createSignal, onMount, onCleanup } from "solid-js";
import { getUser, supabase } from "../lib/supabase.js";
import { getUserTier } from "../lib/subscription.js";
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
        const { id, tier } = await getUserTier();

        if (!id) {
            setNoSession(true);
            return null;
        }

        setTier(tier);

        return { id, tier };
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

            if (!userId) {
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
                        <span class="text-lg">Save Your Work</span>
                    </h2>
                    <p class="mt-4" style={{ "line-height": "1.7rem" }}>
                        <strong>Login to start saving files.</strong> You can save up to <strong>5 files</strong> with a
                        free account.
                    </p>
                    <p class="mt-4 text-sm">It's quick and free, no email verification required.</p>
                    <div class="mt-6">
                        <a class="rounded bg-terminal hover:bg-terminal-700 px-4 py-2 w-full text-white" href="/login/">
                            Log In
                        </a>
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
