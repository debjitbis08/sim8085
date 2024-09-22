import { onCleanup, onMount, useContext } from "solid-js";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { StoreContext } from "../StoreContext";
import { Syntax8085 } from "./8085";
import debounce from 'debounce';
import './CodeMirror.css';

export function CodeMirror(props) {
  const { store, setStore } = useContext(StoreContext);
  let editorRef; // Reference to the DOM element where CodeMirror will be mounted

  // Initialize the CodeMirror editor
  onMount(() => {
    const onChangeListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newDoc = update.state.doc.toString(); // Get the new document content
        setStore("code", newDoc); // Update the store with new content
      }
    });

    // Create the initial state for the editor
    const startState = EditorState.create({
      doc: store.code, // Load from store or default content
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        onChangeListener,
        Syntax8085(),
      ],
    });

    // Create the editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef, // Mount the editor inside the editorRef div
    });

    // Cleanup when the component is destroyed
    onCleanup(() => {
      view.destroy(); // Destroy the editor instance
    });
  });

  return <div ref={editorRef} class="editor-container border border-gray-300 dark:border-gray-600 border-l-0 border-b-0" style={{ height: "calc(100vh - 7rem - 1px)"}}></div>;
}
