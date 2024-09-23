import { Tooltip } from "@kobalte/core/tooltip";

export function TextTooltip(props) {
  return (
    <Tooltip>
      <Tooltip.Trigger class="tooltip__trigger">
        {props.children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip__content">
          <Tooltip.Arrow />
          <p>{props.message}</p>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
