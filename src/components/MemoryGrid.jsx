import { createEffect, createMemo, createSignal, useContext } from "solid-js";
import { StoreContext } from "./StoreContext";
import { AiOutlineClear, AiOutlineSearch } from "solid-icons/ai";
import { toByteString } from "../utils/NumberFormat";
import { createVirtualizer } from '@tanstack/solid-virtual';
import { store, setStore } from '../store/store.js';

export function MemoryGrid() {
  let parentRef;

  const rowVirtualizer = createVirtualizer({
    count: 65536 / 16,
    getScrollElement: () => parentRef,
    estimateSize: () => 37,
    overscan: 5
  });

  const hexChars = Array(16).fill(0).map((_, i) => i.toString(16).toUpperCase());

  const updateMemoryCell = (location, value) => {
    setStore(
      "memory",
      location,
      value
    );
  };

  const scrollToCell = (location) => {
    rowVirtualizer.scrollToIndex(Math.floor(location / 16));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      scrollToCell(parseInt(e.target.value, 16));
    }
  };

  const resetAllLocations = () => {
    setStore("memory", (memory) => memory.map(() => 0));
    setStore("programState", (programState) => programState === 'Loaded' ? 'Idle' : programState);
  };

  return (
    <div>
      <div class="flex pb-2">
          <h2 class="text-xl grow pb-2"></h2>
          <div class="relative mr-2 border-b border-b-gray-300">
            <label for="GoToAddress" class="sr-only">Jump To Address</label>
            <span
              class="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-content-center text-gray-500 dark:text-gray-400 font-mono sm:text-sm"
            >0x</span>
            <input
              type="text"
              id="GoToAddress"
              placeholder="Jump to Address"
              class="w-full rounded-md p-2 shadow-sm sm:text-sm pl-10 dark:bg-transparent"
              onKeyDown={handleKey}
            />

            <button
              type="button"
              class="absolute inset-y-0 end-0 grid w-10 place-content-center text-gray-500"
            >
              <AiOutlineSearch />
            </button>
          </div>
          <button title="Clear All Memory Locations" class="text-red-700" onClick={resetAllLocations}>
            <AiOutlineClear />
          </button>
      </div>
      <div class="font-mono text-sm">
        <div class="flex items-center gap-6">
          <span class="invisible">0000</span>
          <div class="flex text-xs items-center gap-4 text-gray-600 dark:text-gray-400 py-2">
          {
            hexChars.map((value) => (
                <span><span>+</span>{value}</span>
            ))
          }
          </div>
        </div>
          <div class="h-[50vh] overflow-x-hidden overflow-y-auto flex" style={{ width: "calc(100% + 20px)" }}ref={parentRef}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: "calc(100% + 20px)", "flex-shrink": 0 }}>
            {
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const location = virtualRow.index * 16;
                const startAddress = (location).toString(16).padStart(4, '0').toUpperCase();
                return (
                  <div class="flex items-center gap-6"  style={{ position: 'absolute', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                    <span class="font-bold text-gray-600 dark:text-gray-400">{startAddress}</span>
                    <div class="flex items-center gap-4 border-t border-t-gray-300 py-2">
                      {
                        Array.from({ length: 16 }).map((_, i) => (
                          <div>
                            <MemoryCell location={location + i} value={store.memory[location + i]} onSave={updateMemoryCell} />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoryCell(props) {
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

  return (
    <span>
      {
      editing() ? (
        <input
          class="font-mono text-xs w-5 border-b border-b-gray-800 dark:bg-transparent"
          value={value()}
          onInput={handleInputChange(setValue)}
          onKeyDown={handleKeyOrBlur}
          onFocus={(e) => e.target.select()}
          maxlength="2"
          autofocus
        />
      ) : (
        <span
          class={`font-mono cursor-pointer text-xs ${props.value ? 'text-orange-600 dark:bg-transparent dark:border-b-green-300 dark:text-yellow-400' : 'dark:text-gray-600'}`}
          onDblClick={() => setEditing(true)}
        >{props.value === 0 ? '--' : toByteString(props.value)}</span>
      )
      }
    </span>
  )
}
