import { Dialog } from "./generic/Dialog.jsx";
import { createSignal, onMount } from "solid-js";
import { FaSolidFolder, FaSolidGraduationCap, FaBrandsGithub } from "solid-icons/fa";
import { VsBook } from "solid-icons/vs";

export function DonationPlea() {
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);

    onMount(() => {
        window.addEventListener("showDonationDialog", () => {
            setIsDialogOpen(true);
        });
    });

    return (
        <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
            <Dialog.Trigger class="hidden" />
            <Dialog.Portal>
                <Dialog.Overlay class="dialog__overlay" />
                <div class="dialog__positioner">
                    <Dialog.Content class="dialog__content max-w-full md:max-w-[800px]">
                        <Dialog.Description class="dialog__description">
                            <div class="p-4">
                                <h2 class="text-2xl font-bold mb-8">
                                    Your Support Keeps Sim8085 Running — Please Help 🙏!
                                </h2>
                                <div class="my-4">
                                    <p class="my-4">I wouldn’t show you this dialog if there were another way.</p>
                                    <div class="my-4">
                                        Sim8085 has been a labor of love, but without some monetary help, I'll have to
                                        shift my focus elsewhere — and that would mean this project slows down or
                                        stagnates. I have significant plans for Sim8085:
                                        <ol class="list-disc list-inside my-2">
                                            <li>Step-by-step tutorials</li>
                                            <li>File saving and versioning</li>
                                            <li>Peripheral and interrupt support</li>
                                            <li>And much more…</li>
                                        </ol>
                                        <p>
                                            I can only justify putting in the time, to myself and others, if Sim8085 can
                                            support some of my responsibilities.
                                        </p>
                                    </div>
                                    <p class="my-4">
                                        Even a small donation makes a big difference. It tells me this work matters and
                                        helps me keep improving and maintaining Sim8085 for everyone.
                                    </p>

                                    <div class="my-4 flex gap-2 md:gap-4 max-w-full md:max-w-[800] items-start flex-wrap justify-start md:justify-evenly bg-main-background px-4 pt-8 pb-6 rounded-lg align-center shadow-lg">
                                        <div class="" title="Recommended">
                                            <a
                                                target="_blank"
                                                href="https://github.com/sponsors/debjitbis08?o=esb"
                                                class="text-xl border-b-0 border-b-secondary-border flex gap-1 items-end text-active-foreground hover:text-blue-foreground cursor-pointer"
                                            >
                                                <FaBrandsGithub />
                                                <span>GitHub</span>
                                                <span class="text-xs self-center">⭐</span>
                                            </a>
                                            <div></div>
                                            <p class="mt-0 text-inactive-foreground text-sm"></p>
                                        </div>
                                        <div class="">
                                            <form
                                                action="https://www.paypal.com/ncp/payment/9W3T973GRR7LN"
                                                method="post"
                                                target="_top"
                                                style="display:inline-grid;justify-items:center;align-content:start;gap:0.5rem;"
                                            >
                                                <button
                                                    class="text-xl border-b-0 border-b-secondary-border flex gap-1 items-center text-active-foreground hover:text-blue-foreground cursor-pointer"
                                                    type="submit"
                                                >
                                                    <span>PayPal</span>
                                                </button>
                                            </form>
                                            <div></div>
                                            <p class="mt-2 text-secondary-foreground text-sm"></p>
                                        </div>
                                        <div class="">
                                            <a
                                                target="_blank"
                                                href="https://ko-fi.com/O4O8170QHN"
                                                class="text-xl border-b-0 border-b-secondary-border flex gap-1 items-center text-active-foreground hover:text-blue-foreground cursor-pointer"
                                            >
                                                {/* <Fragment set:html={KoFiIcon} /> */}
                                                <span>KoFi</span>
                                            </a>
                                            <p class="mt-2 text-secondary-foreground text-sm"></p>
                                        </div>
                                        <div class="" title="May not work for accounts outside India.">
                                            <a
                                                target="_blank"
                                                href="https://www.buymeacoffee.com/debjit.biswas"
                                                class="text-xl border-b-0 border-b-secondary-border flex gap-1 items-center text-active-foreground hover:text-blue-foreground cursor-pointer"
                                            >
                                                {/* <Fragment set:html={BmcIcon} /> */}
                                                <span>Buy me a coffee</span>
                                                <span class="text-base self-auto text-yellow-foreground">
                                                    {/* <Fragment set:html={TriangleInfoIcon} /> */}
                                                </span>
                                            </a>
                                            <div></div>
                                            <p class="mt-2 text-secondary-foreground text-sm"></p>
                                        </div>
                                        <div class="" title="Razorpay requires email and phone number.">
                                            <a
                                                target="_blank"
                                                href="https://razorpay.com/payment-button/pl_PRRyue1p9GnvTp/view/?utm_source=payment_button&utm_medium=button&utm_campaign=payment_button"
                                                class="text-xl border-b-0 border-b-secondary-border flex gap-1 items-center text-active-foreground hover:text-blue-foreground cursor-pointer"
                                            >
                                                {/* <Fragment set:html={RazorPayIcon} /> */}
                                                <span>Razorpay</span>
                                                <span class="text-base self-auto text-yellow-foreground">
                                                    {/* <Fragment set:html={TriangleInfoIcon} /> */}
                                                </span>
                                            </a>
                                            <div></div>
                                            <p class="mt-1 text-secondary-foreground text-sm"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Dialog.Description>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}
