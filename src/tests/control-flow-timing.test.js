import { describe, test } from "vitest";
import { OPCODE_INVENTORY } from "./opcode-inventory.js";
import { expectTstates } from "./timing-test-utils.js";

const cases = OPCODE_INVENTORY
    .filter(({ timingSuite }) => timingSuite === "control-flow-timing.test.js")
    .flatMap((entry) => entry.timingCases.map((timing) => ({ ...entry, ...timing })));

describe("Intel-documented control-flow and stack timings", () => {
    test.each(cases)("$hex $source: $description", async ({ program, expected, setup }) => {
        await expectTstates(program, expected, setup);
    });
});
