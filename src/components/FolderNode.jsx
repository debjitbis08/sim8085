import { createSignal } from "solid-js";
import { supabase } from "../lib/supabase.js";
import { FaRegularFolder, FaRegularFolderClosed, FaRegularFolderOpen } from "solid-icons/fa";
import { WorkspaceTree } from "./WorkspaceTree.jsx";

export function FolderNode(props) {
    const [children, setChildren] = createSignal([]);
    const [expanded, setExpanded] = createSignal(false);
    const [loading, setLoading] = createSignal(false);

    async function fetchFolderContents(folderId) {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("workspace_items")
                .select("id, name, parent_folder_id, status_id, created_at, updated_at")
                .eq("parent_folder_id", folderId);

            if (error) throw error;

            setChildren(data);
        } catch (err) {
            console.error("Error fetching folder contents:", err.message);
        } finally {
            setLoading(false);
        }
    }

    function toggleExpand() {
        if (!expanded()) {
            fetchFolderContents(props.folder.id);
        }
        setExpanded(!expanded());
    }

    return (
        <div>
            <div
                onClick={toggleExpand}
                class="flex items-center gap-1 cursor-pointer group hover:bg-active-background px-2 py-1"
            >
                <span>{expanded() ? <FaRegularFolderOpen /> : <FaRegularFolder />}</span>
                <span>{props.folder.name}</span>
            </div>
            {expanded() && (
                <div class="pl-2">
                    {loading() && <p>Loading...</p>}
                    <WorkspaceTree folder={props.folder} userId={props.userId} tier={props.tier} />
                </div>
            )}
        </div>
    );
}
