import { Tooltip } from "@kobalte/core/tooltip";
import styles from "./TextToolip.module.css"

export function TextTooltip(props) {
  return (
    <Tooltip>
      <Tooltip.Trigger class="tooltip__trigger">
        {props.children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class={styles.tooltipContent}>
          <Tooltip.Arrow />
          <p>{props.message}</p>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
