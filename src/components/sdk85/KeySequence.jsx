import { For, Show } from "solid-js";
import { SDK85_KEY_LABELS } from "../../core/sdk85.js";

/**
 * The keys still on their way to the board.
 *
 * A command sent from the modern interface is not delivered all at once: the
 * monitor takes one key per interrupt, exactly as it would from a thumb. This
 * shows what is left to go, so what the display is doing lines up with a
 * sequence you can see being pressed.
 */
export function KeySequence(props) {
    return (
        <div class="flex min-h-[1.75rem] flex-wrap items-center gap-1 rounded border border-inactive-border px-2 py-1">
            <Show
                when={props.keys.length > 0}
                fallback={<span class="text-xs text-secondary-foreground">{props.idle}</span>}
            >
                <span class="text-xs text-secondary-foreground">Keying:</span>
                <For each={props.keys}>
                    {(code) => (
                        <span class="rounded border border-inactive-border px-1 font-mono text-[10px]">
                            {SDK85_KEY_LABELS[code] ?? "?"}
                        </span>
                    )}
                </For>
            </Show>
        </div>
    );
}
