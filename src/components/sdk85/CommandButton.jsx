import { Show } from "solid-js";

/**
 * A button that runs a monitor command.
 *
 * It carries the key sequence it sends, printed underneath, because that is
 * the whole claim being made: this is not a modern reimplementation of the
 * command, it is the keys the manual tells you to press, queued for you.
 */
export function CommandButton(props) {
    return (
        <button
            type="button"
            class={`flex flex-col items-start gap-0.5 rounded border border-active-border px-2 py-1 text-left
                hover:bg-secondary-background disabled:opacity-40 ${props.class ?? ""}`}
            disabled={props.disabled}
            title={props.command ? `Sends ${props.command.label} on the keypad` : undefined}
            onClick={() => props.onSend(props.command)}
        >
            <span class="text-sm leading-tight">{props.children}</span>
            <Show when={props.command}>
                <span class="font-mono text-[10px] leading-tight text-secondary-foreground">
                    {props.command.label}
                </span>
            </Show>
        </button>
    );
}
