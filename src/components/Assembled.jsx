import { createEffect, createSignal } from 'solid-js';
import { store } from '../store/store.js';
import { toByteString } from '../utils/NumberFormat.js';
import { HiSolidWrench } from 'solid-icons/hi';
import { VsError } from 'solid-icons/vs';
import { FiAlertCircle, FiAlertTriangle } from 'solid-icons/fi';

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
      <div class="flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
        <div style={{ height: 'calc(100% - 2.75rem - 120px)' }}>
          <div
            class={`${store.assembled.length ? '' : 'hidden'} w-full overflow-x-auto text-sm`}
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
          <div
            class={`${store.errors.length ? '' : 'hidden'} max-w-full overflow-x-auto text-sm`}
            style={{ height: 'calc(100% - 2.75rem)' }}
          >
            {store.errors.map((e) => {
              const codeLines = store.code.split('\n');
              const startLine = e.location.start.line - 1;
              const endLine = e.location.end.line - 1;

              const displayedLines = codeLines.slice(startLine, endLine + 1); // All lines in the range

              return (
                <>
                  <p class="flex items-start gap-2 text-red-700 dark:text-red-400">
                    <span class="pt-1 text-lg">
                      <FiAlertTriangle />
                    </span>
                    <span>
                      Line <span class="text-yellow-700 dark:text-yellow-400">{e.line}</span>, Column <span class="text-yellow-700 dark:text-yellow-400">{e.column}</span>:
                      <span class="text-red-700 dark:text-red-400"> {e.msg}</span>
                    </span>
                  </p>
                  <div class="mt-2 overflow-x-auto">
                    {displayedLines.map((line, index) => {
                      const lineNumber = startLine + index + 1;

                      if (index === 0) {
                        // Start Line
                        const startMarker = ' '.repeat(e.location.start.column - 1) + '^'.repeat(line.length - (e.location.start.column - 1));
                        return (
                          <div key={index}>
                            <pre class="text-sm">
                              <code>{lineNumber}|  {line}</code>
                            </pre>
                            <pre class="text-yellow-600 text-sm">
                              <code>{' '.repeat(lineNumber.toString().length) + '| '}{startMarker}</code>
                            </pre>
                          </div>
                        );
                      } else if (index === displayedLines.length - 1) {
                        // End Line
                        const endMarker = '^'.repeat(e.location.end.column - 1);
                        return (
                          <div key={index}>
                            <pre class="text-sm">
                              <code>{lineNumber}|  {line}</code>
                            </pre>
                            <pre class="text-yellow-600 text-sm">
                              <code>{' '.repeat(lineNumber.toString().length) + '|  '}{endMarker}</code>
                            </pre>
                          </div>
                        );
                      } else {
                        // Middle lines, show without any marker
                        return (
                          <div key={index}>
                            <pre class="text-sm">
                              <code>{lineNumber}|  {line}</code>
                            </pre>
                          </div>
                        );
                      }
                    })}
              </div>
                </>
              );
            })}
          </div>
          <div
            class={`${store.assembled.length || store.errors.length ? 'hidden' : ''} max-w-full overflow-x-auto text-sm`}
            style={{ height: 'calc(100% - 2.75rem)' }}
          >
            <p class="text-gray-500">
              Load or Run the program to view the assembled output.
            </p>
          </div>
        </div>
        <div id="slot" class="hidden mt-10 rounded-sm max-w-[360] h-[100px] flex items-start">
          <div class="carbon-demo card-shadow">
            <img class="carbon-img" src="https://static4.buysellads.net/uu/1/93750/1624656839-Gatsby_Cloud_solid_purple_Gatsby_Monogram.png"/>
            <div class="carbon-desc">Provision MongoDB clusters in minutes. Get $100 free credit.</div>
          </div>
        </div>
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
  const data = codes.filter(c => c.kind !== "code" && c.kind !== "addr").map(c => c.data);

  const absoluteAddrNum = addr.length === 2
    ? ((addr[1] || 0) << 8) + (addr[0] || 0)
    : 0;

  const absoluteAddr = [absoluteAddrNum & 0xFF, absoluteAddrNum >> 8];

  function blankIfZero(s) {
    return s === "00" ? "" : s;
  }

  const codeString = code.length ? blankIfZero(toByteString((code[0] || 0))) : '';

  const addrOrDataString = (addr.length === 2 ? absoluteAddr : data)
    .reduce((acc, a) => acc + (
      Array.isArray(a) ? a.map(toByteString).join(" ") : toByteString(a)
    ) + " ", "");

  return `${codeString}  ${addrOrDataString}`;
}
