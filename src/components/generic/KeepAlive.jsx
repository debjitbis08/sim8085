import { createSignal, Show, createEffect } from "solid-js";

// Show and hide the component based on props.active but load it only once.
export function KeepAlive(props) {
    const [rendered, setRendered] = createSignal(props.active);

    createEffect(() => {
        if (props.active && !rendered()) {
            setRendered(true); // mark as visited
        }
    });

    return (
        <Show when={rendered()}>
            <div style={{ display: props.active ? "block" : "none" }}>{props.children}</div>
        </Show>
    );
}
