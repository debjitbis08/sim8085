import { Dialog } from "@kobalte/core/dialog";
import { createShortcut } from "@solid-primitives/keyboard";
import { FaSolidXmark, FaSolidKeyboard } from "solid-icons/fa";
import { createSignal } from "solid-js";
import styles from './KeyboardShortcuts.module.css';

export function KeyboardShortcuts() {
  const [open, setOpen] = createSignal(false);

  createShortcut(
    ['Control', '?'],
    () => setOpen(true),
  );

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Trigger class="dialog__trigger">
        <FaSolidKeyboard />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog__overlay" />
        <div class="dialog__positioner">
          <Dialog.Content class="dialog__content ">
            <div class="dialog__header">
              <Dialog.Title class="dialog__title text-xl">Keyboard Shortcuts</Dialog.Title>
              <Dialog.CloseButton class="dialog__close-button h-4 w-4">
                <FaSolidXmark />
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class="dialog__description">
              {/* Application Shortcuts */}
              <h2 class={styles.sectionHeader}>Application Shortcuts</h2>
              <div class={styles.shortcutsGrid}>
                <div>Run Program</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>F5</span>
                </div>
                <div>Debug Program</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Alt</span>
                  <span class={styles.key}>F5</span>
                </div>
                <div>Step Over (Single Instruction)</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>F10</span>
                </div>
                <div>Assemble and Load Program into Memory</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>Shift</span>
                  <span class={styles.key}>B</span>
                </div>
                <div>Unload Program</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>Shift</span>
                  <span class={styles.key}>U</span>
                </div>
                <div>Stop Debugging</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Shift</span>
                  <span class={styles.key}>F5</span>
                </div>
                <div>Open Settings</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>,</span>
                </div>
              </div>

              {/* Code Editor (CodeMirror) Shortcuts */}
              <h2 class={styles.sectionHeader}>Code Editor Shortcuts</h2>
              <div class={styles.shortcutsGrid}>
                <div>Find</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>F</span>
                </div>
                <div>Toggle Comment</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Ctrl</span>
                  <span class={styles.key}>/</span>
                </div>
                <div>Indent Selection or Line</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Tab</span>
                </div>
                <div>Outdent Selection or Line</div>
                <div class={styles.keyCombination}>
                  <span class={styles.key}>Shift</span>
                  <span class={styles.key}>Tab</span>
                </div>
              </div>
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
