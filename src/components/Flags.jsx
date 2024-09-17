import { useContext } from "solid-js";
import { StoreContext } from "./StoreContext";
import { AiOutlineClear } from "solid-icons/ai";
import { produce } from "solid-js/store";

export function Flags() {
  const { store, setStore } = useContext(StoreContext);

  const updateFlag = (flagId, isChecked) => {
    setStore(
      "flags",
      flagId,
      isChecked
    );
  };

  const clearFlags = () => {
    setStore(
      "flags",
      produce((flags) => {
        Object.keys(flags).forEach((flagId) => flags[flagId] = false);
      })
    );
  };

  return (
    <div>
      <div class="flex border-b-2">
          <h2 class="text-xl grow">Flags</h2>
          <button title="Clear Registers" class="text-red-700" onClick={clearFlags}>
            <AiOutlineClear />
          </button>
      </div>
      <div>
          {
            Object.keys(store.flags).map((flagId) => (
              <Flag
                id={flagId}
                name={flagId.toUpperCase()}
                value={store.flags[flagId]}
                onSave={(isChecked) => updateFlag(flagId, isChecked)}
              />
            ))
          }
      </div>
    </div>
  );
}

function Flag(props) {
  const id = `flag-${props.id}`;
  return (
    <div class="flex items-center gap-1 my-2 p-1 hover:bg-gray-200">
      <label htmlFor={id} className="w-full flex cursor-pointer items-center">
        <div class="grow">
          <strong className="font-medium text-gray-900">{props.name}</strong>
        </div>
        <div className="flex items-center">
          &#8203;
          <input
            type="checkbox"
            className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900"
            id={id}
            checked={props.value}
            onChange={(e) => props.onSave(e.target.checked)}
          />
        </div>
      </label>
    </div>
  );
}
