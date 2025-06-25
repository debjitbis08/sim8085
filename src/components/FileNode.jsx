import { produce } from "solid-js/store";
import { setStore, store } from "../store/store.js";
import { FiEdit, FiEdit2, FiFile, FiFolder, FiTrash, FiTrash2 } from "solid-icons/fi";
import { createSignal } from "solid-js";

export function FileNode(props) {
    const [isRenaming, setIsRenaming] = createSignal(false);
    const [newFileName, setNewFileName] = createSignal(props.file.name);
    let filenameInputRef;

    const openFileDirect = () => {
        setStore(
            "activeFile",
            produce((activeFile) => {
                activeFile.name = props.file.name;
                activeFile.content = props.file.content;
                activeFile.workspaceItemId = props.file.id;
                activeFile.currentVersionId = props.file.currentVersionId;
                activeFile.unsavedChanges = false;
            }),
        );

        localStorage.setItem("activeFile", JSON.stringify(store.activeFile));
    };

    const openFile = () => {
        if (store.activeFile.workspaceItemId !== props.file.id && store.activeFile.unsavedChanges) {
            window.dispatchEvent(
                new CustomEvent("showUnsavedFileDialog", {
                    detail: {
                        onDiscard: openFileDirect,
                        onAfterSave: openFileDirect,
                    },
                }),
            );
            return;
        }

        openFileDirect();
    };

    const deleteFile = () => {
        if (props.onDelete) {
            props.onDelete(props.file.id);
        }
    };

    const renameFile = () => {
        if (props.onRename) {
            props.onRename(props.file.id, newFileName());
        }
    };

    const onFileInputKeyUp = (e) => {
        if (e.key === "Escape") {
            setIsRenaming(false);
        }

        if (e.key === "Enter" || e.type === "blur") {
            renameFile();
            setIsRenaming(false);
        }
    };

    return (
        <div
            onClick={openFile}
            class="flex items-center gap-1 cursor-pointer group hover:bg-active-background px-2 py-1"
        >
            <span class={`${store.activeFile.workspaceItemId === props.file.id ? "text-terminal" : ""}`}>
                <FiFile />
            </span>
            {!isRenaming() && (
                <span class="flex-grow overflow-hidden whitespace-nowrap text-ellipsis" title={props.file.name}>
                    {props.file.name}
                </span>
            )}
            {isRenaming() && (
                <div class={`${isRenaming() ? "flex" : "hidden"} items-center gap-1 text-sm px-2 py-1`}>
                    <input
                        type="text"
                        class="bg-main-background border border-main-border focus:border-primary-border rounded px-1 py-0 outline-0"
                        placeholder="filename"
                        value={newFileName()}
                        ref={filenameInputRef}
                        onKeyUp={onFileInputKeyUp}
                        onInput={(e) => setNewFileName(e.target.value)}
                    />
                </div>
            )}
            <span class={`${isRenaming() ? "hidden" : "flex"} gap-2 text-sm`}>
                <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 cursor-pointer"
                    onClick={() => {
                        setIsRenaming(true);
                        filenameInputRef.focus();
                    }}
                >
                    <FiEdit class="text-inactive-foreground hover:text-active-foreground" />
                </button>
                <button type="button" class="opacity-0 group-hover:opacity-100 cursor-pointer" onClick={deleteFile}>
                    <FiTrash2 class="text-inactive-foreground hover:text-red-foreground" />
                </button>
            </span>
        </div>
    );
}
