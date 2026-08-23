import { onCleanup, onMount } from "solid-js";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { Syntax8085 } from "../codemirror/8085";
import "../codemirror/CodeMirror.css";

/**
 * A plain 8085 editor: one buffer, no files and no workspace.
 *
 * The simulator's own editor is wired into the application store, which knows
 * about the plain 64K machine and the files a user keeps there. The board is
 * its own machine, so it gets its own buffer rather than a share of that one.
 */
export function CodeEditor(props) {
    let host;
    let view;

    onMount(() => {
        view = new EditorView({
            state: EditorState.create({
                doc: props.value,
                extensions: [
                    basicSetup,
                    keymap.of([defaultKeymap, indentWithTab]),
                    Syntax8085(),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) props.onChange(update.state.doc.toString());
                    }),
                ],
            }),
            parent: host,
        });
    });

    onCleanup(() => view?.destroy());

    return <div ref={host} class="h-full overflow-auto text-sm" />;
}
