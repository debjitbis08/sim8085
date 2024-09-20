import { AiOutlineClear, AiOutlineEdit, AiOutlineSave } from 'solid-icons/ai'
import { useContext, createSignal, createEffect } from 'solid-js';
import { StoreContext } from './StoreContext';
import { produce } from 'solid-js/store';

export function Registers() {
  const { store, setStore } = useContext(StoreContext);

  const updateRegisterValue = (registerId, high, low) => {
    setStore(
      "registers",
      registerId,
      produce((register) => {
        register.high = high;
        register.low = low;
      })
    );
  };

  const updateAccumulator = (value) => {
    setStore(
      "accumulator",
      value
    );
  };

  const clearRegisters = () => {
    setStore(
      "accumulator",
      0
    );
    setStore(
      "registers",
      produce((registers) => {
        for(const register of Object.values(registers)) {
          register.high = 0;
          register.low = 0;
        }
      })
    );
  };

  return (
    <div>
      <div class="flex border-b-2 dark:border-b-gray-600">
          <h2 class="text-xl grow pb-1">Registers</h2>
          <button title="Clear Registers" class="text-red-700" onClick={clearRegisters}>
            <AiOutlineClear />
          </button>
      </div>
      <div>
          <Register name="A/PSW" high={store.accumulator} low={getPSW(store.flags)} canEditLow={false} onSave={updateAccumulator}/>
          {
            Object.keys(store.registers).map((registerId) => (
              <Register
                name={registerId.toUpperCase()}
                high={store.registers[registerId].high}
                low={store.registers[registerId].low}
                onSave={(high, low) => updateRegisterValue(registerId, high, low)}
              />
            ))
          }
      </div>
    </div>
  );
}

function Register(props) {
  const [editing, setEditing] = createSignal(false);
  const [highValue, setHighValue] = createSignal(toByteString(props.high));
  const [lowValue, setLowValue] = createSignal(toByteString(props.low));

  createEffect(() => {
    if (!editing()) {
      setHighValue(toByteString(props.high));
      setLowValue(toByteString(props.low));
    }
  });

  const startEditing = () => {
    setEditing(true);
  };

  // Function to handle input change
  const handleInputChange = (setter) => (e) => {
    const newValue = e.target.value.toUpperCase();
    if (/^[0-9A-F]{0,2}$/.test(newValue)) {
      setter(newValue);
    }
  };

  // Function to handle saving the value
  const saveValue = () => {
    const high = parseInt(highValue(), 16);
    const low = parseInt(lowValue(), 16);
    if (!isNaN(high) && !isNaN(low)) {
      props.onSave(high, low);
    }
    setEditing(false);
  };

  // Handle Enter key and blur event
  const handleKeyOrBlur = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      saveValue();
    }
  };

  return (
    <div class="flex items-center gap-1 my-2 p-1 hover:bg-gray-200 hover:dark:bg-gray-600">
      <span class="font-bold grow">{props.name}</span>
      <span class="font-mono text-gray-600 dark:text-gray-400">0x</span>
      { editing() ? (
        <input
          class="font-mono w-5 border-b border-b-gray-800"
          value={highValue()}
          onInput={handleInputChange(setHighValue)}
          onKeyDown={handleKeyOrBlur}
          onFocus={(e) => e.target.select()}
          maxlength="2"
          autofocus
        />
      ) : (
        <span
          class="font-mono cursor-pointer"
          onDblClick={() => setEditing(true)}
        >
          {toByteString(props.high)}
        </span>
      )}
      { editing() && (props.canEditLow !== undefined && props.canEditLow !== false) ? (
        <input
          class="font-mono w-5 border-b border-b-gray-800"
          value={lowValue()}
          onInput={handleInputChange(setLowValue)}
          onKeyDown={handleKeyOrBlur}
          onFocus={(e) => e.target.select()}
          maxlength="2"
        />
      ) : (
          <span
            class="font-mono cursor-pointer"
            onDblClick={() => setEditing(true)}
          >
            {toByteString(props.low)}
          </span>
      )}
        <button type="button" onClick={() => editing() ? saveValue() : startEditing () }>
        {editing() ? <AiOutlineSave /> : <AiOutlineEdit /> }
      </button>
    </div>
  );
}

function toByteString(n) {
  if (n < 16) return `0${toRadix(16, n)}`
  else return toRadix(16, n);
}

function toRadix(r, n) {
    function getChr(c) {
        return c < 10 ? c.toString() : String.fromCharCode(87 + c);
    }

    function getStr(b) {
        return n < b ? getChr(n) : toRadix(r, Math.floor(n / b)) + getChr(n % b);
    }

    if (r >= 2 && r <= 16) {
        return getStr(r).toUpperCase();
    } else {
        return n.toString().toUpperCase();
    }
}

function getPSW(flags) {
  // Convert booleans to 1 (true) or 0 (false)
  return ((flags.s ? 1 : 0) << 7) |  // Sign flag at bit 7
         ((flags.z ? 1 : 0) << 6) |  // Zero flag at bit 6
         (0 << 5) |                  // Bit 5 is always 0
         ((flags.ac ? 1 : 0) << 4) | // Auxiliary carry flag at bit 4
         (0 << 3) |                  // Bit 3 is always 0
         ((flags.p ? 1 : 0) << 2) |  // Parity flag at bit 2
         (1 << 1) |                  // Bit 1 is always 1
         (flags.c ? 1 : 0);          // Carry flag at bit 0
}
