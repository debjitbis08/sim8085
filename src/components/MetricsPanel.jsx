import { Show } from "solid-js";
import { store } from "../store/store.js";

const formatCount = (value) => (value == null ? "--" : value.toLocaleString());

function MetricRow(props) {
    return (
        <div class="border-b border-main-border pb-2">
            <div class="flex items-center justify-between gap-4">
                <span class="text-secondary-foreground">{props.label}</span>
                <span class="font-mono text-terminal">{props.value}</span>
            </div>
            {props.footnote && (
                <p class="text-xs text-secondary-foreground mt-1">{props.footnote}</p>
            )}
        </div>
    );
}

export function MetricsPanel() {
    const performance = () => store.metrics.performance;
    const hasMetrics = () =>
        performance().totalTstates != null ||
        performance().memoryChangedBytes != null ||
        performance().registersUsed.length > 0;
    const registersUsed = () =>
        performance().registersUsed.length ? performance().registersUsed.join(", ") : "None";

    const approxTimeMs = () => {
        const tstates = performance().totalTstates;
        if (tstates == null) return null;
        return (tstates / 3072000) * 1000;
    };

    const formatDuration = (valueMs) => {
        if (valueMs == null) return "--";
        if (valueMs < 1) return `${valueMs.toFixed(3)} ms`;
        if (valueMs < 1000) return `${valueMs.toFixed(2)} ms`;
        return `${(valueMs / 1000).toFixed(2)} s`;
    };

    return (
        <div class="bg-page-background md:bg-main-background p-4 h-full">
            <div class="flex items-baseline justify-between gap-2">
                <h2 class="md:text-xl pb-2">Metrics</h2>
                <span class="text-xs uppercase text-secondary-foreground">Performance</span>
            </div>
            <Show when={hasMetrics()} fallback={<p class="text-sm text-secondary-foreground">Run a program to see performance metrics.</p>}>
                <div class="flex flex-col gap-3 pt-2">
                    <MetricRow label="T-states" value={formatCount(performance().totalTstates)}
                        footnote={performance().totalTstates != null ? `Approx time @ 3.072MHz: ${formatDuration(approxTimeMs())}` : null}
                    />
                    <MetricRow label="Program size" value={`${formatCount(performance().programSizeBytes)} bytes`} />
                    <MetricRow label="Input size" value={`${formatCount(performance().inputSizeBytes)} bytes`} />
                    <MetricRow
                        label="Memory changed"
                        value={`${formatCount(performance().memoryChangedBytes)} bytes`}
                    />
                    <MetricRow
                        label="Memory for Processing"
                        value={`${formatCount(performance().memoryChangedOutsideProgramBytes)} bytes`}
                    />
                    <MetricRow
                        label="Max stack size"
                        value={`${formatCount(performance().maxStackBytes)} bytes`}
                    />
                    <MetricRow label="Registers used" value={registersUsed()} />
                </div>
            </Show>
        </div>
    );
}
