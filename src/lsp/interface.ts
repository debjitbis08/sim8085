import {Transport,LSPClient } from "@codemirror/lsp-client"



function WasmWebTransport(path: string): Promise<Transport> {
  let handlers: ((value: string) => void)[] = []
  let worker = new Worker(path);
  worker.onmessage = e => { for (let h of handlers) h(e.data.toString()) }
  return new Promise(resolve => {
    worker.onopen = () => resolve()
  })
}
