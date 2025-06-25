import { onMount, createSignal } from "solid-js";
import { setStore, store } from "../store/store.js";
import { CodeMirror } from "./codemirror/CodeMirror.jsx";
import { produce } from "solid-js/store";
import { supabase } from "../lib/supabase.js";
import { VsLoading } from "solid-icons/vs";

export function CodingArea() {
    const [isLoading, setIsLoading] = createSignal(true);
    const [shareId, setShareId] = createSignal(null);

    const isShareMode = () => !!shareId();

    onMount(async () => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("share");
        setShareId(id);

        if (id) {
            const { data, error } = await supabase
                .from("shared_files")
                .select("name, content")
                .eq("share_id", id)
                .single();

            if (!error && data) {
                const parsed = JSON.parse(data.content);
                setStore("activeFile", {
                    name: data.name,
                    content: parsed.code,
                    workspaceItemId: null,
                    currentVersionId: null,
                    unsavedChanges: false,
                });
                localStorage.setItem("sharedFileTemp", JSON.stringify(store.activeFile));
            }
        } else {
            const savedFileStr = localStorage.getItem("activeFile");
            if (savedFileStr) {
                try {
                    const savedFile = JSON.parse(savedFileStr);
                    setStore("activeFile", savedFile);
                } catch {
                    /* ignore */
                }
            }
        }

        setIsLoading(false);
    });

    const handleContentChange = (newContent) => {
        setStore(
            "activeFile",
            produce((activeFile) => {
                if (!activeFile.unsavedChanges) {
                    activeFile.unsavedChanges = activeFile.content !== newContent;
                }
                activeFile.content = newContent;
            }),
        );

        if (store.assembled.length) {
            setStore("assembled", []);
        }

        const key = isShareMode() ? "sharedFileTemp" : "activeFile";
        localStorage.setItem(key, JSON.stringify(store.activeFile));
    };

    return (
        <div class="py-4 bg-main-background h-full relative">
            <CodeMirror value={store.activeFile.content} onChange={handleContentChange} readOnly={isShareMode()} />
            <div class={`${isLoading() ? "" : "hidden"} w-full h-full bg-main-background absolute left-0 top-0`}>
                <div class="flex items-center justify-center gap-2 pt-5">
                    <VsLoading class="animate-spin" />
                    <span class="text-inactive-foreground">Loading content...</span>
                </div>
            </div>
        </div>
    );
}
