import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { store } from "../store/store.js";

const LOCAL_KEY = "natoryDismissed";

export function NatoryAd() {
    const [visible, setVisible] = createSignal(false);

    onMount(() => {
        if (localStorage.getItem(LOCAL_KEY) === "true") return;

        useInactivityTimer({
            delay: 60000,
            onIdle: () => {
                if (!localStorage.getItem(LOCAL_KEY)) {
                    setVisible(true);
                    if (window.posthog) {
                        posthog.capture("ad impression");
                    }
                }
            },
            onActive: () => {
                setVisible(false);
            },
        });
    });

    const dismissForever = () => {
        localStorage.setItem(LOCAL_KEY, "true");
        setVisible(false);
        if (window.posthog) {
            posthog.capture("ad clickthrough");
        }
    };

    return (
        <div
            class={`${store.assembled.length || store.errors.length || !visible() ? "hidden" : "hidden lg:block"} bg-secondary-background rounded-lg shadow-lg p-4 space-y-3 border border-secondary-border fixed right-4 bottom-14 max-w-[400px]`}
        >
            <h3 class="text-lg font-semibold">🧠 Bored with 8085 programming?</h3>
            <p class="text-sm text-muted-foreground">
                Try <strong>ℕatory</strong> — a puzzle game where you create numbers using only their own digits and
                math.
            </p>
            <img
                src="./src/images/natory.png"
                alt="Natory game interface showing puzzle 2672"
                class="rounded border border-gray-700 dark:block hidden"
            />
            <img
                src="./src/images/natory-light.png"
                alt="Natory game interface showing puzzle 2672"
                class="rounded border border-gray-700 dark:hidden"
            />
            <a
                href="https://playnatory.com/game"
                target="_blank"
                onClick={dismissForever}
                class="inline-block mt-2 px-4 py-2 dark:bg-terminal-700 bg-terminal-500 text-white rounded hover:bg-terminal-600 dark:hover:bg-terminal-600"
            >
                👉 Play ℕatory
            </a>
        </div>
    );
}

export function useInactivityTimer({ onIdle, onActive, delay = 5 * 60000 }) {
    let timer;
    let isIdle = false;
    let lastActivity = Date.now();
    let pendingIdle = false;

    const goIdle = () => {
        const elapsed = Date.now() - lastActivity;
        if (elapsed >= delay && !isIdle) {
            if (document.visibilityState === "visible") {
                isIdle = true;
                pendingIdle = false;
                onIdle?.();
            } else {
                pendingIdle = true;
            }
        }
    };

    const reset = () => {
        clearTimeout(timer);
        lastActivity = Date.now();

        if (isIdle) {
            isIdle = false;
            onActive?.();
        }

        pendingIdle = false;
        timer = setTimeout(goIdle, delay);
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            const elapsed = Date.now() - lastActivity;
            if (pendingIdle && !isIdle && elapsed >= delay) {
                isIdle = true;
                pendingIdle = false;
                onIdle?.();
            } else {
                reset();
            }
        } else {
            clearTimeout(timer);
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    onCleanup(() => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    });

    // Reactively trigger on any meaningful state change
    createEffect(() => {
        store.activeFile.content;
        store.programState;
        store.accumulator;
        store.isEditingAccumulator;
        store.stackPointer;
        store.programCounter;
        store.flags.s;
        store.flags.z;
        store.flags.ac;
        store.flags.p;
        store.flags.c;
        Object.values(store.registers).forEach((r) => {
            r.high;
            r.low;
        });

        reset();
    });

    // Start timer immediately
    reset();
}
