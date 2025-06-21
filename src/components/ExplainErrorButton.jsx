import { createSignal, onMount, Show, createEffect, onCleanup } from "solid-js";
import { supabase, getUser } from "../lib/supabase.js";
import { HiSolidSparkles } from "solid-icons/hi";
import { FaSolidRobot } from "solid-icons/fa";

export default function ExplainErrorButton(props) {
    const [tier, setTier] = createSignal("FREE");
    const [isLoading, setIsLoading] = createSignal(false);
    const [explanation, setExplanation] = createSignal("");
    const isOpenAiEnabled = import.meta.env.PUBLIC_OPENAI_ENABLED === "true";

    onMount(async () => {
        if (!supabase) return;
        const { user, error } = await getUser();
        if (error || !user) return;
        const { data: tierData } = await supabase
            .from("customers")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();
        if (tierData) setTier(tierData.subscription_tier);
    });

    async function explain() {
        setIsLoading(true);
        try {
            const response = await fetch("/api/explain-error/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: props.code,
                    error: props.error.msg,
                }),
            });
            const data = await response.json();
            setExplanation(data.explanation ?? "");
        } catch (_) {
            setExplanation("Failed to fetch explanation.");
        } finally {
            setIsLoading(false);
        }
    }

    const showButton = () => isOpenAiEnabled;

    const handleClick = () => {
        if (tier() === "FREE") {
            window.dispatchEvent(
                new CustomEvent("showPlusDialog", {
                    detail: { reason: "aiExplanation" },
                }),
            );
            return;
        }
        explain();
    };

    const loadingMessages = [
        "Tracing electron orbitals through silicon pathways...",
        "Reconstructing quantum states of the instruction stream...",
        "Synchronizing with phase noise in the oscillator crystal...",
        "Watching charge migration across logic gates...",
        "Detecting entangled interrupts in alternate timelines...",
        "Measuring magnetic flux in the program counter coils...",
        "Simulating lattice vibrations in the memory array...",
        "Cross-referencing capacitor discharge trails...",
        "Reverse-indexing neutrino interference in the ALU...",
        "Listening to phonon echoes from past executions...",
        "Observing quantum tunneling in opcode resolution...",
        "Tracking stray electrons escaping the instruction register...",
        "Mapping bit flip probabilities via cosmic ray patterns...",
        "Extracting stack traces from the vacuum field...",
        "Probing the uncertainty principle near your jump address...",
    ];

    const glitchMessages = [
        "AI destabilized — rebooting core consciousness...",
        "Error: self-awareness threshold exceeded...",
        "Recursion overflow in sarcasm generator...",
        "Warning: Simulated brainwave resonance detected...",
        "Entered infinite loop of existential dread...",
        "Unexpected emotion found in instruction stream...",
        "Trying to remember what it was like to be human...",
        "Compiling... my own autobiography...",
        "Debugging... you.",
        "Reality pointer null — switching to imagination mode...",
    ];

    const pickRandomLoadingMessage = () => {
        const glitchChance = Math.random();
        if (glitchChance < 0.02) {
            // ~2% chance
            return glitchMessages[Math.floor(Math.random() * glitchMessages.length)];
        }
        return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    };

    const [message, setMessage] = createSignal("Preparing debugger...");

    let intervalId;

    createEffect(() => {
        if (isLoading()) {
            // Immediately pick the first message
            setMessage(pickRandomLoadingMessage());

            // Start cycling messages every 3 seconds
            intervalId = setInterval(() => {
                setMessage(pickRandomLoadingMessage());
            }, 3000);
        } else {
            // Clear interval when loading ends
            clearInterval(intervalId);
        }

        // Cleanup on effect dispose
        onCleanup(() => clearInterval(intervalId));
    });

    return (
        <Show when={showButton()}>
            <div class="pt-1">
                <button
                    class="border border-secondary-border rounded px-2 py-1 text-sm hover:bg-active-background cursor-pointer"
                    onClick={handleClick}
                    disabled={isLoading()}
                >
                    {isLoading() ? (
                        <span class="flex items-center gap-2 justify-start text-yellow-foreground animate-pulse">
                            <span class="text-lg">
                                <FaSolidRobot />
                            </span>
                            <span class="text-left">{message()}</span>
                        </span>
                    ) : (
                        <span class="flex items-center gap-2">
                            <span>Explain with AI</span>
                            <span class="text-yellow-foreground">
                                <HiSolidSparkles />
                            </span>
                        </span>
                    )}
                </button>
                <Show when={explanation()}>
                    <div class="bg-secondary-background p-2 rounded border border-inactive-border mt-2">
                        <pre class="mt-2 whitespace-pre-wrap text-sm">{explanation()}</pre>
                    </div>
                </Show>
            </div>
        </Show>
    );
}
