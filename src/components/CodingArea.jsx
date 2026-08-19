import { onMount, onCleanup, createSignal } from "solid-js";
import { setStore, store } from "../store/store.js";
import { CodeMirror } from "./codemirror/CodeMirror.jsx";
import { produce } from "solid-js/store";
import { supabase } from "../lib/supabase.js";
import { VsLoading } from "solid-icons/vs";
import { getDraft, getSolution, saveDraft } from "../lib/practice/progress.js";

export function CodingArea(props) {
    const [isLoading, setIsLoading] = createSignal(true);
    const [shareId, setShareId] = createSignal(null);

    const isShareMode = () => !!shareId();
    // On a practice step the editor holds exercise work, not the learner's own
    // file. It is kept under its own key so opening a step never overwrites
    // whatever they had saved in the workspace.
    const isPracticeMode = () => !!props.practiceStepKey;

    const initialPracticeCode = () => {
        const draft = getDraft(props.practiceStepKey);
        if (draft != null) return draft;
        if (props.carryForwardFrom) {
            const previous = getSolution(props.carryForwardFrom);
            if (previous != null) return previous;
        }
        return props.starterCode ?? "";
    };

    onMount(async () => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("share");
        setShareId(id);

        if (props.practiceStepKey) {
            const seeded = initialPracticeCode();
            setStore("activeFile", {
                name: `${props.practiceStepKey.replace("/", "-")}.asm`,
                content: seeded,
                workspaceItemId: null,
                currentVersionId: null,
                unsavedChanges: false,
            });

            // Signing in can bring down work done on another device, but it
            // arrives after this first paint. Re-seed when it does, and only
            // while the editor still holds exactly what we put there — never
            // overwrite something the learner has started typing.
            const onProgressLoaded = () => {
                if (store.activeFile.content !== seeded) return;
                const better = initialPracticeCode();
                if (better !== seeded) setStore("activeFile", "content", better);
            };
            window.addEventListener("practice:progress-loaded", onProgressLoaded);
            onCleanup(() => window.removeEventListener("practice:progress-loaded", onProgressLoaded));

            setIsLoading(false);
            return;
        }

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

        if (isPracticeMode()) {
            saveDraft(props.practiceStepKey, newContent);
            return;
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
