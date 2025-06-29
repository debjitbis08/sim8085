import { store, setStore, INITIAL_CODE } from "../store/store.js";
import { Tooltip } from "./generic/Tooltip.jsx";
import { FiSave, FiFilePlus } from "solid-icons/fi";
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

    const [isShareDialogOpen, setIsShareDialogOpen] = createSignal(false);
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
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: { reason: "notLoggedIn" },
                }),
            );
            return false;
        }

        const allowed = await canCreateFile(userId, tier);
        if (!allowed) {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: { reason: "notLoggedIn" },
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

    return (
        <>
            <div class={`flex items-center gap-2 ${noSession() ? "hidden" : ""}`}>
                <div class="flex items-center gap-1">
                    <span>{fileName()}</span>
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
                        onClick={() => setIsShareDialogOpen(true)}
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
                <div class="px-2 py-2 flex items-center gap-2 text-inactive-foreground hover:text-terminal text-[1.2rem] transition-colors">
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
