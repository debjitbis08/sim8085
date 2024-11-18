import {Dialog} from "@kobalte/core/dialog";
import {createSignal, onMount} from "solid-js";
import {FaSolidFolder, FaSolidGraduationCap} from "solid-icons/fa";
import {VsBook} from "solid-icons/vs";

export function PlusDialog() {
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);

    onMount(() => {
        window.addEventListener("showPlusDialog", () => {
            setIsDialogOpen(true);
        });
    });

    return (
        <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
            <Dialog.Trigger class="hidden" />
            <Dialog.Portal>
                <Dialog.Overlay class="dialog__overlay" />
                <div class="dialog__positioner">
                    <Dialog.Content class="dialog__content">
                        <Dialog.Description class="dialog__description">
                            <div class="p-4">
                                <h2 class="text-2xl font-bold mb-8">Your Support Keeps Sim8085 Running — Go Plus Today!</h2>
                                <div class="my-4">
                                    <div class="flex items-center gap-4 pb-8">
                                        <div
                                            class="text-2xl text-green-600 bg-green-200 w-12 h-12 rounded flex items-center justify-center">
                                            <FaSolidFolder/></div>
                                        <div>
                                            <h3 class={"mb-1"}>Save and Organize Files</h3>
                                            <p class="text-sm text-secondary-foreground">Easily save and organize your 8085 programs in one place.</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-4 pb-8">
                                        <div
                                            class="text-3xl text-blue-600 bg-blue-200 w-12 h-12 rounded flex items-center justify-center">
                                            <FaSolidGraduationCap /></div>
                                        <div>
                                            <h3 class="flex items-center gap-2 mb-1">
                                                <span>Step-by-Step Tutorials</span>
                                                <span
                                                    class="bg-terminal-200 text-terminal rounded px-2 py-1 uppercase text-[0.6rem]">Coming Soon</span>
                                            </h3>
                                            <p class="text-sm text-secondary-foreground">Master 8085 ALP with easy, step-by-step tutorials.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex items-center justify-start gap-4">
                                        <button
                                            class="bg-yellow-foreground rounded-lg px-8 py-4 font-bold text-lg text-gray-900">Upgrade
                                            to Plus
                                        </button>
                                        <div>
                                            <p>
                                                Just <span class="text-secondary-foreground line-through decoration-double decoration-red-500 text-lg">$8</span>
                                                <span
                                                    class="font-bold"> $4</span> for 6 months.
                                            </p>
                                            <p class="text-secondary-foreground text-sm mt-2">
                                                No subscription. No auto-renewal.
                                            </p>
                                        </div>
                                    </div>
                                    <p class="mx-auto mt-2 text-secondary-foreground">
                                        Upgrade now and get <span class="text-red-foreground">50% OFF</span> for a
                                        limited time!
                                    </p>
                                </div>
                                <span class="flex items-center my-4">
                                    <span class="pr-6 text-secondary-foreground">OR</span>
                                    <span class="h-px flex-1 bg-main-border"></span>
                                </span>
                                <button
                                    class="border border-terminal text-terminal rounded-lg px-8 py-4 font-bold text-base">Make a one-time Donation of $2
                                </button>
                            </div>
                        </Dialog.Description>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}
