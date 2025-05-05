import { VsLoading } from "solid-icons/vs";
import { createSignal, lazy, Suspense, onMount } from "solid-js";

export default function DelayedComponent(props) {
    const [isReady, setIsReady] = createSignal(false);

    const Comp = lazy(props.fn);

    onMount(() => {
        setTimeout(() => {
            setIsReady(true);
        }, props.delayInMs);
    });

    return (
        <div>
            {isReady() ? (
                <Suspense fallback={props.fallback}>
                    <Comp />
                </Suspense>
            ) : (
                props.fallback
            )}
        </div>
    );
}
