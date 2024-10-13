import { Toast, toaster } from "@kobalte/core/toast";
import { VsClose } from "solid-icons/vs";
import { FaSolidCircleCheck, FaSolidCircleInfo, FaSolidCircleXmark } from 'solid-icons/fa'

export function showToaster(type, title, message) {
  toaster.show(props => {
    const color = type === 'info' ? 'blue' : type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue';
    return (
      <Toast toastId={props.toastId} class="toast border border-gray-500 p-4 rounded-md bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-between gap-4">
        <div class="text-gray-600 dark:text-gray-400 p-1 w-full">
          <div class="flex items-center gap-2 pb-2">
          <span class={`text-${color}-400 dark:text-${color}-600`}>
            {
              type === 'success'  ? (<FaSolidCircleCheck />) :
              type === 'info' ? (<FaSolidCircleInfo />) :
              type === 'error' ? (<FaSolidCircleXmark />) : <FaSolidCircleInfo />
            }
          </span>
          <Toast.Title class="font-bold grow">{title}</Toast.Title>
            <Toast.CloseButton class="w-4 h-4 justify-items-start">
              <VsClose />
            </Toast.CloseButton>
          </div>
          <Toast.Description class="pb-4">
            {message}
          </Toast.Description>
          <Toast.ProgressTrack class="h-1 w-full rounded-md bg-gray-100 dark:bg-gray-100">
            <Toast.ProgressFill
              class={`toast__progress-fill rounded-md h-full ${
                type === 'info' ? 'bg-blue-400 dark:bg-blue-600' :
                type === 'success' ? 'bg-green-400 dark:bg-green-600' :
                type === 'error' ? 'bg-red-400 dark:bg-red-600' : 'bg-blue-400 dark:bg-blue-600'
              }`}
            />
          </Toast.ProgressTrack>
        </div>
      </Toast>
    );
  });
}
