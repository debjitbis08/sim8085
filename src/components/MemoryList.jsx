import { createEffect, createMemo, createSignal, onMount, useContext } from 'solid-js';
import { StoreContext } from './StoreContext';
import { AiOutlineClear, AiOutlineExpand, AiOutlineExpandAlt, AiOutlineFullscreen, AiOutlinePlus, AiOutlineEdit, AiOutlineSave, AiFillEye, AiFillEdit } from 'solid-icons/ai';
import { Tooltip } from "@kobalte/core/tooltip";
import { Dialog } from "@kobalte/core/dialog";
import { toByteString } from '../utils/NumberFormat';
import { MemoryGrid } from './MemoryGrid';
import { TextTooltip } from './TextTooltip';
import { VsEmptyWindow } from 'solid-icons/vs';
import { HiSolidTrash } from 'solid-icons/hi';
import { store, setStore } from '../store/store.js';
import { setAllMemoryLocations, setMemoryLocation } from '../core/simulator.js';

export default function MemoryList({ threshold = 4 }) {
  const [customRanges, setCustomRanges] = createSignal([]);
  const [inputRange, setInputRange] = createSignal({ start: '', end: '' });
  const [currentRange, setCurrentRange] = createSignal({ start: null, end: null });
  const [editingCustom, setEditingCustom] = createSignal({ start: null, end: null });
  const [isAddingCustom, setIsAddingCustom] = createSignal(false);
  const [tabPressed, setTabPressed] = createSignal({
    group: null,
    location: null
  });

  const updateMemoryCell = (location, value) => {
    setStore(
      "memory",
      location,
      value
    );
    setMemoryLocation(store, location, value);
  };

  // Function to find all ranges with data
  const findDataRanges = (memory) => {
    let ranges = [];
    let start = null;
    let zeroCount = 0;

    memory.forEach((value, index) => {
      if (value !== 0) {
        if (start === null) {
          start = index; // Mark start of a range
        }
        zeroCount = 0; // Reset zero count when a non-zero value is found
      } else {
        if (start !== null) {
          zeroCount++;
          if (zeroCount >= threshold) {
            ranges.push({ start, end: index - zeroCount, isCustom: false });
            start = null;
            zeroCount = 0;
          }
        }
      }
    });

    // Handle final range at the end
    if (start !== null) {
      ranges.push({ start, end: memory.length - 1 });
    }

    return ranges;
  };

  // Function to add a new custom range
  const addCustomRange = () => {
    const start = parseInt(inputRange().start, 16);
    const end = parseInt(inputRange().end, 16);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      setCustomRanges([...customRanges(), { start, end, isCustom: true }]);
      setIsAddingCustom(false);
    }
  };

  const deleteCustomRange = (range) => {
    if (!range.isCustom) return;

    const updatedCustomRanges = customRanges().filter(customRange => customRange.start !== range.start || customRange.end !== range.end);
    setCustomRanges(updatedCustomRanges);
  };

  const editCustomRange = (range) => {
    if (!range.isCustom) return;

    setInputRange({ start: range.start.toString(16), end: range.end.toString(16) });
    setEditingCustom(range);
  };

  const addOrEditCustomRange = () => {
    if (isAddingCustom()) addCustomRange();
    else if (editingCustom().start !== null && editingCustom().end !== null) {
      deleteCustomRange({ ...editingCustom(), isCustom: true });
      addCustomRange();
      setCurrentRange({ ...editingCustom(), isCustom: true });
      setEditingCustom({ start: null, end: null });
    }
  };

  const handleOnTab = ({ group, location }) => {
    console.log('handle on tab');
    setTabPressed({
      group,
      location
    });
  };

  // Function to render memory within a range
  const renderMemoryInRange = (start, end) => {
    return store.memory.slice(start, end + 1).map((value, index) => {
      const address = start + index;
      return (
        <MemoryLocationRow
          location={address}
          value={value}
          onSave={updateMemoryCell}
          onTab={handleOnTab}
          tabPressed={tabPressed()}
          group={`${start}-${end}`}
        />
      );
    });
  };

  const dataRanges = createMemo(() => {
    const memoryRanges = findDataRanges(store.memory);
    const customRangesList = customRanges();

    // Function to check if a memory range is within any custom range
    const isWithinCustomRange = (range, customRangeList) => {
      return customRangeList.some(customRange => {
        return (
          range.start >= customRange.start && range.end <= customRange.end
        );
      });
    };

    // Filter out memory ranges that are within custom ranges
    const combinedRanges = memoryRanges.filter(range => {
      return !isWithinCustomRange(range, customRangesList);
    });

    // Finally, return the combined memory ranges and the custom ranges
    return combinedRanges.concat(customRangesList);
  });

  const isCurrentRangeValid = (currentRange, allRanges) => {
    return (currentRange.start !== null && currentRange.end !== null)
      && allRanges.some(range => currentRange.start === range.start && currentRange.end === range.end);
  };

  createEffect(() => {
    const ranges = dataRanges();
    if (ranges.length > 0 && !isCurrentRangeValid(currentRange(), ranges)) {
      setCurrentRange(ranges[0]);
    } else if (ranges.length === 0) {
      setCurrentRange({ start: null, end: null });
    }
  });

  const resetAllLocations = () => {
    setStore("memory", (memory) => memory.map(() => 0));
    setAllMemoryLocations(store);
    setStore("programState", (programState) => programState === 'Loaded' ? 'Idle' : programState);
  };

  return (
    <div class="h-full flex flex-col">
      <div class="flex border-b-2 dark:border-b-gray-600">
        <h2 class="text-xl grow pb-1">Memory</h2>
        <div class="flex gap-2">
          <Tooltip>
            <Tooltip.Trigger class="tooltip__trigger">
              <Dialog>
                <Dialog.Trigger class="dialog__trigger">
                  <AiOutlineFullscreen class="font-bold" />
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay class="dialog__overlay fixed z-50 inset-0 backdrop-blur-sm" />
                  <div class="dialog__positioner fixed z-50 inset-0 flex items-center justify-center">
                    <Dialog.Content class="dialog__content p-4 bg-gray-100 dark:bg-gray-800 min-w-[600px] border border-gray-400 dark:border-gray-600 rounded">
                      <div class="dialog__header flex items-center">
                        <Dialog.Title class="dialog__title grow">Full Memory View</Dialog.Title>
                        <Dialog.CloseButton class="dialog__close-button">
                          <AiOutlinePlus class="transition-transform rotate-45" />
                        </Dialog.CloseButton>
                      </div>
                      <Dialog.Description class="dialog__description mt-4">
                        <div class="flex items-center px-2">
                          <MemoryGrid />
                        </div>
                      </Dialog.Description>
                    </Dialog.Content>
                  </div>
                </Dialog.Portal>
              </Dialog>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="tooltip__content">
                <Tooltip.Arrow />
                <p>View All Memory Locations</p>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger class="tooltip__trigger">
              <button class="text-red-700" onClick={resetAllLocations}>
                <AiOutlineClear />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="tooltip__content">
                <Tooltip.Arrow />
                <p>Reset All Memory Locations</p>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
      </div>
      <div class="flex justify-between items-center gap-1 mb-4 mt-2">
        <div class="w-full">
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs">
            {dataRanges().map((range, index) => (
              <div class="flex items-center gap-1 border border-gray-300 dark:border-gray-700" key={index}>
                <button
                  class={`py-1 px-2 rounded-sm border-r border-r-border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 ${currentRange().start === range.start && currentRange().end === range.end ? 'bg-gray-200 dark:bg-gray-700' : ''} hover:bg-gray-300 dark:hover:bg-gray-700`}
                  onClick={() => setCurrentRange({
                    start: range.start,
                    end: range.end
                  })}
                >
                  <div class="flex items-center gap-1">
                    <span>0x{range.start.toString(16).toUpperCase()}</span>
                    { range.end !== range.start ? (
                      <>
                        <span> - </span>
                        <span>0x{range.end.toString(16).toUpperCase()}</span>
                      </>
                    ) : null
                    }
                  </div>
                </button>
                { range.isCustom ? (
                  <>
                    <button onClick={() => editCustomRange(range)}>
                      <AiFillEdit />
                    </button>
                    <button class="pr-1" onClick={() => deleteCustomRange(range)}>
                      <HiSolidTrash />
                    </button>
                  </>
                ) : null
                }
              </div>
            ))}
          </div>
        </div>
        <Tooltip>
          <Tooltip.Trigger class="tooltip__trigger">
            <button onClick={() => setIsAddingCustom(isAddingCustom => !isAddingCustom)}>
              <AiOutlinePlus class={`transition-transform ${isAddingCustom() || editingCustom().start !== null ? 'rotate-45' : 'rotate-0'}`} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="tooltip__content">
              <Tooltip.Arrow />
              <p>Watch a memory range</p>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>
      <div class={`w-full ${isAddingCustom() || editingCustom().start !== null ? '' : 'hidden'}`}>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-1 border-b border-b-gray-300 min-w-0">
            <span class="text-gray-400 dark:text-gray-500">0x</span>
            <input
              type="text"
              class="p-1 bg-transparent outline-none"
              placeholder="Start"
              value={inputRange().start}
              onInput={(e) => setInputRange({ ...inputRange(), start: e.target.value })}
            />
          </div>
          <div class="flex items-center gap-1 border-b border-b-gray-300 min-w-0">
            <span class="text-gray-400 dark:text-gray-500">0x</span>
            <input
              type="text"
              class="p-1 bg-transparent outline-none"
              placeholder="End"
              value={inputRange().end}
              onInput={(e) => setInputRange({ ...inputRange(), end: e.target.value })}
            />
          </div>
        </div>
        <div class="mt-2">
          <button
            class="flex items-center justify-center gap-2 w-full p-1 rounded border border-gray-400 hover:bg-gray-500 dark:border-gray-600 hover:dark:bg-gray-900"
            onClick={addOrEditCustomRange}
          >
            <AiFillEye />
            <span>Watch Range</span>
          </button>
        </div>
      </div>

      {currentRange().start != null && currentRange().end != null ? (
        <div class="memory-list mt-4 grow min-h-0">
          <div class="h-full flex flex-col">
            <h3 class="font-bold mb-2">
              <div class="text-sm text-gray-400 dark:text-gray-400">
                <span>Displaying Memory Locations from </span>
                <span>0x{currentRange().start.toString(16).padStart(4, '0').toUpperCase()}</span>
                <span> to </span>
                <span>0x{currentRange().end.toString(16).padStart(4, '0').toUpperCase()}</span>
              </div>
            </h3>
            <div class="h-full overflow-y-auto grow min-h-0 pr-2">
              {renderMemoryInRange(currentRange().start, currentRange().end)}
            </div>
          </div>
        </div>
      ) : (
        <p class="text-gray-400 dark:text-gray-500 text-center mt-4">
          No locations have any data yet. You may add a memory range to watch using the add button above.
        </p>
      )}
    </div>
  );
}

