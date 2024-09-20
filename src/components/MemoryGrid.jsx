import { createEffect, createMemo, createSignal, useContext } from "solid-js";
import { StoreContext } from "./StoreContext";
import { AiOutlineClear, AiOutlineSearch } from "solid-icons/ai";
import { toByteString } from "../utils/NumberFormat";
import { createVirtualizer } from '@tanstack/solid-virtual';

export function MemoryGrid() {
  const { store, setStore } = useContext(StoreContext);

  let parentRef;

  const rowVirtualizer = createVirtualizer({
    count: 65536 / 16,
    getScrollElement: () => parentRef,
    estimateSize: () => 37,
    overscan: 5
  });

  const hexChars = Array(16).fill(0).map((_, i) => i.toString(16).toUpperCase());

  const updateMemoryCell = (location, value) => {
    console.log(`Updating memory cell ${location}, with value ${value}`);
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

  return (
    <div>
      <div class="flex pb-2">
          <h2 class="text-xl grow pb-2">Memory View</h2>
          <div class="relative mr-2 border-b border-b-gray-300">
            <label for="GoToAddress" class="sr-only">Jump To Address</label>
            <span
              class="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-content-center text-gray-500 font-mono sm:text-sm"
            >0x</span>
            <input
              type="text"
              id="GoToAddress"
              placeholder="Jump to Address"
              class="w-full rounded-md p-2 shadow-sm sm:text-sm pl-10"
              onKeyDown={handleKey}
            />

            <button
              type="button"
              class="absolute inset-y-0 end-0 grid w-10 place-content-center text-gray-500"
            >
              <AiOutlineSearch />
            </button>
          </div>
          <button title="Clear All Memory Locations" class="text-red-700">
            <AiOutlineClear />
          </button>
      </div>
      <div class="font-mono text-sm">
        <div class="flex items-center gap-6">
          <span class="invisible">0000</span>
          <div class="flex text-xs items-center gap-4 text-gray-600 py-2">
          {
            hexChars.map((value) => (
                <span><span>+</span>{value}</span>
            ))
          }
          </div>
        </div>
        <div class="h-[50vh] overflow-y-auto" ref={parentRef}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const location = virtualRow.index * 16;
                const startAddress = (location).toString(16).padStart(4, '0').toUpperCase();
                return (
                  <div class="flex items-center gap-6"  style={{ position: 'absolute', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                    <span class="font-bold text-gray-600">{startAddress}</span>
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
          class="font-mono text-xs w-5 border-b border-b-gray-800"
          value={value()}
          onInput={handleInputChange(setValue)}
          onKeyDown={handleKeyOrBlur}
          onFocus={(e) => e.target.select()}
          maxlength="2"
          autofocus
        />
      ) : (
        <span
          class={`font-mono cursor-pointer text-xs ${props.value ? 'bg-green-200' : ''}`}
          onDblClick={() => setEditing(true)}
        >{toByteString(props.value)}</span>
      )
      }
    </span>
  )
}

function groupMemory(memory) {
  const groupedMemory = [];

  for (let i = 0; i < memory.length; i += 16) {
    // Group the next 16 elements
    groupedMemory.push([i, memory.slice(i, i + 16)]);
  }

  return groupedMemory;
}

// const key = (i / 16).toString(16).padStart(3, '0').toUpperCase();
