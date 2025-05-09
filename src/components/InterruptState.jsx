import { store } from "../store/store";
import { FaSolidCircle } from "solid-icons/fa";

export default function InterruptState() {
    const statusColor = () =>
        store.interruptsEnabled
            ? "text-green-foreground bg-terminal-100 border-terminal-300"
            : "text-red-foreground bg-red-100 border-red-300";

    return (
        <div>
            <div class="flex items-center border-b border-b-inactive-border px-1">
                <h2 class="text-lg grow pb-2">Interrupts</h2>

                <div class={`text-sm ml-auto`}>
                    <Indicator isEnabled={store.interruptsEnabled} />
                </div>
            </div>
            <div class="mt-3 flex flex-col gap-2">
                <Item name="TRAP" status={true} pending={store.pendingInterrupts.trap} />
                <Item
                    name="RST 5.5"
                    status={store.interruptsEnabled && !store.interruptMasks.rst55}
                    pending={store.pendingInterrupts.rst55}
                />
                <Item
                    name="RST 6.5"
                    status={store.interruptsEnabled && !store.interruptMasks.rst65}
                    pending={store.pendingInterrupts.rst65}
                />
                <Item
                    name="RST 7.5"
                    status={store.interruptsEnabled && !store.interruptMasks.rst75}
                    pending={store.pendingInterrupts.rst75}
                />
            </div>
        </div>
    );
}

function Item(props) {
    const statusText = () => (props.status ? "Enabled" : "Disabled");
    const statusColor = () =>
        props.status
            ? "text-green-foreground bg-terminal-100 border-terminal-300"
            : "text-red-foreground bg-red-100 border-red-300";

    return (
        <div class="flex items-center gap-2 text-sm hover:bg-active-background px-1 py-1">
            <div>{props.name}</div>
            <div class={`ml-auto flex items-center gap-2`}>
                {props.pending && (
                    <span class="ml-2 text-yellow-800 text-xs bg-yellow-100 rounded px-1 py-0.5">Pending</span>
                )}
                <Indicator isEnabled={props.status} />
            </div>
        </div>
    );
}

function Indicator(props) {
    return (
        <span class={`${props.isEnabled ? "text-green-foreground" : "text-red-foreground"}`}>
            <FaSolidCircle />
        </span>
    );
}
