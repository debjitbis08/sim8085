import { createSignal, onMount, createMemo } from "solid-js";
import { setStore, store } from "../store/store.js";
import { CodeMirror } from "./codemirror/CodeMirror.jsx";
import { produce } from "solid-js/store";

export function CodingArea() {
    onMount(() => {
        const savedFileStr = localStorage.getItem("activeFile");
        if (savedFileStr) {
            try {
                const savedFile = JSON.parse(savedFileStr);
                setStore("activeFile", "name", savedFile.name);
            } catch {
                /* ignore */
            }
        }
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
        localStorage.setItem("activeFile", JSON.stringify(store.activeFile));
    };

    return (
        <div class="py-4 bg-main-background h-full">
            <CodeMirror value={store.activeFile.content} onChange={handleContentChange} />
        </div>
    );
}
