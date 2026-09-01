import type { Transport } from "@codemirror/lsp-client";

export class WasmWorkerTransport implements Transport {
    private worker: Worker;
    private handlers: Array<(value: string) => void> = [];

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (e: MessageEvent<string>) => {
            const data = e.data;
            if (typeof data === "string") {
                for (const handler of this.handlers) {
                    try {
                        handler(data);
                    } catch (err) {
                        console.error("Error in LSP transport handler:", err);
                    }
                }
            }
        };
    }

    send(message: string): void {
        this.worker.postMessage(message);
    }

    subscribe(handler: (value: string) => void): void {
        if (!this.handlers.includes(handler)) {
            this.handlers.push(handler);
        }
    }

    unsubscribe(handler: (value: string) => void): void {
        this.handlers = this.handlers.filter((h) => h !== handler);
    }

    destroy(): void {
        this.handlers = [];
        this.worker.terminate();
    }
}

/**
 * Creates and returns a WASM LSP transport using a Web Worker.
 */
export function createWasmLspTransport(): WasmWorkerTransport {
    // Instantiate web worker with Vite/Astro ES module worker support
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
    });
    return new WasmWorkerTransport(worker);
}
