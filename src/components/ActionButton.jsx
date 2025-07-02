import { Tooltip } from "./generic/Tooltip.jsx";

export default function ActionButton(props) {
    return (
        <Tooltip placement={props.titlePlacement || "bottom"}>
            <Tooltip.Trigger
                class={`${props.isHidden ? "hidden" : ""} tooltip__trigger rounded hover:bg-active-background border border-transparent hover:border-active-border cursor-pointer ${props.class || ""}`}
                onClick={props.onClick}
                disabled={props.disabled || props.isHidden}
            >
                <div class="px-2 py-2 flex items-center gap-2 text-gray-600 text-lg md:text-base">{props.icon}</div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="tooltip__content">
                    <Tooltip.Arrow />
                    <div class="flex items-center gap-2">
                        <p>{props.title}</p>
                        {props.shortcut ? (
                            <span class="text-xs bg-secondary-background py-1 px-2 rounded-sm">{props.shortcut}</span>
                        ) : null}
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}
