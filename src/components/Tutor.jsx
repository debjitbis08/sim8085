// @ts-check
import { createSignal, onMount, Show } from "solid-js";
import { getUserTier } from "../lib/subscription.js";
import { store, setStore } from "../store/store.js";
import { produce } from "solid-js/store";
import { getSession } from "../lib/supabase.js";

export default function StepByStepGuide() {
    const [tier, setTier] = createSignal("FREE");
    const [problemInput, setProblemInput] = createSignal("");

    const isOpenAiEnabled = import.meta.env.PUBLIC_OPENAI_ENABLED === "true";

    async function fetchStep(stepNum, mode = "generate") {
        if (!store.tutorial.problem) return;

        // Reset only the relevant field
        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.stepIndex = stepNum;
                tutorial.step = "";
            }),
        );

        const params = new URLSearchParams({
            step: stepNum.toString(),
            mode,
            conversationId: store.tutorial.conversationId || "",
            previousResponseId: store.tutorial.latestResponseId || "",
            currentCode: store.activeFile.content || "",
            problem: store.tutorial.problem,
        });

        const { session } = await getSession();
        if (session?.access_token) {
            params.set("access_token", session.access_token);
        }

        const evt = new EventSource(`/api/tutorials/stream/?${params.toString()}`);

        let content = "";

        evt.onmessage = (e) => {
            content += e.data;

            console.log(e.data, JSON.stringify(e.data));

            if (e.data.includes("Tutorial complete")) {
                setStore("tutorial", "isLastStep", true);
            }
            setStore(
                "tutorial",
                produce((tutorial) => {
                    tutorial.stepIndex = stepNum;
                    tutorial.step = content;
                }),
            );
        };

        evt.addEventListener("responseId", (e) => {
            setStore("tutorial", "latestResponseId", e.data);
        });

        evt.addEventListener("done", () => {
            evt.close();
        });

        evt.onerror = () => {
            evt.close();
            setStore(
                "tutorial",
                produce((tutorial) => {
                    tutorial.stepIndex = stepNum;
                    const fallback = "Unable to load step instructions.";
                    tutorial.step = fallback;
                }),
            );
        };
    }

    function next() {
        if (store.tutorial.stepIndex >= store.tutorial.maxSteps) {
            setStore("tutorial", "isLastStep", true);
            return;
        }
        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.stepIndex = (tutorial.stepIndex ?? 1) + 1;
                tutorial.stepHint = "";
                tutorial.stepInstructionHint = "";
            }),
        );
        fetchStep(store.tutorial.stepIndex);
    }

    function restart() {
        const newConvId = crypto.randomUUID();

        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.conversationId = newConvId;
                tutorial.latestResponseId = null;
                tutorial.stepIndex = 1;
                tutorial.isLastStep = false;
            }),
        );

        fetchStep(1, "generate");
    }

    function start() {
        const newConvId = crypto.randomUUID();

        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.conversationId = newConvId;
                tutorial.latestResponseId = null;
                tutorial.stepIndex = 1;
            }),
        );

        fetchStep(1, "generate");
    }

    function stuck() {
        const newConvId = crypto.randomUUID();

        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.conversationId = newConvId;
                tutorial.latestResponseId = null;
                tutorial.stepIndex = 1;
            }),
        );

        fetchStep(1, "stuck");
    }

    function reset() {
        setStore(
            "tutorial",
            produce((tutorial) => {
                tutorial.conversationId = crypto.randomUUID();
                tutorial.latestResponseId = null;
                tutorial.stepIndex = 1;
                tutorial.isLastStep = false;
                tutorial.problem = "";
            }),
        );
        setProblemInput("");
    }

    function getHint() {
        fetchStep(store.tutorial.stepIndex, "stuck");
    }

    function getInstructionHint() {
        fetchStep(store.tutorial.stepIndex, "instructionHint");
    }

    const openPlusDialog = () => {
        window.dispatchEvent(new CustomEvent("showPlusDialog", { detail: {} }));
    };

    onMount(async () => {
        const { tier } = await getUserTier();
        setTier(tier);
    });

    return (
        <div class="p-4 text-sm">
            <Show when={isOpenAiEnabled} fallback={<p>Step-by-step tutorials are currently unavailable.</p>}>
                <Show
                    when={tier() === "PLUS"}
                    fallback={
                        <div class="p-4">
                            <p class="mb-2 font-semibold">Step-by-step 8085 tutorials are a Plus feature.</p>
                            <p class="mb-2 text-secondary-foreground">
                                This tutor walks you through building an 8085 assembly program step by step. It is not
                                for general app or interface help.
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                Example prompts: "Write an 8085 program to add two 16-bit numbers", "Create a routine to find the largest of 10 numbers", "Design
                                an 8085 program to count the number of 1s in a byte".
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                The Tutor will provide step-by-step instructions to help you implement the program in assembly language without
                                writing the complete code for you. This incremental approach helps you to better retain the concepts and logic behind 8085 programming.
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                Check the sample programs in the docs to have an idea of what kind of content the AI might generate.
                            </p>
                            <button
                                type="button"
                                class="border border-terminal text-terminal rounded px-4 py-2 hover:bg-active-background cursor-pointer"
                                onClick={openPlusDialog}
                            >
                                Learn More
                            </button>
                        </div>
                    }
                >
                    <Show when={!store.tutorial.problem}>
                        <div class="mb-4">
                            <label class="block mb-2 font-semibold">What 8085 program are you trying to implement?</label>
                            <p class="mb-2 text-secondary-foreground">
                                This tutor gives step-by-step 8085 assembly instructions only. It is not for general
                                app or interface help.
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                Example prompts: "Write an 8085 program to add two 16-bit numbers", "Create a routine to find the largest of 10 numbers", "Design
                                an 8085 program to count the number of 1s in a byte".
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                The Tutor will provide step-by-step instructions to help you implement the program in assembly language without
                                writing the complete code for you. This incremental approach helps you to better retain the concepts and logic behind 8085 programming.
                            </p>
                            <p class="mb-4 text-secondary-foreground">
                                Check the sample programs in the docs to have an idea of what kind of content the AI might generate.
                            </p>
                            <textarea
                                class="w-full p-2 border border-secondary-border rounded resize-none"
                                rows="4"
                                placeholder='Describe the 8085 program you want to implement (e.g., "Add two 16-bit numbers stored at 2000H and 2002H")...'
                                value={store.tutorial.problem}
                                onInput={(e) => setProblemInput(e.currentTarget.value)}
                            ></textarea>
                            <div class="flex items-center gap-2">
                                <button
                                    class="mt-2 px-4 py-2 bg-terminal text-white rounded hover:bg-terminal-700 cursor-pointer"
                                    onClick={() => {
                                        setStore("tutorial", "problem", problemInput());
                                        if (store.tutorial.problem.trim()) {
                                            start();
                                        }
                                    }}
                                >
                                    Start Tutorial
                                </button>
                                <button
                                    class="mt-2 px-4 py-2 bg-terminal text-white rounded hover:bg-terminal-700 cursor-pointer"
                                    onClick={() => {
                                        setStore("tutorial", "problem", problemInput());
                                        if (store.tutorial.problem.trim()) {
                                            stuck();
                                        }
                                    }}
                                >
                                    Help! I am stuck
                                </button>
                            </div>
                        </div>
                    </Show>
                    <Show
                        when={store.tutorial.step && store.tutorial.problem}
                        fallback={store.tutorial.problem ? <p>Loading...</p> : null}
                    >
                        <div class="mb-4">
                            <h3 class="font-bold mb-2">Step {store.tutorial.stepIndex}</h3>
                            <Show when={store.tutorial.step}>
                                <div class="mt-2 text-primary-foreground">
                                    <pre class="text-sm whitespace-pre-wrap">{store.tutorial.step}</pre>
                                </div>
                            </Show>
                            <Show when={store.tutorial.stepHint}>
                                <pre class="text-sm whitespace-pre-wrap border-t border-secondary-border mt-4 pt-4">
                                    {store.tutorial.stepHint}
                                </pre>
                            </Show>
                            <Show when={store.tutorial.stepInstructionHint}>
                                <p class="mt-2 text-secondary-foreground">{store.tutorial.stepInstructionHint}</p>
                            </Show>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button
                                class="border border-secondary-border rounded px-2 py-1 hover:bg-active-background cursor-pointer"
                                onClick={next}
                                disabled={store.tutorial.isLastStep}
                            >
                                Next Step
                            </button>
                            <Show when={store.tutorial.step}>
                                <button
                                    class="border border-secondary-border rounded px-2 py-1 hover:bg-active-background cursor-pointer"
                                    onClick={getHint}
                                >
                                    I am stuck
                                </button>
                            </Show>
                            <Show when={store.tutorial.step}>
                                <button
                                    class="border border-secondary-border rounded px-2 py-1 hover:bg-active-background cursor-pointer"
                                    onClick={getInstructionHint}
                                >
                                    Help me with the instructions required for this step
                                </button>
                            </Show>
                            <button
                                class="border border-secondary-border rounded px-2 py-1 hover:bg-active-background cursor-pointer"
                                onClick={restart}
                            >
                                Restart Tutorial
                            </button>
                            <button
                                class="border border-secondary-border rounded px-2 py-1 hover:bg-active-background"
                                onClick={reset}
                            >
                                Start a working on a new problem
                            </button>
                        </div>
                    </Show>
                </Show>
            </Show>
        </div>
    );
}
