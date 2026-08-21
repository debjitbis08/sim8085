import { describe, expect, test } from "vitest";
import { runAndGetState, setupSimulator } from "./test-utils.js";

const initialFlags = {
    z: true,
    s: false,
    p: true,
    c: true,
    ac: false,
    v: true,
    k: true,
};

const assembledBytes = async (source) => {
    const { assembled } = await setupSimulator(source);
    return assembled.filter((item) => item.kind !== "label").map((item) => item.data);
};

describe("IN Instruction", () => {
    test.each([
        [0x00, 0x12],
        [0x42, 0xa5],
        [0xff, 0x7e],
    ])("reads value %i from port %i without changing flags", async (port, value) => {
        const literal = `0${port.toString(16).padStart(2, "0")}H`;
        const result = await runAndGetState(`in ${literal}\nhlt`, {
            accumulator: 0x00,
            flags: initialFlags,
            io: { [port]: value },
        });

        expect(result.accumulator).toBe(value);
        expect(result.flags).toEqual(initialFlags);
        expect(result.io[port]).toBe(value);
        expect(result.programCounter).toBe(0x0003);
    });

    test("assembles an 8-bit port immediately after opcode DBH", async () => {
        expect(await assembledBytes("in 42H\nhlt")).toEqual([0xdb, 0x42, 0x76]);
    });
});

describe("OUT Instruction", () => {
    test.each([
        [0x00, 0x12],
        [0x42, 0xa5],
        [0xff, 0x7e],
    ])("writes value %i to port %i without changing accumulator or flags", async (port, value) => {
        const literal = `0${port.toString(16).padStart(2, "0")}H`;
        const neighbour = port === 0xff ? 0xfe : port + 1;
        const result = await runAndGetState(`out ${literal}\nhlt`, {
            accumulator: value,
            flags: initialFlags,
            io: { [port]: 0x00, [neighbour]: 0x5a },
        });

        expect(result.accumulator).toBe(value);
        expect(result.flags).toEqual(initialFlags);
        expect(result.io[port]).toBe(value);
        expect(result.io[neighbour]).toBe(0x5a);
        expect(result.programCounter).toBe(0x0003);
    });

    test("assembles an 8-bit port immediately after opcode D3H", async () => {
        expect(await assembledBytes("out 42H\nhlt")).toEqual([0xd3, 0x42, 0x76]);
    });
});
