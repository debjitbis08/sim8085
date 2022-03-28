import { traverseReadonlyArrayWithIndex } from "fp-ts/lib/Option";

export type byte = number;

export const toByte = (n: number) =>
    n < 16 ? `0${n.toString(16)}` : n.toString(16);