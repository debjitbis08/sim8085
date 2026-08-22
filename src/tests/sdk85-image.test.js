import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { assembleProgram } from "../core/simulator.js";
import { LISTING_IMAGE, IMAGE_ERRATA } from "./sdk85-listing.js";

// Assembles the whole SDK-85 monitor and compares the result, byte for byte,
// against the object code Intel's own assembler produced for it.
//
// This is the strong form of the check in sdk85-listing.test.js, which
// assembles one instruction at a time and so cannot see address arithmetic,
// forward references, ORG placement or directive sizing. Here every one of
// those has to be right or the image moves.
//
// The source is src/core/sdk85-monitor.src -- see the README note below.
const source = readFileSync(new URL("../core/sdk85-monitor.src", import.meta.url), "latin1");

describe("The SDK-85 monitor ROM image", () => {
    const assembled = (() => {
        const image = new Map();
        for (const byte of assembleProgram(source).assembled) {
            image.set(byte.currentAddress, byte.data & 0xff);
        }
        return image;
    })();

    test("matches Intel's object code at every address", () => {
        const differences = [...LISTING_IMAGE]
            .filter(([address, byte]) => assembled.get(address) !== byte)
            .map(([address, byte]) => ({
                address: address.toString(16).padStart(4, "0"),
                listing: byte.toString(16).padStart(2, "0"),
                ours: (assembled.get(address) ?? -1).toString(16),
            }));
        expect(differences).toEqual([]);
    });

    test("covers the whole monitor", () => {
        expect(LISTING_IMAGE.size).toBe(2060);
        // The monitor lives in the 8355's two kilobytes at the bottom of the
        // map, plus its RAM save area up at 20xxH.
        const addresses = [...LISTING_IMAGE.keys()];
        expect(Math.min(...addresses)).toBe(0x0000);
        expect(addresses.filter((a) => a < 0x0800)).toHaveLength(2026);
    });

    test("every erratum is a correction the assembler agrees with", () => {
        // Each entry exists because the scan is wrong and we are right; if one
        // ever stopped being needed it should be deleted, not left standing.
        for (const { address, correct, reason } of IMAGE_ERRATA) {
            expect(assembled.get(address), `${address.toString(16)}: ${reason}`).toBe(correct);
        }
    });
});
