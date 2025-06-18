import { store, setStore } from "../store/store.js";
import { Tooltip } from "./generic/Tooltip.jsx";
import { FiSave } from "solid-icons/fi";
import { supabase, getUser, onInit } from "../lib/supabase.js";
import { v7 as uuidv7 } from "uuid";
import { createSignal, onMount } from "solid-js";
import { produce } from "solid-js/store";
import { Dialog } from "./generic/Dialog.jsx";

export function FileActions() {
    const [noSession, setNoSession] = createSignal(true);
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);
    const [newFileName, setNewFileName] = createSignal(store.activeFile.name);
    const [isSaving, setIsSaving] = createSignal(false);

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
    });

    async function fetchUserId() {
        const result = await getUser();

        const user = result.user;
        const error = result.error;

        if (error && error.name === "AuthSessionMissingError") {
            setNoSession(true);
            return null;
        }

        if (error || user == null) throw new Error("Unable to fetch user ID");

        const { data: tier, error: tierFetchError } = await supabase
            .from("customers")
            .select("subscription_tier")
            .eq("id", user?.id)
            .single();

        if (tierFetchError) throw new Error("Unable to fetch user's subscription tier.");

        return { id: user?.id, tier: tier.subscription_tier };
    }

    const saveFile = async () => {
        const activeFile = store.activeFile;

        if (!activeFile) {
            console.error("No active file to save.");
            return;
        }

        const { id: userId, tier } = (await fetchUserId()) || { id: null, tier: "FREE" };
        if (!userId || tier === "FREE") {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: {},
                }),
            );
            return;
        }

        if (activeFile.workspaceItemId === null) {
            // If it's a new file, open the dialog to get the file name
            setIsDialogOpen(true);
            return;
        }

        await saveFileToSupabase(userId);
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
        } catch (error) {
            console.error("Error saving file:", error.message);
        }
    };

    const handleDialogSave = async () => {
        const fileName = newFileName().trim();
        if (!fileName) {
            console.error("File name cannot be empty.");
            return;
        }

        const { userId, tier } = await fetchUserId();
        if (!userId || tier === "FREE") {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: {},
                }),
            );
            return;
        }

        setIsSaving(true);
        await saveFileToSupabase(userId);
        setIsDialogOpen(false);
    };

    return (
        <>
            <div class={`flex items-center gap-2 ${noSession() ? "hidden" : ""}`}>
                <div>{store.activeFile.name}</div>
                <div class="flex">
                    <ActionButton
                        icon={<FiSave class="text-terminal" />}
                        title="Save"
                        shortcut="Ctrl + S"
                        onClick={saveFile}
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
        </>
    );
}

function ActionButton(props) {
    return (
        <Tooltip>
            <Tooltip.Trigger
                class="tooltip__trigger rounded hover:bg-active-background border border-transparent hover:border-active-border"
                onClick={props.onClick}
                disabled={props.disabled}
            >
                <div class="px-2 py-2 flex items-center gap-2 text-gray-600">{props.icon}</div>
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
