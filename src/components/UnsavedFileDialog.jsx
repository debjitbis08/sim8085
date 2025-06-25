import { Dialog } from "./generic/Dialog.jsx";
import { createSignal, onMount, onCleanup } from "solid-js";

export function UnsavedFileDialog() {
    const [open, setOpen] = createSignal(false);
    const [onDiscard, setOnDiscard] = createSignal(() => {});
    const [onAfterSave, setOnAfterSave] = createSignal(() => {});

    onMount(() => {
        const handler = (e) => {
            setOnDiscard(() => e.detail?.onDiscard || (() => {}));
            setOnAfterSave(() => e.detail?.onAfterSave || (() => {}));
            setOpen(true);
        };
        window.addEventListener("showUnsavedFileDialog", handler);
        onCleanup(() => window.removeEventListener("showUnsavedFileDialog", handler));
    });

    const discard = () => {
        onDiscard()();
        setOpen(false);
    };

    const saveAndContinue = () => {
        window.dispatchEvent(
            new CustomEvent("saveActiveFile", {
                detail: {
                    afterSave: () => {
                        setOpen(false);
                        onAfterSave()();
                    },
                },
            }),
        );
    };

    return (
        <Dialog open={open()} onOpenChange={setOpen}>
            <Dialog.Trigger class="hidden" />
            <Dialog.Portal>
                <Dialog.Overlay class="dialog__overlay" />
                <div class="dialog__positioner">
                    <Dialog.Content class="dialog__content">
                        <Dialog.Title class="dialog__title text-xl">Unsaved Changes</Dialog.Title>
                        <Dialog.Description class="dialog__description">
                            You have unsaved changes. Save the current file before continuing?
                            <div class="flex gap-2 justify-end mt-4">
                                <button
                                    class="border border-secondary-border hover:bg-active-background px-4 py-2 cursor-pointer rounded"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    class="border border-red-foreground text-red-foreground hover:bg-red-foreground hover:text-white px-4 py-2 rounded"
                                    onClick={discard}
                                >
                                    Discard
                                </button>
                                <button
                                    class="text-white rounded border border-green-foreground text-primary-foreground bg-terminal-700 hover:bg-terminal px-4 py-2"
                                    onClick={saveAndContinue}
                                >
                                    Save
                                </button>
                            </div>
                        </Dialog.Description>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}
