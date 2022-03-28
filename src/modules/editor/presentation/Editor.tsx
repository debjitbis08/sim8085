import * as React from "react";
import MonacoEditor from "@monaco-editor/react";
import { DEFAULT_CODE } from "./default-code";

const Editor = ({onChange}: { onChange?: (code: string | undefined) => void }) => {
    return <MonacoEditor height="90vh" defaultValue={DEFAULT_CODE} onChange={onChange}/>;
};

export default Editor;
