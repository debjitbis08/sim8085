import { useAppSelector } from "../../../hooks";
import { toByte } from "../../common/domain/byte";
import * as React from "react";
import * as Assembler from "../domain/assembler";

const zipAssembledAndCode = (assembled: Assembler.Assembled[], code: string): [{data: number, kind: string}[], string][] => {
    const sourceLines = code.split("\n");
    const findAssembled = (line: number) => {
        return assembled
            .filter((c: Assembler.Assembled) => (c.location.start.line - 1) === line)
            .map((assembled: Assembler.Assembled) => ({ data: assembled.data, kind: assembled.kind }))
    }

    return sourceLines.map((line: string, i: number) => [findAssembled(i), line]);
}

const showCode = (codes: { data: number; kind: string }[]) => {
    const code = codes.filter((c: { data: number, kind: string }) => c.kind === "code").map((c: { data: number; }) => c.data);
    const addr = codes.filter((c: { data: number, kind: string }) => c.kind === "addr").map((c: { data: number; }) => c.data);
    const data = codes.filter((c: { data: number, kind: string }) => c.kind === "data").map((c: { data: number; }) => c.data);

    const absoluteAddrNum = (addr.length === 2) ?  ((addr[1] << 8) + (8 << 8) + (addr[0])) : 0;
    const absoluteAddr = [absoluteAddrNum & 0xFF, absoluteAddrNum >> 8];
    const blankIfZero = (s: string) => s === "00" ? "" : s;

    return (
        `${(blankIfZero(toByte(code[0] || 0).toUpperCase()))} ${((addr.length === 2 ? absoluteAddr : data).reverse().reduce((a: string, b: number) => `${toByte(b)} ${a}`, ""))}`
    )
};


const showSigleLine = (line: [{ data: number; kind: string; }[], string], n: number) => {
    const code = showCode(line[0]);
    return (
        <tr>
            <td>{n + 1}</td>
            <td>{code === "0 " ? "" : code}</td>
            <td>{line[1]}</td>
        </tr>
    );
};

const Assembled = () => {
    const assembled = useAppSelector((state) => state.editor.assembled);
    const code = useAppSelector((state) => state.editor.code);

    const lines = zipAssembledAndCode(assembled, code);

    return (
        <table>
            <tbody>
                {lines.map((line, i) => showSigleLine(line, i))}
            </tbody>
        </table>
    )
};

export default Assembled;
