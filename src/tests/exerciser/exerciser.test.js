import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// These suites run the emulator core natively rather than through the browser
// build. See README.md for why, and for where the ROMs came from.
const here = path.dirname(fileURLToPath(import.meta.url));
const harness = path.join(here, "harness");

// 8080EXM is exhaustive and takes tens of seconds, so it stays opt-in.
const runExhaustive = process.env.RUN_8080EXM === "1";

function runRom(rom, budget) {
    try {
        return execFileSync(harness, [path.join(here, "roms", rom), String(budget)], {
            encoding: "utf8",
            maxBuffer: 64 * 1024 * 1024,
            stdio: ["ignore", "pipe", "pipe"],
        });
    } catch (error) {
        // A non-zero exit means the harness gave up (budget exhausted, runaway
        // PC). Surface whatever the ROM managed to print, which is where the
        // failing instruction is named.
        throw new Error(
            `${rom} did not run to completion.\n--- stdout ---\n${error.stdout ?? ""}\n--- stderr ---\n${error.stderr ?? ""}`,
        );
    }
}

describe("CP/M exerciser ROMs", () => {
    beforeAll(() => {
        execFileSync(path.join(here, "build.sh"), { stdio: "inherit" });
    }, 120000);

    test("8080PRE: preliminary instruction test", () => {
        const output = runRom("8080PRE.COM", 50_000_000);
        expect(output).toContain("8080 Preliminary tests complete");
        expect(output).not.toMatch(/ERROR/i);
    });

    test("TST8080: Microcosm Associates CPU diagnostic", () => {
        const output = runRom("TST8080.COM", 50_000_000);
        expect(output).toContain("CPU IS OPERATIONAL");
    });

    test("CPUTEST: SuperSoft Diagnostics II CPU test", () => {
        const output = runRom("CPUTEST.COM", 500_000_000);
        expect(output).not.toContain("CPU FAILED");
        expect(output).toContain("CPU TESTS OK");
    });

    // Exhaustive: ~2.9 billion instructions, roughly 35 seconds. Every group is
    // a CRC over the full machine state across the whole operand space, so a
    // single wrong flag in any addressing mode shows up as a mismatch.
    test.runIf(runExhaustive)(
        "8080EXM: full instruction exerciser",
        () => {
            const output = runRom("8080EXM.COM", 20_000_000_000);
            expect(output).toContain("Tests complete");
            expect(output).not.toMatch(/ERROR/i);
            // Guard against a truncated run that reports neither pass nor fail.
            expect(output.match(/PASS!/g) ?? []).toHaveLength(25);
        },
        600000,
    );
});
