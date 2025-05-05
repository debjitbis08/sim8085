import { VsLoading } from "solid-icons/vs";
import { createSignal, lazy, Suspense, onMount } from "solid-js";
import DelayedComponent from "./generic/DelayedComponent.jsx";

const Actions = lazy(() => import("./Actions.jsx"));

export default function ActionsLoader() {
    return (
        <DelayedComponent
            delayInMs={3000}
            fn={() => import("./Actions.jsx")}
            fallback={
                <div class="flex items-center gap-2">
                    <VsLoading class="animate-spin" />
                    <span class="text-sm text-inactive-foreground">Loading Action Buttons...</span>
                </div>
            }
        />
    );
}
