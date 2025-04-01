import React, { useEffect, useRef } from 'react';
import { html } from '@codemirror/lang-html';
import { EditorState } from '@codemirror/state';
import { basicSetup, EditorView } from 'codemirror';

interface PrototypeCodeEditorProps {
  value?: string;
  onUpdate?: (content: string) => void;
  style?: React.CSSProperties;
}

const PrototypeCodeEditor: React.FC<PrototypeCodeEditorProps> = ({
  value = '',
  onUpdate,
  style,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const isUpdatingRef = useRef(false);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        html(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isUpdatingRef.current) {
            const newContent = update.state.doc.toString();
            valueRef.current = newContent;
            onUpdate?.(newContent);
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { width: '100%' },
          '.cm-line': { wordWrap: 'break-word', whiteSpace: 'pre-wrap' },
        }),
        EditorView.lineWrapping,
      ],
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
  }, [onUpdate, value]); // Initialize only once when component mounts

  // Handle external value updates
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || value === valueRef.current) return;

    // Mark as updating to prevent onChange trigger
    isUpdatingRef.current = true;

    try {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        const currentSelection = view.state.selection;
        const transaction = view.state.update({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: value,
          },
          selection: currentSelection.ranges[0].empty
            ? undefined // Let editor handle if no selection
            : currentSelection, // Keep current selection
        });

        view.dispatch(transaction);
        valueRef.current = value;
      }
    } finally {
      // Ensure flag is reset
      isUpdatingRef.current = false;
    }
  }, [value]);

  return (
    <div style={{ height: '100%', overflow: 'hidden', ...style }}>
      <div ref={editorRef} style={{ height: '100%' }} />
    </div>
  );
};

export default PrototypeCodeEditor;
