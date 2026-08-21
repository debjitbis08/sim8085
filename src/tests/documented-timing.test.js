import { describe, test } from "vitest";
import { OPCODE_INVENTORY } from "./opcode-inventory.js";
import { expectTstates } from "./timing-test-utils.js";

// Fixtures are owned by the opcode inventory, so removing a local generator
// cannot silently weaken the claimed 199-opcode coverage.
const cases = OPCODE_INVENTORY
    .filter(({ timingSuite }) => timingSuite === "documented-timing.test.js")
    .flatMap((entry) => entry.timingCases.map((timing) => ({ ...entry, ...timing })));

describe("Intel-documented non-control opcode timings", () => {
    test.each(cases)("$hex $source: $description", async ({ program, expected, setup }) => {
        await expectTstates(program, expected, setup);
    });
});