function MemoryLocationRow(props) {
  const [editing, setEditing] = createSignal(false);
  const [value, setValue] = createSignal(toByteString(props.value));
  let inputRef;
  let containerRef;

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus();
      }
    });
  };

  const saveValue = () => {
    const val = parseInt(value(), 16);
    if (!isNaN(val) && props.onSave) {
      props.onSave(props.location, val);
    }
    setEditing(false);
  };

  createEffect(() => {
    if (props.tabPressed.group === props.group && props.tabPressed.location === props.location) {
      startEditing();
    }
  });

  const handleInputChange = (setter) => (e) => {
    const newValue = e.target.value.toUpperCase();
    if (/^[0-9A-F]{0,2}$/.test(newValue)) {
      setter(newValue);
    }
  };

  const handleKeyOrBlur = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      props.onTab({
        group: props.group,
        location: props.location + (e.shiftKey ? -1 : 1)
      });
      saveValue();
      return;
    }
    if (e.key === 'Enter' || e.type === 'blur') {
      saveValue();
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <div
      key={props.value}
      class="flex justify-between items-center py-1 px-1 hover:bg-gray-400 dark:hover:bg-gray-600"
      ref={containerRef}
    >
      <span class="font-mono">0x{props.location.toString(16).padStart(4, '0').toUpperCase()}</span>
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
            autofocus={true}
            ref={inputRef}
          />
        ) : (
          <span
            class={`font-mono cursor-pointer ${props.value ? 'text-orange-600 dark:bg-transparent dark:border-b-green-300 dark:text-yellow-400' : 'dark:text-gray-600'}`}
            onDblClick={startEditing}
          >{toByteString(props.value)}</span>
        )
        }
        <button
          type="button"
          onClick={() => editing() ? saveValue() : startEditing() }
          title={editing() ? "Save Memory Value" : "Edit Memory Value"}
        >
          {editing() ? <AiOutlineSave /> : <AiOutlineEdit /> }
        </button>
      </span>
    </div>
  );
}
