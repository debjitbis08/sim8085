import { VsLoading } from "solid-icons/vs";
import DelayedComponent from "./generic/DelayedComponent.jsx";

export default function CodeFormatterLoader() {
    return (
        <DelayedComponent
            delayInMs={3000}
            fn={() => import("./CodeFormatter.jsx")}
            fallback={
                <div class="flex items-center justify-center md:justify-end gap-2">
                    <VsLoading class="animate-spin" />
                    <span class="text-sm text-inactive-foreground">Loading Code Formatter...</span>
                </div>
            }
        />
    );
}
