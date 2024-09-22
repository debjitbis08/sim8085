import { createMemo, createSignal, useContext } from 'solid-js';
import { StoreContext } from './StoreContext';
import { AiOutlineClear, AiOutlineExpand, AiOutlineExpandAlt, AiOutlineFullscreen, AiOutlinePlus } from 'solid-icons/ai';
import { Tooltip } from "@kobalte/core/tooltip";
import { toByteString } from '../utils/NumberFormat';

export default function MemoryList({ memory, threshold = 4 }) {
  const { store, setStore } = useContext(StoreContext);
  const [customRanges, setCustomRanges] = createSignal([]);
  const [inputRange, setInputRange] = createSignal({ start: '', end: '' });
  const [currentRange, setCurrentRange] = createSignal({ start: null, end: null });
  const [isAddingCustom, setIsAddingCustom] = createSignal(false);

  const updateMemoryCell = (location, value) => {
    console.log(`Updating memory location ${location} with ${value}.`);
    setStore(
      "memory",
      location,
      value
    );
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
            ranges.push({ start, end: index - zeroCount });
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
    console.log(start, end);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      setCustomRanges([...customRanges(), { start, end }]);
      setIsAddingCustom(false);
    }
  };

  // Function to render memory within a range
  const renderMemoryInRange = (start, end) => {
    return store.memory.slice(start, end + 1).map((value, index) => {
      const address = start + index;
      return (
        <MemoryLocationRow location={address} value={value} onSave={updateMemoryCell} />
      );
    });
  };

  return (
    <div>
      <div class="flex border-b-2 dark:border-b-gray-600">
        <h2 class="text-xl grow pb-1">Memory</h2>
        <div class="flex gap-2">
          <Tooltip>
            <Tooltip.Trigger class="tooltip__trigger">
              <button onClick={() => { }}>
                <AiOutlineFullscreen class="font-bold" />
              </button>
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
              <button class="text-red-700" onClick={() => { }}>
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
        <div class="grow max-w-100">
          <div class="flex items-center gap-2 font-mono text-xs">
            {(findDataRanges(store.memory).concat(customRanges())).map((range, index) => (
              <button
                key={index}
                class={`py-1 px-2 rounded-sm border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 ${currentRange().start === range.start && currentRange().end === range.end ? 'bg-gray-100 dark:bg-gray-700' : ''} hover:bg-gray-100 dark:hover:bg-gray-700`}
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
            ))}
          </div>
        </div>
        <button onClick={() => setIsAddingCustom(isAddingCustom => !isAddingCustom)}>
          <AiOutlinePlus class={`transition-transform ${isAddingCustom() ? 'rotate-45' : 'rotate-0'}`} />
        </button>
      </div>
        <div class={`flex items-center ${isAddingCustom() ? '' : 'hidden'}`}>
        <input
          type="text"
          class="w-20 p-1 border border-gray-300 mr-2"
          placeholder="Start"
          value={inputRange().start}
          onInput={(e) => setInputRange({ ...inputRange(), start: e.target.value })}
        />
        <input
          type="text"
          class="w-20 p-1 border border-gray-300 mr-2"
          placeholder="End"
          value={inputRange().end}
          onInput={(e) => setInputRange({ ...inputRange(), end: e.target.value })}
        />
        <button
          class="p-1 bg-green-500 text-white rounded"
          onClick={addCustomRange}
        >
          Add Range
        </button>
      </div>

      { currentRange().start != null && currentRange().end != null ? (
        <div class="memory-list mt-4">
          <div>
            <h3 class="font-bold mb-2">
              <div class="text-sm text-gray-400 dark:text-gray-400">
                <span>Displaying Memory Locations from </span>
                <span>0x{currentRange().start.toString(16).padStart(4, '0').toUpperCase()}</span>
                <span> to </span>
                <span>0x{currentRange().end.toString(16).padStart(4, '0').toUpperCase()}</span>
              </div>
            </h3>
              {renderMemoryInRange(currentRange().start, currentRange().end)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MemoryLocationRow(props) {
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
    <div key={props.value} class="flex justify-between items-center py-1 px-1 hover:bg-gray-400 dark:hover:bg-gray-600">
      <span class="font-mono">0x{props.location.toString(16).padStart(4, '0').toUpperCase()}</span>
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
    </div>
  );
}
