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
      <div class="flex border-b border-b-secondary-border mb-4">
        <h2 class="text-xl grow pb-1">I/O Ports</h2>
      </div>
      <div class="h-full overflow-y-auto grow min-h-0 pr-2">
        <For each={store.io}>
            {
              (item, index) => (<IOPortRow location={index()} value={item} onSave={updateIOPort} />)
            }
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
    <div key={props.value} class="flex justify-between items-center py-1 px-1 hover:bg-active-background">
      <span class="font-mono">0x{props.location.toString(16).padStart(2, '0').toUpperCase()}</span>
      <span class="flex items-center gap-2">
        {
        editing() ? (
          <input
            class="font-mono w-5 border-b border-b-main-border bg-main-background"
            value={value()}
            onInput={handleInputChange(setValue)}
            onKeyDown={handleKeyOrBlur}
            onFocus={(e) => e.target.select()}
            maxlength="2"
            autofocus
          />
        ) : (
          <span
            class={`font-mono cursor-pointer ${props.value ? 'text-orange-foreground' : 'text-inactive-foreground'}`}
            onDblClick={() => setEditing(true)}
          >{toByteString(props.value)}</span>
        )
        }
        <button type="button" onClick={() => editing() ? saveValue() : startEditing() } title={editing() ? "Save IO Value" : "Edit IO Value"}>
          {editing() ? <AiOutlineSave /> : <AiOutlineEdit /> }
        </button>
      </span>
    </div>
  );
}
