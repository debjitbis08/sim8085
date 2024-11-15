import { useContext } from "solid-js";
import { StoreContext } from "./StoreContext";
import { AiOutlineClear } from "solid-icons/ai";
import { produce } from "solid-js/store";
import { store, setStore } from "../store/store";
import { setFlags, setFullState } from "../core/simulator";

export function Flags() {

  const updateFlag = (flagId, isChecked) => {
    setStore(
      "flags",
      flagId,
      isChecked
    );
    setFlags(store);
  };

  const clearFlags = () => {
    setStore(
      "flags",
      produce((flags) => {
        Object.keys(flags).forEach((flagId) => flags[flagId] = false);
      })
    );
    setFlags(store);
  };

  return (
    <div>
      <div class="flex border-b border-b-inactive-border">
          <h2 class="text-xl grow pb-1">Flags</h2>
          <button title="Reset Flags" class="text-red-foreground" onClick={clearFlags}>
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
    <div class="flex items-center gap-1 my-2 p-1 hover:bg-active-background">
      <label htmlFor={id} className="w-full flex cursor-pointer items-center">
        <div class="grow">
          <strong className="font-medium">{props.name}</strong>
        </div>
        <div className="flex items-center">
          &#8203;
          <input
            type="checkbox"
            className="size-4 rounded border-gray-300 checked:accent-terminal"
            id={id}
            checked={props.value}
            onChange={(e) => props.onSave(e.target.checked)}
          />
        </div>
      </label>
    </div>
  );
}
