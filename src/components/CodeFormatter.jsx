import ActionButton from "./ActionButton.jsx";
import { FaSolidFileLines, FaSolidWandMagicSparkles } from "solid-icons/fa";
import { parse } from "../core/8085.pegjs";
import { store, setStore } from "../store/store.js";

export default function CodeFormatter() {
    const format = () => {
        try {
            const parsed = parse(store.activeFile.content);
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
                title={
                    <>
                        <p>Format Code</p>
                        <p class="mt-2 text-secondary-foreground">
                            This feature is still in testing. If the formatter does unintended changes please undo the
                            changes using{" "}
                            <span class="text-xs bg-secondary-background py-1 px-2 rounded-sm">Ctrl + Z</span> shortcut
                            after clicking on the code editor.
                        </p>
                        <p class="mt-2 text-secondary-foreground">
                            If you find any bugs please report them on{" "}
                            <a
                                href="https://github.com/debjitbis08/sim8085/issues"
                                class="text-blue-foreground"
                                target="_blank"
                            >
                                GitHub
                            </a>
                            .
                        </p>
                    </>
                }
                onClick={format}
            />
        </div>
    );
}

const formatHex = (n) => {
    if (typeof n !== "number") return n;
    let hex = n.toString(16).toUpperCase();
    if (/^[A-F]/.test(hex)) {
        hex = "0" + hex;
    }
    return `${hex}H`;
};

function formatLines(lines) {
    const LABEL_WIDTH = 10;

    const formatHex = (n) => {
        if (typeof n !== "number") return n;
        let hex = n.toString(16).toUpperCase();
        if (/^[A-F]/.test(hex)) hex = "0" + hex;
        return `${hex}H`;
    };

    const extractOperands = (line) => {
        if (line.inst) {
            return line.inst.params
                .map((param) =>
                    typeof param === "string" ? param.toUpperCase() : param.text ? param.text : formatHex(param.value),
                )
                .join(", ");
        } else if (line.dir) {
            const strLit = line.dir.name?.[2]?.text?.[0];
            if (strLit) return strLit;
            return (line.dir.params || []).map(formatHex).join(", ");
        }
        return "";
    };

    // 🔍 Check if any line contains a label
    const hasLabels = lines.some((line) => typeof line === "object" && line?.labels?.length > 0);

    const formatted = lines.map((line) => {
        // 🔳 Blank line: preserve it
        if (line === null || line === undefined || line === "" || (typeof line === "string" && line.trim() === "")) {
            return "";
        }

        // 🟨 Comment-only line
        if (typeof line === "string" && line.trim().startsWith(";")) {
            return line.trim();
        }

        const labelObj = Array.isArray(line.labels) ? (line.labels || [])[0] : line.label;
        const label = labelObj ? `${labelObj.value}${labelObj.text && !labelObj.text.includes(":") ? "" : ":"}` : "";
        const labelPadded = label.padEnd(LABEL_WIDTH);

        const mnemonic = line.inst
            ? line.inst.name.toUpperCase()
            : line.dir
              ? line.dir.name[0].toUpperCase()
              : line.opcode.toUpperCase();

        const operands = extractOperands(line);
        const mnemonicCol = mnemonic.padEnd(8);
        let operandCol = operands;

        // Extract comment from .text if available
        let comment = "";
        if (line.text?.includes(";")) {
            comment = line.text.slice(line.text.indexOf(";")).trim();
            operandCol = operands.padEnd(20);
        }

        // 🏷️ Label-only line
        if (!mnemonic && !operands && label) {
            return hasLabels ? label : "";
        }

        // 📏 If label is too long → break into two lines
        if (label.length > LABEL_WIDTH) {
            const indented = " ".repeat(LABEL_WIDTH) + mnemonicCol + operandCol + comment;
            return `${label}\n${indented}`;
        }

        // 🧱 Assemble the line
        if (hasLabels) {
            return `${labelPadded}${mnemonicCol}${operandCol}${comment}`;
        } else {
            return `${mnemonicCol}${operandCol}${comment}`;
        }
    });

    return formatted.join("\n");
}
