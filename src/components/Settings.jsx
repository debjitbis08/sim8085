import { Dialog } from "@kobalte/core/dialog";
import { Switch } from "@kobalte/core/switch";
import { FaSolidXmark } from "solid-icons/fa";
import { VsSettingsGear } from "solid-icons/vs";
import { setStore, store } from "../store/store.js";
import { produce } from "solid-js/store";
import { createLens } from "../utils/lens.js";
import { onMount } from "solid-js";
import { deepMerge } from "../utils/deepMerge.js";

export function Settings() {

  onMount(() => {
    const savedSettings = localStorage.getItem("settings");
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};

    const mergedSettings = deepMerge(parsedSettings, store.settings);

    setStore("settings", mergedSettings);
  });

  return (
    <Dialog>
      <Dialog.Trigger class="dialog__trigger">
        <VsSettingsGear class="text-xl"/>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog__overlay" />
        <div class="dialog__positioner">
          <Dialog.Content class="dialog__content ">
            <div class="dialog__header">
              <Dialog.Title class="dialog__title text-xl">Settings</Dialog.Title>
              <Dialog.CloseButton class="dialog__close-button h-4 w-4">
                <FaSolidXmark />
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class="dialog__description">
              <section>
                <div class="mb-4">
                  <h3 class="mb-1 text-lg">Before Run</h3>
                  <p class="text-xs dark:text-gray-400">
                    These settings control any action that need to be taken before the
                    program is run, or before starting debug.
                  </p>
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="Clear Registers"
                    lens={createLens(['beforeRun', 'clearRegisters'])}
                  />
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="Clear Flags"
                    lens={createLens(['beforeRun', 'clearFlags'])}
                  />
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="Reset All Memory Locations"
                    lens={createLens(['beforeRun', 'clearAllMemoryLocations'])}
                  />
                </div>
              </section>
              <section class="mt-4 pt-4 border-t border-t-gray-200 dark:border-t-gray-700">
                <div class="mb-4">
                  <h3 class="mb-1 text-lg">Alert</h3>
                  <p class="text-xs dark:text-gray-400">
                    These settings control the display of notifications after certain
                    actions.
                  </p>
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="After Program Ran Successfully"
                    lens={createLens(['alert', 'afterSuccessfulRun'])}
                  />
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="After Clear All Operation"
                    lens={createLens(['alert', 'afterClearAll'])}
                  />
                </div>
                <div class="mb-2 w-full">
                  <SettingSwitch
                    label="After Debugging Stop"
                    lens={createLens(['alert', 'afterDebugStop'])}
                  />
                </div>
              </section>
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function SettingSwitch(props) {
  const setSetting = (value) => {
    setStore("settings", produce((settings) => {
      props.lens.set(settings, value);
      localStorage.setItem("settings", JSON.stringify(settings));
    }));
  };

  return (
    <Switch class="switch w-full flex" checked={props.lens.get(store.settings)} onChange={setSetting}>
      <Switch.Label class="switch__label">{props.label}</Switch.Label>
      <Switch.Input class="switch__input" />
      <div class="grow"></div>
      <Switch.Control class="switch__control">
        <Switch.Thumb class="switch__thumb" />
      </Switch.Control>
    </Switch>
  );
}
