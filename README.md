```
[ CodeMirror Editor ]
         │
         ▼
  LSPClient (browser)
         │ JSON-RPC
         ▼ postMessage
┌──────────────────────────┐
│  WebWorker (JS)          │
│  - Handles LSP messages  │
│  - Calls WASM functions  │
└───────────┬──────────────┘
            │
            ▼
     [ WASM Module ]
   - completion()
   - hover()
   - parsing logic
```
