import { createEffect, createSignal } from 'solid-js';
import { store } from '../store/store.js';
import { toByteString } from '../utils/NumberFormat.js';

export function Assembled() {
  let [lines, setLines] = createSignal([]);
  createEffect(() => {
    setLines(zipAssembledSource(store.assembled, store.code));
  });
  return (
    <div class="p-4 w-full h-full">
      <div>
        <h2 class="text-xl pb-4">Assembled Output</h2>
      </div>
      <div
        class={`${store.programState === 'Idle' ? 'hidden' : ''} max-w-full overflow-x-auto text-sm`}
        style={{ height: 'calc(100% - 2.75rem)' }}
      >
        {lines().map((line, i) => {
          const code = showCode(line[0]);
          return (
            <div class="grid grid-cols-8 gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 px-1 py-0.5 border-b border-b-gray-200 dark:border-b-gray-800">
              <span class="col-span-1">{i + 1}</span>
              <span class="col-span-1 border-r border-r-gray-200 dark:border-r-gray-800">{ code === '0 ' ? '' : code }</span>
              <pre class="col-span-5 pl-1">{ line[1] }</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function zipAssembledSource(assembled, source) {
  const sourceLines = source.split("\n");

  function findAssembled(ln) {
    return assembled
      .filter(c => c.location.start.line - 1 === ln)
      .map(a => ({ data: a.data, kind: a.kind }));
  }

  return sourceLines.map((s, i) => [findAssembled(i), s]);
}

function showCode(codes) {
  const code = codes.filter(c => c.kind === "code").map(c => c.data);
  const addr = codes.filter(c => c.kind === "addr").map(c => c.data);
  const data = codes.filter(c => c.kind === "data").map(c => c.data);

  const absoluteAddrNum = addr.length === 2
    ? ((addr[1] || 0) << 8) + (addr[0] || 0)
    : 0;

  const absoluteAddr = [absoluteAddrNum & 0xFF, absoluteAddrNum >> 8];

  function blankIfZero(s) {
    return s === "00" ? "" : s;
  }

  const codeString = blankIfZero(toByteString((code[0] || 0)));

  const addrOrDataString = (addr.length === 2 ? absoluteAddr : data)
    .reduce((acc, a) => acc + toByteString(a) + " ", "");

  return `${codeString}  ${addrOrDataString}`;
}