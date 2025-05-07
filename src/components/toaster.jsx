import { Toast, toaster } from "./generic/Toast.jsx";
import { VsClose } from "solid-icons/vs";
import { FaSolidCircleCheck, FaSolidCircleInfo, FaSolidCircleXmark } from "solid-icons/fa";

export function showToaster(type, title, message) {
    toaster.show((props) => {
        const color = type === "info" ? "blue" : type === "success" ? "green" : type === "error" ? "red" : "blue";
        return (
            <Toast
                toastId={props.toastId}
                class="toast border border-gray-500 p-4 rounded-md bg-secondary-background flex flex-col items-center justify-between gap-4"
            >
                <div class="text-active-foreground p-1 w-full">
                    <div class="flex items-center gap-2 pb-2">
                        <span class={`text-${color}-foreground`}>
                            {type === "success" ? (
                                <FaSolidCircleCheck />
                            ) : type === "info" ? (
                                <FaSolidCircleInfo />
                            ) : type === "error" ? (
                                <FaSolidCircleXmark />
                            ) : (
                                <FaSolidCircleInfo />
                            )}
                        </span>
                        <Toast.Title class="font-bold grow">{title}</Toast.Title>
                        <Toast.CloseButton class="w-4 h-4 justify-items-start">
                            <VsClose />
                        </Toast.CloseButton>
                    </div>
                    <Toast.Description class="pb-4">{message}</Toast.Description>
                    <Toast.ProgressTrack class="h-1 w-full rounded-md bg-inactive-background">
                        <Toast.ProgressFill
                            class={`toast__progress-fill rounded-md h-full ${
                                type === "info"
                                    ? "bg-blue-foreground"
                                    : type === "success"
                                      ? "bg-green-foreground"
                                      : type === "error"
                                        ? "bg-red-foreground"
                                        : "bg-blue-foreground"
                            }`}
                        />
                    </Toast.ProgressTrack>
                </div>
            </Toast>
        );
    });
}
