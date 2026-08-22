import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The bus behaviours a flat array could not express: read-only pages, unmapped
// space, device dispatch, the separate port space, and interrupt lines driven
// by a device rather than set by software.
//
// Run natively because mapping a device means writing one, and a device is a
// struct of function pointers. See bustest.c.
const here = path.dirname(fileURLToPath(import.meta.url));

let results;

beforeAll(() => {
    execFileSync(path.join(here, "build.sh"), { stdio: "inherit" });
    const output = execFileSync(path.join(here, "bustest"), { encoding: "utf8" });
    results = new Map(
        [...output.matchAll(/^(ok|FAIL) {3}(.+?)(?::.*)?$/gm)].map((m) => [m[2], m[1] === "ok"]),
    );
    expect(output).toContain("RESULT OK");
}, 120000);

describe("The address bus", () => {
    test.each([
        "default machine stores and returns a byte",
        "a write to a read-only page is dropped",
        "an unmapped read floats high",
        "a device answers a read",
        "a device sees the full address",
        "a device answers anywhere in its page",
        "a device receives a write",
    ])("%s", (name) => {
        expect(results.get(name)).toBe(true);
    });
});

describe("The port space", () => {
    test.each([
        "a port device receives a write",
        "the memory device was not touched by the port write",
    ])("%s", (name) => {
        expect(results.get(name)).toBe(true);
    });
});

describe("Device registration", () => {
    // The registry is what gets clocked and polled, so a chip belongs in it
    // once however many places it answers. An 8155 spans both address spaces
    // once its RAM is the device's, and a timer counting the processor's clock
    // would run at double speed if it were registered twice.
    test.each([
        "a device in both address spaces is registered once",
        "a device in both address spaces is clocked once per instruction",
        "the registry accepts no more than it can clock",
        "a device that could not be registered is not mapped either",
    ])("%s", (name) => {
        expect(results.get(name)).toBe(true);
    });
});

describe("Interrupt lines driven by a device", () => {
    // RST 5.5 is level sensitive, so the input is whatever the device is
    // asserting. A device that has stopped asking is no longer pending, which
    // is what stops one keypress from being read over and over.
    test.each([
        "one queued item is delivered once",
        "three queued items are delivered three times",
        // A device and a caller using triggerInterrupt drive the same pin, so
        // neither may overwrite the other.
        "a hand-asserted line survives a device being attached",
        // RST 7.5 latches on an edge, so a device holding the line high gives
        // one interrupt rather than one on every pass round the caller's loop.
        "a held RST 7.5 line latches once",
    ])("%s", (name) => {
        expect(results.get(name)).toBe(true);
    });
});
