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
(x) - Code completions
<img width="1404" height="325" alt="image" src="https://github.com/user-attachments/assets/68892087-4392-4610-8b7b-7c574700e58e" />
() Populate for all the instructions
