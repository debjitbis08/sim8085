import { word } from "modules/common/domain/word";
import parser from "./8085.peggy";
import { Either, left, right } from "fp-ts/Either";
import { byte } from "../../common/domain/byte";
import { string } from "fp-ts";

interface CodeLocation {
    offset: number;
    line: number;
    column: number;
}

export interface Assembled {
    data: byte;
    kind: "code" | "addr" | "data";
    location: {
        start: CodeLocation;
        end: CodeLocation;
    };
}

export interface AssemblerError {
    name: string;
    msg: string;
    line: number;
    column: number;
}

export const assemble = (
    code: string,
    loadAddr: word
): Either<AssemblerError, Assembled[]> => {
    try {
        return right(parser.parse(code, { loadAddr }));
    } catch (e: any) {
        return left({
            name: e.name,
            msg: e.message,
            line: e.location.start.line,
            column: e.location.start.column,
        });
    }
};

const findAssembled = (assembled: Assembled[], lineNo: number) =>
    assembled
        .filter((code) => code.location.start.line - 1 === lineNo)
        .map((code) => ({ data: code.data, kind: code.kind }));

export const zipSourceAndAssembled = (code: string, assembled: Assembled[]) => {
    const sourceLines = code.split("\n");

    return sourceLines.map((sourceLine, index) => [
        findAssembled(assembled, index),
        sourceLine,
    ]);
};
