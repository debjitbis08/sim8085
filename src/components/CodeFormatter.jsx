import ActionButton from "./ActionButton.jsx";
import { FaSolidFileLines, FaSolidWandMagicSparkles } from "solid-icons/fa";
import { parse } from "../core/8085.pegjs";
import { store, setStore } from "../store/store.js";

export default function CodeFormatter() {
    const format = () => {
        try {
            const parsed = parse(store.activeFile.content);
            console.log(parsed);
            const formatted = formatLines(parsed.lines);
            setStore("activeFile", "content", formatted);
        } catch (e) {
            console.log("Failed to format code:", e);
            throw e;
        }
    };
    return (
        <div class="">
            <ActionButton
                icon={<FaSolidWandMagicSparkles class="text-blue-foreground" />}
                title="Format Code"
                onClick={format}
            />
        </div>
    );
}

const formatHex = (n) => {
    if (typeof n !== "number") return n;
    let hex = n.toString(16).toUpperCase();
    console.log(hex);
    if (/^[A-F]/.test(hex)) {
        hex = "0" + hex;
    }
    return `${hex}H`;
};

function formatLines(lines) {
    const extractOperands = (line) => {
        if (line.inst) {
            console.log(line.inst.params);
            return line.inst.params
                .map((param) => (typeof param === "string" ? param.toUpperCase() : formatHex(param.value)))
                .join(", ");
        } else if (line.dir) {
            const strLit = line.dir.name?.[2]?.text?.[0]; // e.g. "'Hello'"
            if (strLit) return strLit;
            return (line.dir.params || []).map(formatHex).join(", ");
        }
        return "";
    };

    return lines
        .filter((line) => line !== null)
        .map((line) => {
            if (line == null || (typeof line === "string" && line.trim() === "")) {
                return ""; // Emit a blank line
            }

            if (line.comment != null && line.text.trim().startsWith(";")) {
                return line.text.trim(); // no indentation — start at column 1
            }

            const labelObj = (line.labels || [])[0];
            const label = labelObj ? (labelObj.value + ":").padEnd(10) : "".padEnd(10);

            const mnemonic = line.inst ? line.inst.name.toUpperCase() : line.dir ? line.dir.name[0].toUpperCase() : "";

            const operands = extractOperands(line);

            let comment = "";
            let operandCol = operands;
            console.log(operands);
            if (line.text?.includes(";")) {
                comment = line.text.slice(line.text.indexOf(";")).trim();
                operandCol = operands.padEnd(20);
            }

            const mnemonicCol = mnemonic.padEnd(8);

            if (!mnemonic && !operands && label.trim()) {
                return label;
            }

            // If label is too long, break into two lines
            if (label.trim().length > 10) {
                console.log("Label is too long");
                const indentedLine = " ".repeat(10) + mnemonicCol + operandCol + comment;
                return [label.trim(), indentedLine].join("\n");
            }

            return `${label}${mnemonicCol}${operandCol}${comment}`;
        })
        .join("\n");
}
