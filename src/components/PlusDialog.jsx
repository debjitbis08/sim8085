import { Dialog } from "./generic/Dialog.jsx";
import { createSignal, onMount, onCleanup } from "solid-js";
import {
    FaSolidFolder,
    FaSolidGraduationCap,
    FaSolidShareNodes,
    FaSolidRobot,
    FaSolidBan,
    FaSolidXmark,
} from "solid-icons/fa";
import { VsBook } from "solid-icons/vs";

const titleMap = {
    fileLimit: "You've reached the file limit",
    aiExplanation: "AI Help is a Plus feature",
    shareLink: "Sharing is for Plus users",
    notLoggedIn: "Sign in to Save Your Work",
    ads: "Remove Ads with Plus",
    default: "Your Support Keeps Sim8085 Running — Go Plus Today!",
};

const subtitleMap = {
    fileLimit: "Free users can save up to 5 files. Upgrade to save unlimited files and organize better.",
    aiExplanation: "AI explanations are available only to Plus users. Get smarter debugging today.",
    shareLink: "Share your code with a link — available for Plus users only.",
    notLoggedIn: "You need to log in to save your code and access additional features.",
    ads: "Enjoy a clean and distraction-free experience by upgrading.",
    default: "Enjoy unlimited saves, AI help, and sharing with a one-time upgrade.",
};

export function PlusDialog() {
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);
    const [dialogReason, setDialogReason] = createSignal("default");

    onMount(() => {
        const handler = (e) => {
            const reason = e.detail?.reason ?? "default";
            setDialogReason(reason);
            setIsDialogOpen(true);
        };

        window.addEventListener("showPlusDialog", handler);

        onCleanup(() => {
            window.removeEventListener("showPlusDialog", handler);
        });
    });

    return (
        <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
            <Dialog.Trigger class="hidden" />
            <Dialog.Portal>
                <Dialog.Overlay class="dialog__overlay" />
                <div class="dialog__positioner">
                    <Dialog.Content class="dialog__content">
                        <Dialog.CloseButton class="dialog__close-button">
                            <FaSolidXmark />
                        </Dialog.CloseButton>
                        <Dialog.Description class="dialog__description">
                            <div class="p-4">
                                <h2 class="text-xl md:text-2xl font-bold mb-4">{titleMap[dialogReason()]}</h2>
                                <p class="mb-4 md:mb-8 text-secondary-foreground">{subtitleMap[dialogReason()]}</p>
                                <div class="my-4">
                                    <div class="flex items-start md:items-center gap-4 pb-4 md:pb-8">
                                        <div class="text-lg md:text-2xl text-green-600 md:bg-green-200 w-8 h-8 md:w-12 md:h-12 rounded flex items-start md:items-center justify-center">
                                            <FaSolidFolder />
                                        </div>
                                        <div>
                                            <h3 class={"mb-1"}>Save and Organize Files</h3>
                                            <p class="text-sm text-secondary-foreground">
                                                Save up to 5 files on the free plan. Go Plus for unlimited saves and
                                                better workspace management.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start md:items-center gap-4 pb-4 md:pb-8">
                                        <div class="text-lg md:text-2xl text-blue-600 md:bg-blue-200 w-8 h-8 md:w-12 md:h-12 rounded flex items-start md:items-center justify-start md:justify-center">
                                            <FaSolidShareNodes />
                                        </div>
                                        <div>
                                            <h3 class="mb-1">Public Share Links</h3>
                                            <p class="text-sm text-secondary-foreground">
                                                Share your 8085 programs with anyone using a simple link.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start md:items-center gap-4 pb-4 md:pb-8">
                                        <div class="text-lg md:text-2xl text-purple-600 md:bg-purple-200 w-8 h-8 md:w-12 md:h-12 rounded flex items-start md:items-center justify-start md:justify-center">
                                            <FaSolidRobot />
                                        </div>
                                        <div>
                                            <h3 class="mb-1">AI Help for Assembler Errors</h3>
                                            <p class="text-sm text-secondary-foreground">
                                                Confused by assembler errors? Let AI explain what went wrong and how to
                                                fix it.
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-start md:items-center gap-4 pb-4 md:pb-8">
                                        <div class="text-lg md:text-2xl text-red-600 md:bg-red-200 w-8 h-8 md:w-12 md:h-12 rounded flex items-start md:items-center justify-start md:justify-center">
                                            <FaSolidBan />
                                        </div>
                                        <div>
                                            <h3 class="mb-1">No Ads, No Distractions</h3>
                                            <p class="text-sm text-secondary-foreground">
                                                Enjoy a clean and distraction-free experience by removing all ads from
                                                the site.
                                            </p>
                                        </div>
                                    </div>
                                    {/*
                                    <div class="flex items-center gap-4 pb-8">
                                        <div class="text-3xl text-blue-600 bg-blue-200 w-12 h-12 rounded flex items-center justify-center">
                                            <FaSolidGraduationCap />
                                        </div>
                                        <div>
                                            <h3 class="flex items-center gap-2 mb-1">
                                                <span>Step-by-Step Tutorials</span>
                                                <span class="bg-terminal-200 text-terminal rounded px-2 py-1 uppercase text-[0.6rem]">
                                                    Coming Soon
                                                </span>
                                            </h3>
                                            <p class="text-sm text-secondary-foreground">
                                                Master 8085 ALP with easy, step-by-step tutorials.
                                            </p>
                                        </div>
                                    </div>
                                    */}
                                </div>
                                <div>
                                    <div class="flex flex-col-reverse md:flex-row items-center justify-start gap-4">
                                        <a
                                            href="/upgrade/"
                                            class="bg-yellow-foreground rounded-lg px-8 py-4 font-bold text-md md:text-lg text-gray-900"
                                        >
                                            Upgrade to Plus
                                        </a>
                                        <div class="text-center md:text-left">
                                            <p>
                                                Just{" "}
                                                <span class="text-secondary-foreground line-through decoration-double decoration-red-500 text-lg">
                                                    $8
                                                </span>
                                                <span class="font-bold"> $4</span> for 6 months.
                                            </p>
                                            <p class="text-secondary-foreground text-sm mt-2">
                                                No subscription. No auto-renewal.
                                            </p>
                                        </div>
                                    </div>
                                    <p class="mx-auto mt-2 text-secondary-foreground text-center md:text-left">
                                        Upgrade now and get <span class="text-red-foreground">50% OFF</span> for a
                                        limited time!
                                    </p>
                                </div>
                                {/*
                                <span class="flex items-center my-4">
                                    <span class="pr-6 text-secondary-foreground">OR</span>
                                    <span class="h-px flex-1 bg-main-border"></span>
                                </span>
                                <button class="border border-terminal text-terminal rounded-lg px-8 py-4 font-bold text-base">
                                    Make a one-time Donation of $2
                                </button>
                                */}
                            </div>
                        </Dialog.Description>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}
