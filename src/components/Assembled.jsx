import { createEffect, createSignal, onMount } from 'solid-js';
import { store } from '../store/store.js';
import { toByteString } from '../utils/NumberFormat.js';
import { HiSolidWrench } from 'solid-icons/hi';
import { VsCopy, VsError } from 'solid-icons/vs';
import { FiAlertCircle, FiAlertTriangle } from 'solid-icons/fi';
import CopyComponent from './CopyComponent.jsx';
import { Tooltip } from '@kobalte/core/tooltip';
import { BsArrowBarLeft, BsArrowBarRight } from 'solid-icons/bs';

export function Assembled() {
  let [lines, setLines] = createSignal([]);
  let [expanded, setExpanded] = createSignal(true);
  const [width, setWidth] = createSignal(300);

  createEffect(() => {
    setLines(zipAssembledSource(store.assembled, store.code));
  });

  const toggleExpanded = () => {
    setExpanded((expanded) => !expanded);
  };

  onMount(() => {
    setWidth(window.innerWidth * 0.3);
    const handleResize = () => {
      const isMd = window.matchMedia("(min-width: 768px)").matches;
      setExpanded(isMd);
    };

    // Initial check
    handleResize();

    // Listen for resize events
    window.addEventListener("resize", handleResize);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  const startResize = (event) => {
    const onMouseMove = (e) => setWidth((prev) => prev - e.movementX);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    onCleanup(() => onMouseUp()); // Cleanup when SolidJS destroys the component
  };

  return (
    <div
      class={`${expanded() ? "w-[calc(100vw-8rem)] md:w-full" : "w-8"} flex border-y border-y-main-border ${expanded() ? "border-l" : "border-l-0" } border-l-main-border bg-main-background h-lvh md:h-[calc(100vh-6em)] absolute top-0 right-0 md:static ${expanded() ? "shadow-xl" : ""} md:shadow-none`}
      style={{ width: `${expanded() ? `${width()}px` : 'auto'}` }}
    >
      <button type="button" class="w-[3px] h-lvh md:h-[calc(100vh-6rem)] cursor-col-resize hover:bg-terminal active:bg-terminal" onMouseDown={startResize}
        style={{
          display: expanded() ? "block" : "none",
        }}
      >
      </button>
      <div
        class={`${expanded() ? "p-1 md:p-4" : "p-0 pt-4 pr-2"} w-full`}
      >
        <div class="flex items-start gap-2">
        <h2 class={`md:text-xl pb-4 ${expanded() ? 'block' : 'hidden'}`}>Assembled Output</h2>
        <div
          class={`${store.assembled.length && store.errors.length === 0 ? '' : 'hidden'} pt-1 ${expanded() ? 'block' : 'hidden'}`}
        >
          <Tooltip placement="right">
            <Tooltip.Trigger class="tooltip__trigger">
              <CopyComponent getTextToCopy={() => copyOutputAsText(lines())} />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="tooltip__content">
                <Tooltip.Arrow />
                <p>Copy assembled output</p>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
        <div class="flex-grow"></div>
        <Tooltip placement="left">
          <Tooltip.Trigger class="tooltip__trigger" onClick={toggleExpanded}>
            {expanded() ? <BsArrowBarRight /> : <BsArrowBarLeft />}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="tooltip__content">
              <Tooltip.Arrow />
              <p>{expanded() ? "Collapse Panel" : "Expand Panel"}</p>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
        </div>
        <div class={`flex flex-col ${expanded() ? 'block' : 'hidden'}`} style={{ height: "calc(100vh - 8rem - 1px)" }}>
          <div style={{ height: 'calc(100% - 0rem)' }}>
            <div
              class={`${store.assembled.length ? '' : 'hidden'} w-full overflow-x-auto text-[0.7rem] md:text-sm`}
                style={{ height: 'calc(100% - 2.75rem)' }}
            >
              <For each={lines()}>
                {((line, i) => {
                  const code = showCode(line[0]);
                  return (
                    <div class="grid grid-cols-10 gap-2 hover:bg-active-background px-1 py-0.5 border-b border-b-inactive-border">
                      <span class="col-span-1">{i() + 1}</span>
                      <span class="col-span-2 border-r border-r-inactive-border">
                        { code.length ? `0x${code[0].currentAddress.toString(16).toUpperCase()}` : '' }
                      </span>
                      <div class="col-span-2 flex items-center gap-2 flex-wrap border-r border-r-inactive-border">
                        <For each={code}>
                          {(item) => (
                            <div>
                              <div class="text-orange-foreground">
                                {item.data}
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                      <pre class="col-span-5 pl-1">{ line[1] }</pre>
                    </div>
                  );
                })}
              </For>
            </div>
            <div
              class={`${store.errors.length ? '' : 'hidden'} max-w-full overflow-x-auto text-sm`}
              style={{ height: 'calc(100% - 2.75rem)' }}
            >
              {store.errors.map((e) => {
                const codeLines = store.codeWithError.split('\n');
                const startLine = e.location.start.line - 1;
                const endLine = e.location.end.line - 1;

                const displayedLines = codeLines.slice(startLine, endLine + 1); // All lines in the range

                return (
                  <>
                    {e.type ? (
                      <h4 class="flex items-start gap-2 mb-4 text-red-foreground">
                        <span class="pt-1 ">
                          <FiAlertTriangle />
                        </span>
                        <div>{e.type.toUpperCase()}</div>
                      </h4>
                    ) : null}
                    <div class="">
                      {e.hint.length ? null : (<span>Line <span class="text-yellow-foreground">{e.line}</span>, Column: <span class="text-yellow-foreground">{e.column}</span>: </span>)}
                      <span class=""> {e.msg} </span> {e.hint.length ? (<span>on line <span class="text-yellow-foreground">{e.line}</span></span>) : null}
                    </div>
                    {e.hint.length ? (
                      <For each={e.hint}>
                        {(hint) => (
                          <p class="pt-8">
                            <span class="text-yellow-foreground font-semibold underline">Hint</span>: {hint}
                          </p>
                        )}
                      </For>
                    ) : null}
                    <div class="mt-8 overflow-x-auto">
                      {displayedLines.map((line, index) => {
                        const lineNumber = startLine + index + 1;

                        const startColMinusOne = e.location.start.column === 0 ? 1 : e.location.start.column - 1;
                        if (index === 0) {
                          // Start Line
                          const startMarker = ' '.repeat(startColMinusOne) + '^'.repeat(line.length - startColMinusOne > 0 ? line.length - startColMinusOne : 0);
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
                          const endMarker = '^'.repeat(startColMinusOne);
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
      .map(a => ({ data: a.data, kind: a.kind, currentAddress: a.currentAddress }));
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

  return codes.map((c) => {
    if (c.kind === 'code') return { ...c, data: blankIfZero(toByteString((c.data || 0))) };
    else if (c.kind === 'addr') return { ...c, data: toByteString(c.data) };
    else return { ...c, data: toByteString(c.data) };
  });
}

function copyOutputAsText(lines) {
  const header = `${pad("Line No.", 10)}${pad("Memory Address", 16)}${pad("Machine Codes", 15)}Source`;
  const separator = `${'-'.repeat(10)}${'-'.repeat(16)}${'-'.repeat(15)}${'-'.repeat(20)}`;

  const output = [header, separator];

  function pad(str, length) {
    return str.padEnd(length, ' ');
  }

  // Loop through each line of your output and format it
  lines.forEach((line, index) => {
    const code = showCode(line[0]);

    // Line number (padded to 10 characters)
    const lineNumber = pad((index + 1).toString(), 10);

    // Address (if code exists, padded to 20 characters)
    const address = code.length ? `0x${code[0].currentAddress.toString(16).toUpperCase()}` : '';
    const paddedAddress = pad(address, 16);

    // Instructions (padded to 30 characters)
    const instructions = code.map(item => item.data).join(' ');
    const paddedInstructions = pad(instructions, 15);

    // Source line (no padding required)
    const source = line[1];

    // Combine everything into a single formatted line
    output.push(`${lineNumber}${paddedAddress}${paddedInstructions}${source}`);
  });

  return output.join('\n');
}
