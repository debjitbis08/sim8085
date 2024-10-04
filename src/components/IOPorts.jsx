import { For, createEffect, createMemo, createSignal, useContext } from 'solid-js';
import { AiOutlineClear, AiOutlineExpand, AiOutlineExpandAlt, AiOutlineFullscreen, AiOutlinePlus, AiOutlineEdit, AiOutlineSave, AiFillEye, AiFillEdit } from 'solid-icons/ai';
import { Tooltip } from "@kobalte/core/tooltip";
import { Dialog } from "@kobalte/core/dialog";
import { toByteString } from '../utils/NumberFormat';
import { store, setStore } from '../store/store.js';
import { setIOPort } from '../core/simulator.js';

export function IOPorts () {
  const updateIOPort = (location, value) => {
    setStore(
      "io",
      location,
      value
    );
    setIOPort(store, location, value);
  };
  return (
    <div class="h-full flex flex-col">
      <div class="flex border-b-2 dark:border-b-gray-600 mb-4">
        <h2 class="text-xl grow pb-1">I/O Ports</h2>
      </div>
      <div class="h-full overflow-y-auto grow min-h-0 pr-2">
        <For each={store.io}>
            {
              (item, index) => (<IOPortRow location={index()} value={item} onSave={updateIOPort} />)
            }
          {/* {(item, index) => (
            <div>
              #{index()} {item}
            </div>
          )} */}
        </For>
      </div>
    </div>
  )
}

function IOPortRow(props) {
  const [editing, setEditing] = createSignal(false);
  const [value, setValue] = createSignal(toByteString(props.value));

  const handleInputChange = (setter) => (e) => {
    const newValue = e.target.value.toUpperCase();
    if (/^[0-9A-F]{0,2}$/.test(newValue)) {
      setter(newValue);
    }
  };

  const handleKeyOrBlur = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      saveValue();
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  const saveValue = () => {
    const val = parseInt(value(), 16);
    if (!isNaN(val) && props.onSave) {
      props.onSave(props.location, val);
    }
    setEditing(false);
  };

  const startEditing = () => setEditing(true);

  return (
    <div key={props.value} class="flex justify-between items-center py-1 px-1 hover:bg-gray-400 dark:hover:bg-gray-600">
      <span class="font-mono">0x{props.location.toString(16).padStart(2, '0').toUpperCase()}</span>
      <span class="flex items-center gap-2">
        {
        editing() ? (
          <input
            class="font-mono w-5 border-b border-b-gray-800 dark:border-b-gray-400 dark:bg-transparent"
            value={value()}
            onInput={handleInputChange(setValue)}
            onKeyDown={handleKeyOrBlur}
            onFocus={(e) => e.target.select()}
            maxlength="2"
            autofocus
          />
        ) : (
          <span
            class={`font-mono cursor-pointer ${props.value ? 'text-orange-600 dark:bg-transparent dark:border-b-green-300 dark:text-yellow-400' : 'dark:text-gray-600'}`}
            onDblClick={() => setEditing(true)}
          >{toByteString(props.value)}</span>
        )
        }
        <Tooltip>
          <Tooltip.Trigger class="tooltip__trigger">
            <button type="button" onClick={() => editing() ? saveValue() : startEditing() }>
              {editing() ? <AiOutlineSave /> : <AiOutlineEdit /> }
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="tooltip__content">
              <Tooltip.Arrow />
              <p>{editing() ? "Save Memory Value" : "Edit Memory Value"}</p>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </span>
    </div>
  );
}
