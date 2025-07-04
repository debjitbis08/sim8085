import { store, setStore, INITIAL_CODE } from "../store/store.js";
import { Tooltip } from "./generic/Tooltip.jsx";
import { supabase, getUser, onInit } from "../lib/supabase.js";
import { getUserTier } from "../lib/subscription.js";
import { v7 as uuidv7 } from "uuid";
import { createSignal, onMount, createEffect, onCleanup, Show } from "solid-js";
import { produce } from "solid-js/store";
import { Dialog } from "./generic/Dialog.jsx";
import { canCreateFile } from "../utils/fileSaveLimit.js";
import {
    FaSolidAsterisk,
    FaSolidCheck,
    FaSolidShareNodes,
    FaSolidShareFromSquare,
    FaSolidFileCirclePlus,
    FaSolidFloppyDisk,
    FaSolidXmark,
} from "solid-icons/fa";
import { createShortcut } from "@solid-primitives/keyboard";
import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 12);

export function FileActions() {
    const [noSession, setNoSession] = createSignal(true);
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);
    const [newFileName, setNewFileName] = createSignal(store.activeFile.name);
    const [isSaving, setIsSaving] = createSignal(false);
    const [isNoSessionDialogOpen, setIsNoSessionDialogOpen] = createSignal(false);

    const [isShareDialogOpen, setIsShareDialogOpen] = createSignal(false);
    const [isCantShareDialogOpen, setIsCantShareDialogOpen] = createSignal(false);
    const [shareId, setShareId] = createSignal(null);
    const [isShared, setIsShared] = createSignal(false);
    const [shareLink, setShareLink] = createSignal("");
    const [isSharing, setIsSharing] = createSignal(false);

    let resolveFileNamePromise = null;

    function getFileNameFromDialog(initialName) {
        setNewFileName(initialName);
        setIsDialogOpen(true);

        return new Promise((resolve) => {
            resolveFileNamePromise = resolve;
        });
    }

    onMount(async () => {
        onInit(async () => {
            const result = await getUser();

            const error = result.error;

            if (error && error.name === "AuthSessionMissingError") {
                setNoSession(true);
            } else {
                setNoSession(false);
            }
        });

        const saveEventHandler = async (e) => {
            const result = await saveFile();
            if (result && typeof e.detail?.afterSave === "function") {
                e.detail.afterSave();
            }
        };

        window.addEventListener("saveActiveFile", saveEventHandler);

        onCleanup(() => window.removeEventListener("saveActiveFile", saveEventHandler));
    });

    async function fetchUserId() {
        const { id, tier } = await getUserTier();

        if (!id) {
            setNoSession(true);
            return null;
        }

        return { id, tier };
    }

    const saveFile = async () => {
        const activeFile = store.activeFile;

        if (!activeFile) {
            console.error("No active file to save.");
            return false;
        }

        const { id: userId, tier } = (await fetchUserId()) || { id: null, tier: "FREE" };
        if (!userId) {
            setIsNoSessionDialogOpen(true);
            return false;
        }

        const allowed = await canCreateFile(userId, tier);
        if (!allowed) {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: { reason: "fileLimit" },
                }),
            );
            return false;
        }

        let isNew = false;
        if (activeFile.workspaceItemId === null) {
            // If it's a new file, open the dialog to get the file name
            // setIsDialogOpen(true);
            // return false;
            isNew = true;
            const fileName = await getFileNameFromDialog(activeFile.name);
            console.log("Got filename from dialog", fileName);
            if (!fileName) return false;

            setNewFileName(fileName); // Set again for safety
        }

        setIsSaving(true);
        await saveFileToSupabase(userId);
        setIsSaving(false);
        if (isNew) {
            window.dispatchEvent(
                new CustomEvent("newFileCreated", {
                    detail: {},
                }),
            );
        }
        return true;
    };

    async function createWorkspace(userId) {
        try {
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
        }
    }

    async function getOrCreateWorkspace() {
        try {
            const { id: userId, tier } = (await fetchUserId()) || { id: null, tier: "FREE" };

            if (!userId) {
                return;
            }

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
        }
    }

    const saveFileToSupabase = async (userId) => {
        const activeFile = store.activeFile;

        if (!activeFile) {
            console.error("No active file to save.");
            return;
        }

        if (!userId) {
            console.error("User is not authenticated.");
            return;
        }

        const workspaceItemId = activeFile.workspaceItemId || uuidv7(); // Generate a new ID if it's a new file

        try {
            if (!activeFile.workspaceItemId) {
                const temporaryName = store.activeFile.name;

                if (store.homeFolderId == null) {
                    getOrCreateWorkspace();
                }

                // New file: Create entries in `workspace_items` and `files`
                // Step 1: Insert into `workspace_items`
                const { error: workspaceError } = await supabase.from("workspace_items").insert([
                    {
                        id: workspaceItemId,
                        name: newFileName(),
                        status_id: "ACTIVE", // Replace with actual status
                        user_id: userId,
                        parent_folder_id: store.homeFolderId || null,
                    },
                ]);

                if (workspaceError) throw new Error(`Error inserting workspace item: ${workspaceError.message}`);

                // Step 2: Insert into `files`
                const newVersionId = uuidv7();
                const { error: fileError } = await supabase.from("files").insert([
                    {
                        id: workspaceItemId,
                    },
                ]);

                if (fileError) throw new Error(`Error inserting file: ${fileError.message}`);

                // Step 3: Insert into `file_versions` with content
                const { error: versionError } = await supabase.from("file_versions").insert([
                    {
                        id: newVersionId,
                        content: activeFile.content,
                        file_id: workspaceItemId,
                        is_latest: true,
                    },
                ]);

                if (versionError) throw new Error(`Error inserting file version: ${versionError.message}`);

                // Update store with new workspaceItemId
                setStore(
                    "activeFile",
                    produce((activeFile) => {
                        activeFile.name = newFileName();
                        activeFile.workspaceItemId = workspaceItemId;
                        activeFile.currentVersionId = newVersionId;
                    }),
                );

                localStorage.setItem("activeFile", JSON.stringify(store.activeFile));

                const temporaryNameMatch = temporaryName.match(/^untitled-(\d+).asm$/);
                if (Array.isArray(temporaryNameMatch) && temporaryNameMatch[1]) {
                    try {
                        const num = Number.parseInt(temporaryNameMatch[1], 10);
                        localStorage.setItem("untitledCounter", (num - 1).toString());
                    } catch (e) {
                        // Nothing
                    }
                }
            } else {
                // Existing file: Update the content of the current version
                const { error: updateVersionError } = await supabase
                    .from("file_versions")
                    .update({ content: activeFile.content })
                    .eq("id", activeFile.currentVersionId);

                if (updateVersionError) throw new Error(`Error updating file version: ${updateVersionError.message}`);
            }

            // TODO Show Alert
            window.dispatchEvent(
                new CustomEvent("fileSaved", {
                    detail: {
                        name: activeFile.name,
                        workspaceItemId: activeFile.workspaceItemId,
                        content: activeFile.content,
                        currentVersionId: activeFile.currentVersionId,
                    },
                }),
            );
            setStore("activeFile", "unsavedChanges", false);
            localStorage.setItem("activeFile", JSON.stringify(store.activeFile));
        } catch (error) {
            console.error("Error saving file:", error.message);
        }
    };

    const createNewFileDirect = () => {
        const counter = parseInt(localStorage.getItem("untitledCounter") || "1", 10) || 1;
        const newName = `untitled-${counter}.asm`;
        localStorage.setItem("untitledCounter", counter + 1);
        setStore("activeFile", {
            name: newName,
            workspaceItemId: null,
            currentVersionId: null,
            content: INITIAL_CODE,
            unsavedChanges: false,
        });
        localStorage.setItem("activeFile", JSON.stringify(store.activeFile));
        setFileName(newName);
        setNewFileName(newName);
    };

    const createNewFile = () => {
        if (store.activeFile.unsavedChanges) {
            window.dispatchEvent(
                new CustomEvent("showUnsavedFileDialog", {
                    detail: { onDiscard: createNewFileDirect, onAfterSave: createNewFileDirect },
                }),
            );
            return;
        }
        createNewFileDirect();
    };

    const handleDialogSave = async () => {
        const fileName = newFileName().trim();
        if (!fileName) {
            console.error("File name cannot be empty.");
            return;
        }

        resolveFileNamePromise?.(fileName);
        resolveFileNamePromise = null;
        setIsDialogOpen(false);
    };

    const tryShare = async () => {
        const { id: userId } = (await fetchUserId()) || { id: null };
        if (!userId || !store.activeFile.workspaceItemId) {
            setIsCantShareDialogOpen(true);
            return;
        }

        setIsShareDialogOpen(true);
    };

    const shareFile = async () => {
        setIsSharing(true);
        const { id: userId } = (await fetchUserId()) || { id: null };
        if (!userId || !store.activeFile.workspaceItemId) {
            setIsSharing(false);
            return;
        }

        const newShareId = uuidv7();
        const shareId = nanoid();
        const { error } = await supabase.from("shared_files").insert([
            {
                id: newShareId,
                share_id: shareId,
                content: JSON.stringify({
                    code: store.activeFile.content,
                }),
                name: store.activeFile.name,
                is_public: true,
                file_id: store.activeFile.workspaceItemId,
                owner_id: userId,
            },
        ]);

        if (!error) {
            setIsShared(true);
            setShareId(newShareId);
            setShareLink(`${window.location.origin}?share=${shareId}`);
        }
        setIsSharing(false);
        setIsShareDialogOpen(true);
    };

    const unshareFile = async () => {
        if (!shareId()) return;
        await supabase.from("shared_files").delete().eq("id", shareId());
        setIsShared(false);
        setShareId(null);
        setShareLink("");
        setIsShareDialogOpen(false);
    };

    const copyLink = async () => {
        if (!shareLink()) return;
        try {
            await navigator.clipboard.writeText(shareLink());
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const [fileName, setFileName] = createSignal("");

    createEffect(() => {
        setFileName(store.activeFile.name);

        if (store.activeFile.workspaceItemId) {
            supabase
                .from("shared_files")
                .select("id,share_id")
                .eq("file_id", store.activeFile.workspaceItemId)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        setIsShared(true);
                        setShareId(data.id);
                        setShareLink(`${window.location.origin}?share=${data.share_id}`);
                    } else {
                        setIsShared(false);
                        setShareId(null);
                        setShareLink("");
                    }
                });
        } else {
            setIsShared(false);
            setShareId(null);
            setShareLink("");
        }
    });

    createShortcut(["Control", "n"], createNewFile);
    createShortcut(["Control", "s"], saveFile);

    createEffect(() => {
        document.title = `${fileName()}${store.activeFile.unsavedChanges ? "*" : ""} - Sim8085`;
    });

    return (
        <>
            <div class={`flex items-center gap-2`}>
                <div class="flex items-center gap-1">
                    <span class="whitespace-nowrap overflow-ellipsis">{fileName()}</span>
                    <span
                        class={`${store.activeFile.unsavedChanges ? "" : "hidden"} text-[0.6rem] text-red-foreground`}
                    >
                        <FaSolidAsterisk />
                    </span>
                </div>
                <div class="flex">
                    <ActionButton
                        icon={<FaSolidFileCirclePlus class="" />}
                        title="New File"
                        shortcut="Ctrl + N"
                        onClick={createNewFile}
                        disabled={false}
                    />
                    <ActionButton
                        icon={<FaSolidFloppyDisk class="" />}
                        title="Save"
                        shortcut="Ctrl + S"
                        onClick={saveFile}
                        disabled={false}
                    />
                    <ActionButton
                        icon={isShared() ? <FaSolidCheck class="" /> : <FaSolidShareFromSquare class="" />}
                        title={isShared() ? "Shared" : "Share File"}
                        onClick={tryShare}
                        disabled={false}
                    />
                </div>
            </div>
            {/* Dialog for new file name */}
            <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
                <Dialog.Trigger class="hidden" />
                <Dialog.Portal>
                    <Dialog.Overlay class="dialog__overlay" />
                    <div class="dialog__positioner">
                        <Dialog.Content class="dialog__content">
                            <Dialog.Title class="dialog__title text-xl">Enter File Name</Dialog.Title>
                            <Dialog.Description class="dialog__description">
                                Please provide a name for your new file.
                                <input
                                    type="text"
                                    class="bg-main-background border border-main-border rounded px-3 py-2 w-full mt-4"
                                    placeholder="File name"
                                    value={newFileName()}
                                    onInput={(e) => setNewFileName(e.target.value)}
                                />
                                <div class="flex gap-2 justify-end mt-4">
                                    <button
                                        class="border border-secondary-border hover:bg-active-background px-4 py-2 cursor-pointer rounded"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        class="text-white rounded border border-green-foreground text-primary-foreground bg-terminal-700 hover:bg-terminal px-4 py-2"
                                        onClick={handleDialogSave}
                                        disabled={isSaving()}
                                    >
                                        Save
                                    </button>
                                </div>
                            </Dialog.Description>
                        </Dialog.Content>
                    </div>
                </Dialog.Portal>
            </Dialog>
            <Dialog open={isShareDialogOpen()} onOpenChange={setIsShareDialogOpen}>
                <Dialog.Trigger class="hidden" />
                <Dialog.Portal>
                    <Dialog.Overlay class="dialog__overlay" />
                    <div class="dialog__positioner">
                        <Dialog.Content class="dialog__content">
                            <Show
                                when={isShared()}
                                fallback={() => (
                                    <>
                                        <Dialog.Title class="dialog__title text-xl">Create Share Link</Dialog.Title>
                                        <Dialog.Description class="dialog__description">
                                            <div class="flex gap-2 justify-start mt-4">
                                                <button
                                                    class="border border-secondary-border hover:bg-active-background px-4 py-2 cursor-pointer rounded"
                                                    onClick={() => setIsShareDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    class="text-white rounded border border-green-foreground text-primary-foreground bg-green-foreground hover:bg-terminal px-4 py-2 cursor-pointer"
                                                    onClick={shareFile}
                                                    disabled={isSharing()}
                                                >
                                                    Share
                                                </button>
                                            </div>
                                        </Dialog.Description>
                                    </>
                                )}
                            >
                                <Dialog.Title class="dialog__title text-xl">Shared Link</Dialog.Title>
                                <Dialog.Description class="dialog__description">
                                    <input
                                        type="text"
                                        readonly
                                        class="bg-main-background border border-main-border rounded px-3 py-2 w-full mt-4"
                                        value={shareLink()}
                                    />
                                    <div class="flex gap-2 justify-start mt-4">
                                        <button
                                            class="border border-secondary-border hover:bg-active-background px-4 py-2 cursor-pointer rounded"
                                            onClick={copyLink}
                                        >
                                            Copy
                                        </button>
                                        <button
                                            class="text-white rounded border border-red-foreground text-primary-foreground bg-red-foreground hover:bg-flamingo-foreground px-4 py-2 cursor-pointer"
                                            onClick={unshareFile}
                                        >
                                            Unshare
                                        </button>
                                    </div>
                                </Dialog.Description>
                            </Show>
                        </Dialog.Content>
                    </div>
                </Dialog.Portal>
            </Dialog>
            <Dialog open={isCantShareDialogOpen()} onOpenChange={setIsCantShareDialogOpen}>
                <Dialog.Trigger class="hidden" />
                <Dialog.Portal>
                    <Dialog.Overlay class="dialog__overlay" />
                    <div class="dialog__positioner">
                        <Dialog.Content class="dialog__content h-auto!">
                            <Dialog.Title class="dialog__title text-xl font-semibold flex items-center gap-2">
                                <FaSolidFloppyDisk />
                                <span>Save First!</span>
                                <Dialog.CloseButton class="dialog__close-button ml-auto">
                                    <FaSolidXmark />
                                </Dialog.CloseButton>
                            </Dialog.Title>
                            <Dialog.Description class="dialog__description mt-2">
                                You need to <strong>save your file</strong> before sharing it with others.
                            </Dialog.Description>
                            <div class="flex justify-end mt-6">
                                <button
                                    class="cursor-pointer text-white rounded-md border border-terminal bg-terminal hover:bg-terminal-700 px-4 py-2 text-sm font-medium transition"
                                    onClick={() => setIsCantShareDialogOpen(false)}
                                >
                                    Got it!
                                </button>
                            </div>
                        </Dialog.Content>
                    </div>
                </Dialog.Portal>
            </Dialog>
            <Dialog open={isNoSessionDialogOpen()} onOpenChange={setIsNoSessionDialogOpen}>
                <Dialog.Trigger class="hidden" />
                <Dialog.Portal>
                    <Dialog.Overlay class="dialog__overlay" />
                    <div class="dialog__positioner">
                        <Dialog.Content class="dialog__content">
                            <Dialog.Description class="dialog__description">
                                <div class="p-4">
                                    <h2 class="text-2xl font-bold mb-4">Sign in to Save Your Work</h2>
                                    <p class="mb-8 text-secondary-foreground">
                                        You need to log in to save your code and access additional features.
                                    </p>
                                </div>
                                <div class="p-4">
                                    <a
                                        href="/login/"
                                        class="text-white border border-terminal bg-terminal hover:bg-terminal-700 rounded-lg px-8 py-4 font-bold text-lg"
                                    >
                                        Log In
                                    </a>
                                </div>
                            </Dialog.Description>
                        </Dialog.Content>
                    </div>
                </Dialog.Portal>
            </Dialog>
        </>
    );
}

function ActionButton(props) {
    return (
        <Tooltip>
            <Tooltip.Trigger
                class="tooltip__trigger rounded hover:bg-active-background border border-transparent hover:border-active-border cursor-pointer"
                onClick={props.onClick}
                disabled={props.disabled}
            >
                <div class="px-2 py-2 flex items-center gap-2 text-inactive-foreground hover:text-active-foreground text-[1.2rem] transition-colors">
                    {props.icon}
                </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="tooltip__content">
                    <Tooltip.Arrow />
                    <div class="flex items-center gap-2">
                        <p>{props.title}</p>
                        {props.shortcut ? (
                            <span class="text-xs bg-secondary-background py-1 px-2 rounded-sm">{props.shortcut}</span>
                        ) : null}
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}
