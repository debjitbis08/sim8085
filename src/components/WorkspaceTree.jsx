import { createSignal, onMount, onCleanup } from "solid-js";
import { supabase } from "../lib/supabase.js";
import { FolderNode } from "./FolderNode.jsx";
import { FileNode } from "./FileNode.jsx";
import { FiEdit, FiFile, FiFilePlus, FiFolder, FiFolderPlus, FiTrash2 } from "solid-icons/fi";
import { INITIAL_CODE, setStore, store } from "../store/store.js";
import { v7 as uuidv7, version } from "uuid";
import { FaRegularFolder, FaRegularFolderOpen } from "solid-icons/fa";
import { VsChevronDown, VsChevronRight, VsLoading } from "solid-icons/vs";
import { canCreateFile } from "../utils/fileSaveLimit.js";

export function WorkspaceTree(props) {
    const [folders, setFolders] = createSignal([]);
    const [files, setFiles] = createSignal([]);
    const [loading, setLoading] = createSignal(!props.folder.parentFolderId);
    const [error, setError] = createSignal(null);
    const [isCreatingFolder, setIsCreatingFolder] = createSignal(false);
    const [newFolderName, setNewFolderName] = createSignal("");
    const [newFileName, setNewFileName] = createSignal("");
    const [isCreatingFile, setIsCreatingFile] = createSignal(false);
    const [expanded, setExpanded] = createSignal(!props.folder.parentFolderId);
    const [isRenaming, setIsRenaming] = createSignal(false);
    const [renamedFolderName, setRenamedFolderName] = createSignal(props.folder.name);
    let folderInputRef;
    let folderRenameInputRef;
    let fileInputRef;

    const handleFileSaved = (event) => {
        const { workspaceItemId, content, currentVersionId } = event.detail;

        const file = files().find((file) => file.id === workspaceItemId && file.currentVersionId === currentVersionId);

        if (!file) return;

        file.content = content;
    };

    async function fetchFolderContents(folderId) {
        try {
            setLoading(true);

            const { data: folders, error: folderError } = await supabase
                .from("folders")
                .select(
                    `
                    id,
                    workspace_items:workspace_items!inner!folders_id_fkey (
                      name,
                      parent_folder_id,
                      created_at,
                      updated_at
                    )
                `,
                )
                .eq("workspace_items.parent_folder_id", folderId)
                .eq("workspace_items.status_id", "ACTIVE")
                .eq("workspace_items.user_id", props.userId);

            if (folderError) throw folderError;

            setFolders(
                folders.map((folder) => {
                    return {
                        id: folder.id,
                        name: folder.workspace_items.name,
                        parentFolderId: folder.workspace_items.parent_folder_id,
                    };
                }),
            );

            const { data: files, error: fileError } = await supabase
                .from("files")
                .select(
                    `
                    id,
                    workspace_items:workspace_items!inner!files_id_fkey (
                      name,
                      parent_folder_id,
                      created_at,
                      updated_at
                    ),
                    file_versions (
                      id,
                      content
                    )
                `,
                )
                .or(
                    `parent_folder_id.eq.${folderId}${store.homeFolderId === folderId ? ",parent_folder_id.is.null" : ""}`,
                    {
                        referencedTable: "workspace_items",
                    },
                )
                .eq("workspace_items.status_id", "ACTIVE")
                .eq("workspace_items.user_id", props.userId)
                .eq("file_versions.is_latest", true); // Get only the latest version

            if (fileError) throw fileError;

            setFiles(
                files.map((file) => ({
                    id: file.id,
                    name: file.workspace_items.name,
                    parentFolderId: file.workspace_items.parent_folder_id,
                    content: file.file_versions[0].content,
                    currentVersionId: file.file_versions[0].id,
                })),
            );
        } catch (err) {
            console.error(err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }

    const deleteFile = async (fileId) => {
        try {
            setLoading(true);
            await supabase
                .from("workspace_items")
                .update({ status_id: "DELETED" })
                .eq("id", fileId)
                .eq("user_id", props.userId);

            setFiles((files) => files.filter((file) => file.id !== fileId));
            setFolders((folders) => folders.filter((folder) => folder.id !== fileId));
        } catch (err) {
            console.error(err);
            // TODO Show alert
        } finally {
            setLoading(false);
        }
    };

    const renameItem = async (itemId, newName) => {
        try {
            setLoading(true);
            await supabase
                .from("workspace_items")
                .update({ name: newName })
                .eq("id", itemId)
                .eq("user_id", props.userId);

            setFiles((files) =>
                files.map((file) =>
                    file.id === itemId
                        ? {
                              ...file,
                              name: newName,
                          }
                        : file,
                ),
            );

            setFolders((folders) =>
                folders.map((folder) =>
                    folder.id === itemId
                        ? {
                              ...folder,
                              name: newName,
                          }
                        : folder,
                ),
            );

            if (store.activeFile.workspaceItemId === itemId) {
                setStore("activeFile", "name", newName);
            }
        } catch (err) {
            console.error(err);
            // TODO Show alert
        } finally {
            setLoading(false);
        }
    };

    onMount(async () => {
        async function refreshContents() {
            if (props.folder.id && !props.folder.parentFolderId) {
                await fetchFolderContents(props.folder.id);
            }
        }

        await refreshContents();

        window.addEventListener("fileSaved", handleFileSaved);
        window.addEventListener("newFileCreated", refreshContents);

        onCleanup(() => {
            window.removeEventListener("fileSaved", handleFileSaved);
            window.removeEventListener("newFileCreated", refreshContents);
        });
    });

    const createNewFolder = async () => {
        const workspaceItemId = uuidv7();
        const { error: folderCreateError } = await supabase.rpc("create_new_folder", {
            workspace_item_id: workspaceItemId,
            folder_name: newFolderName(),
            user_id: props.userId,
            parent_folder_id: props.folder.id || null,
        });

        if (folderCreateError) {
            throw new Error(`Error adding folder: ${folderCreateError.message}`);
        }

        setFolders((folders) => {
            return folders.concat({
                id: workspaceItemId,
                name: newFolderName(),
                parent_folder_id: props.folder.id,
            });
        });
        setIsCreatingFolder(false);
    };

    const createNewFile = async () => {
        const allowed = await canCreateFile(props.userId, props.tier);
        if (!allowed) {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: {},
                }),
            );
            return;
        }

        const workspaceItemId = uuidv7();
        const versionId = uuidv7();
        const { error: fileCreateError } = await supabase.rpc("create_new_file", {
            workspace_item_id: workspaceItemId,
            version_id: versionId,
            file_name: newFileName(),
            user_id: props.userId,
            parent_folder_id: props.folder.id || null,
            initial_content: INITIAL_CODE,
        });

        if (fileCreateError) {
            throw new Error(`Error adding folder: ${fileCreateError.message}`);
        }

        setFiles((files) => {
            return files.concat({
                id: workspaceItemId,
                name: newFileName(),
                currentVersionId: versionId,
                content: INITIAL_CODE,
                parent_folder_id: props.folder.id,
            });
        });
        setIsCreatingFile(false);
    };

    const onFolderInputKeyUp = (e) => {
        if (e.key === "Escape") {
            setIsCreatingFolder(false);
        }

        if (e.key === "Enter" || e.type === "blur") {
            createNewFolder();
        }
    };

    const onFolderRenameInputKeyUp = (e) => {
        if (e.key === "Escape") {
            setIsRenaming(false);
        }

        if (e.key === "Enter" || e.type === "blur") {
            renameItem(props.folder.id, renamedFolderName());
            setIsRenaming(false);
        }
    };

    function toggleExpand() {
        if (isRenaming()) return;

        if (!expanded()) {
            fetchFolderContents(props.folder.id);
        }
        setExpanded(!expanded());
    }

    const onFileInputKeyUp = (e) => {
        if (e.key === "Escape") {
            setIsCreatingFile(false);
        }

        if (e.key === "Enter" || e.type === "blur") {
            createNewFile();
        }
    };

    return (
        <div>
            {error() && <p>Error: {error()}</p>}
            {!error() && (
                <div>
                    {!props.folder.parentFolderId && (
                        <div class="flex items-center gap-2 mb-4 px-2">
                            <h3 class="text-lg text-secondary-foreground flex-grow">Your Files</h3>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    class="text-inactive-foreground hover:text-active-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatingFile(true);
                                        setExpanded(true);
                                        fileInputRef.focus();
                                    }}
                                >
                                    <FiFilePlus />
                                </button>
                                <button
                                    type="button"
                                    class="text-inactive-foreground hover:text-active-foreground"
                                    onClick={() => {
                                        setIsCreatingFolder(true);
                                        setExpanded(true);
                                        folderInputRef.focus();
                                    }}
                                >
                                    <FiFolderPlus />
                                </button>
                            </div>
                        </div>
                    )}
                    {props.folder.parentFolderId && (
                        <div
                            onClick={toggleExpand}
                            class="flex items-center gap-1 cursor-pointer group hover:bg-active-background px-2 py-1"
                        >
                            <span>
                                {loading() ? (
                                    <VsLoading class="animate-spin" />
                                ) : expanded() ? (
                                    <VsChevronDown />
                                ) : (
                                    <VsChevronRight />
                                )}
                            </span>
                            <span
                                class={`flex-grow overflow-hidden whitespace-nowrap text-ellipsis ${isRenaming() ? "hidden" : "inline"}`}
                                title={props.folder.name}
                            >
                                {props.folder.name}
                            </span>
                            <div class={`${isRenaming() ? "flex" : "hidden"} items-center gap-1 text-sm px-2 py-1`}>
                                <input
                                    type="text"
                                    class="bg-main-background border border-main-border focus:border-primary-border rounded px-1 py-0 outline-0"
                                    placeholder="Folder name"
                                    value={renamedFolderName()}
                                    ref={folderRenameInputRef}
                                    onKeyUp={onFolderRenameInputKeyUp}
                                    onInput={(e) => setRenamedFolderName(e.target.value)}
                                />
                            </div>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    class="opacity-0 group-hover:opacity-100 text-inactive-foreground hover:text-active-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatingFile(true);
                                        if (!expanded()) {
                                            fetchFolderContents(props.folder.id);
                                        }
                                        setExpanded(true);
                                        fileInputRef.focus();
                                    }}
                                >
                                    <FiFilePlus />
                                </button>
                                <button
                                    type="button"
                                    class="opacity-0 group-hover:opacity-100 text-inactive-foreground hover:text-active-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatingFolder(true);
                                        if (!expanded()) {
                                            fetchFolderContents(props.folder.id);
                                        }
                                        setExpanded(true);
                                        folderInputRef.focus();
                                    }}
                                >
                                    <FiFolderPlus />
                                </button>
                                <button
                                    type="button"
                                    class="opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                        setIsRenaming(true);
                                        filenameInputRef.focus();
                                    }}
                                >
                                    <FiEdit class="text-inactive-foreground hover:text-active-foreground" />
                                </button>
                                <button
                                    type="button"
                                    class="opacity-0 group-hover:opacity-100"
                                    onClick={() => deleteFile(props.folder.id)}
                                >
                                    <FiTrash2 class="text-inactive-foreground hover:text-red-foreground" />
                                </button>
                            </div>
                        </div>
                    )}
                    {expanded() && (
                        <div class={`${props.folder.parentFolderId ? "pl-4" : ""}`}>
                            <div
                                class={`${isCreatingFolder() ? "flex" : "hidden"} items-center gap-1 text-sm px-2 py-1`}
                            >
                                <FiFolder />
                                <input
                                    type="text"
                                    class="bg-main-background border border-main-border focus:border-primary-border rounded px-1 py-0 outline-0"
                                    placeholder="Folder name"
                                    value={newFolderName()}
                                    ref={folderInputRef}
                                    onKeyUp={onFolderInputKeyUp}
                                    onInput={(e) => setNewFolderName(e.target.value)}
                                />
                            </div>
                            <div class="text-sm">
                                {folders().map((folder) => (
                                    <WorkspaceTree
                                        folder={folder}
                                        userId={props.userId}
                                        tier={props.tier}
                                        key={folder.id}
                                    />
                                ))}
                            </div>
                            <div class={`${isCreatingFile() ? "flex" : "hidden"} items-center gap-1 text-sm px-2 py-1`}>
                                <FiFile />
                                <input
                                    type="text"
                                    class="bg-main-background border border-main-border focus:border-primary-border rounded px-1 py-0 outline-0"
                                    placeholder="File name"
                                    value={newFileName()}
                                    ref={fileInputRef}
                                    onKeyUp={onFileInputKeyUp}
                                    onInput={(e) => setNewFileName(e.target.value)}
                                />
                            </div>
                            <div class="text-sm">
                                {files().map((file) => (
                                    <FileNode key={file.id} file={file} onDelete={deleteFile} onRename={renameItem} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
