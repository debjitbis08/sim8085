import init, { wasm_handle_message } from "./lsp85/pkg/lsp85.js";

let isReady = false;
const queue: string[] = [];

// Initialize WebAssembly module inside Worker
init()
    .then(() => {
        isReady = true;
        // Process any queued messages
        while (queue.length > 0) {
            const msg = queue.shift();
            if (msg) processMessage(msg);
        }
    })
    .catch((err) => {
        console.error("Failed to initialize lsp85 WASM worker:", err);
    });

function processMessage(message: string) {
    try {
        const responses: string[] = wasm_handle_message(message);
        if (Array.isArray(responses)) {
            for (const resp of responses) {
                self.postMessage(resp);
            }
        }
    } catch (err) {
        console.error("Error processing message in lsp85 worker:", err);
    }
}

self.onmessage = (event: MessageEvent<string>) => {
    if (typeof event.data !== "string") return;

    if (!isReady) {
        queue.push(event.data);
    } else {
        processMessage(event.data);
    }
};
