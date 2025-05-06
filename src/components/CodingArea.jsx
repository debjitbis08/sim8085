import { onMount } from "solid-js";
import { INITIAL_CODE, setStore, store } from "../store/store.js";
import { CodeMirror } from "./codemirror/CodeMirror.jsx";

export function CodingArea() {
    onMount(() => {
        const savedFileStr = localStorage.getItem("activeFile");

        if (savedFileStr) {
            const savedFile = JSON.parse(savedFileStr);
            setStore("activeFile", savedFile);
        } else {
            const mainAsmCode = localStorage.getItem("main.asm");
            setStore("activeFile", {
                name: "untitled-1.asm",
                workspaceItemId: null,
                content: mainAsmCode || INITIAL_CODE,
            });
            localStorage.setItem("activeFile", JSON.stringify(store.activeFile));
            if (mainAsmCode) {
                localStorage.removeItem("main.asm");
            }
        }
    });

    const handleContentChange = (newContent) => {
        setStore("activeFile", "content", newContent);
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
