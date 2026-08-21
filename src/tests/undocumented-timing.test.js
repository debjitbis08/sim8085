import { describe, test } from "vitest";
import { OPCODE_INVENTORY } from "./opcode-inventory.js";
import { expectTstates } from "./timing-test-utils.js";

// Dehnhardt and Sorensen's January 1979 timings for the ten undocumented
// instructions are represented directly on their inventory entries.
const cases = OPCODE_INVENTORY
    .filter(({ timingSuite }) => timingSuite === "undocumented-timing.test.js")
    .flatMap((entry) => entry.timingCases.map((timing) => ({ ...entry, ...timing })));

describe("Undocumented instruction timing", () => {
    test.each(cases)("$hex $source: $description", async ({ program, expected, setup }) => {
        await expectTstates(program, expected, setup);
    });
});
