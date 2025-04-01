import React, { useCallback, useEffect, useState } from 'react';
import {
  BoldOutlined,
  DownOutlined,
  InfoCircleOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Underline from '@tiptap/extension-underline';
import {
  BubbleMenu,
  EditorContent,
  getHTMLFromFragment,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, Dropdown, Flex, Space, Tooltip, Typography } from 'antd';

import { TemplateDocumentOutput } from '../../containers/documents/types/documentTypes';
import { COLORS } from '../../lib/constants';
import { ReactComponent as EmptyIcon } from '../icons/empty-icon.svg';
import { ReactComponent as TemplateButtonIcon } from '../icons/template-button-icon.svg';
import Selection from '../util/editor-extensions/editor-selection';
import { replaceSelection } from '../util/editor-helpers';
import Mermaid from './Mermaid';
import { SelectionMenu } from './SelectionMenu';

import './TiptapEditor.scss';

const SELECTION_OFFSET = 1;

interface TiptapEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onUpdate?: (editor: any, contents: string) => void;
  onClickTemplateIcon?: () => void;
  selectedTemplate?: TemplateDocumentOutput | null;
  showToolbar?: boolean;
  editable?: boolean;
  toolbarHelperText?: string;
}

const Toolbar: React.FC<{
  editor: any;
  toolbarHelperText?: string;
  selectedTemplate?: TemplateDocumentOutput | null;
  onClickTemplateIcon?: () => void;
}> = ({ editor, toolbarHelperText, selectedTemplate, onClickTemplateIcon }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 899);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  if (!editor) {
    return null;
  }

  const items = [
    {
      key: '0',
      label: (
        <span
          style={{
            fontWeight: !editor.isActive('heading') ? 'bold' : 'normal',
          }}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          Normal text
        </span>
      ),
    },
    {
      key: '1',
      label: (
        <span
          style={{
            fontWeight: editor.isActive('heading', { level: 1 })
              ? 'bold'
              : 'normal',
          }}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          Heading 1
        </span>
      ),
    },
    {
      key: '2',
      label: (
        <span
          style={{
            fontWeight: editor.isActive('heading', { level: 2 })
              ? 'bold'
              : 'normal',
          }}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Heading 2
        </span>
      ),
    },
    {
      key: '3',
      label: (
        <span
          style={{
            fontWeight: editor.isActive('heading', { level: 3 })
              ? 'bold'
              : 'normal',
          }}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          Heading 3
        </span>
      ),
    },
  ];

  return (
    <Flex className="toolbar">
      <Dropdown menu={{ items }} trigger={['click']}>
        <Button>
          {editor.isActive('heading', { level: 1 })
            ? 'Heading 1'
            : editor.isActive('heading', { level: 2 })
              ? 'Heading 2'
              : editor.isActive('heading', { level: 3 })
                ? 'Heading 3'
                : !editor.isActive('heading')
                  ? 'Normal text'
                  : 'Heading'}{' '}
          <DownOutlined />
        </Button>
      </Dropdown>
      <Button
        icon={<BoldOutlined />}
        onClick={() => editor.chain().focus().toggleBold().run()}
        type={editor.isActive('bold') ? 'primary' : 'default'}
      />
      <Button
        icon={<ItalicOutlined />}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        type={editor.isActive('italic') ? 'primary' : 'default'}
      />
      <Button
        icon={<UnderlineOutlined />}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        type={editor.isActive('underline') ? 'primary' : 'default'}
      />
      <Button
        icon={<UnorderedListOutlined />}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        type={editor.isActive('bulletList') ? 'primary' : 'default'}
      />
      {!toolbarHelperText && (
        <Button
          style={{
            alignItems: 'center',
            display: 'flex',
          }}
          className="template-btn"
          icon={<TemplateButtonIcon />}
          onClick={() => onClickTemplateIcon && onClickTemplateIcon()}
        >
          {selectedTemplate
            ? `Template In use: ${selectedTemplate.name}`
            : 'Pick a Template'}
        </Button>
      )}
      {/* <Button
        icon={<CodeOutlined />}
        onClick={(e) => {
          editor.chain().focus().toggleCodeBlock().run();
        }}
        type={editor.isActive('codeBlock') ? 'primary' : 'default'}
      /> */}
      {toolbarHelperText && (
        <Flex>
          {isMobile ? (
            <Tooltip title={toolbarHelperText} placement="top">
              <InfoCircleOutlined
                style={{ fontSize: '24px', margin: '0 5px' }}
              />
            </Tooltip>
          ) : (
            <>
              <InfoCircleOutlined
                style={{ fontSize: '24px', margin: '0 5px' }}
              />
              <Typography.Text
                style={{
                  fontSize: '12px',
                  fontStyle: 'italic',
                  maxWidth: '400px',
                }}
              >
                {toolbarHelperText}
              </Typography.Text>
            </>
          )}
        </Flex>
      )}
    </Flex>
  );
};

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  value = '',
  onChange,
  onUpdate,
  onClickTemplateIcon,
  selectedTemplate,
  showToolbar = true,
  editable = true,
  toolbarHelperText = '',
}) => {
  const [editorData, setEditorData] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');

  const boxStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 6,
    border: '1px solid #40a9ff',
    padding: '5px',
    backgroundColor: '#ffffff',
  };

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Table.configure({
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }) as any,
      TableRow,
      TableHeader,
      TableCell,
      Mermaid,
      Selection,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();

      if (onChange) {
        onChange(content);
      }
      if (onUpdate) {
        onUpdate(editor, content);
      }
    },
    onSelectionUpdate: ({ editor, transaction }) => {
      const { from, to } = editor.state.selection;

      if (from !== to) {
        getSurroundingParagraphs();
        // Sample content of transaction.selection: {"type":"text","anchor":89,"head":375}
        const selectionHtml = getHTMLFromFragment(
          transaction.doc.slice(
            transaction.selection.from - SELECTION_OFFSET,
            transaction.selection.to + SELECTION_OFFSET
          ).content,
          editor.schema
        );

        // Removing empty HTML tags:
        // Match an empty HTML tag at the end of the string
        // Check that the content inside the tag is either empty or contains only whitespace or &nbsp;
        const cleanedHtml = selectionHtml.replace(
          /<([a-z][a-z0-9]*)\b[^>]*>(\s*|&nbsp;)<\/\1>$/i,
          ''
        );
        setEditorData(cleanedHtml);
      } else {
        setEditorData('');
      }
    },
  });

  const getSurroundingParagraphs = useCallback(() => {
    if (editor == null) {
      return;
    }

    const { from, to } = editor.state.selection;
    const { doc } = editor.state;

    doc.nodesBetween(0, from, (node, pos) => {
      if (node.type.name === 'paragraph' && pos < from) {
        setBefore(node.textContent);
      }
    });

    doc.nodesBetween(to, doc.content.size, (node, pos) => {
      if (node.type.name === 'paragraph' && pos > to) {
        setAfter(node.textContent);
      }
    });
  }, [editor]);

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="editor-container">
      {showToolbar && (
        <>
          <Toolbar
            selectedTemplate={selectedTemplate}
            onClickTemplateIcon={onClickTemplateIcon}
            editor={editor}
            toolbarHelperText={toolbarHelperText}
          />
        </>
      )}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            placement: 'bottom-start',
            maxWidth: '100%',
            zIndex: 1,
          }}
        >
          <Space>
            <Flex style={boxStyle} gap="small">
              <SelectionMenu
                key={editor.state.selection.to}
                onAccept={(generatedText) => {
                  replaceSelection(editor, generatedText, editorData);
                  const { from } = editor.state.selection;
                  editor.commands.setTextSelection(from);
                }}
                editorData={{
                  selection: editorData,
                  after,
                  before,
                }}
              />
              <Button
                icon={<BoldOutlined />}
                onClick={() => editor.chain().focus().toggleBold().run()}
                type={editor.isActive('bold') ? 'primary' : 'default'}
              />
              <Button
                icon={<ItalicOutlined />}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                type={editor.isActive('italic') ? 'primary' : 'default'}
              />
              <Button
                icon={<UnderlineOutlined />}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                type={editor.isActive('underline') ? 'primary' : 'default'}
              />
              <Button
                icon={<StrikethroughOutlined />}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                type={editor.isActive('strike') ? 'primary' : 'default'}
              />
              <Button
                icon={<UnorderedListOutlined />}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                type={editor.isActive('bulletList') ? 'primary' : 'default'}
              />
            </Flex>
          </Space>
        </BubbleMenu>
      )}
      {editor && (
        <div style={{ paddingBottom: 10 }} className="editor-content">
          {editor.isEmpty ? (
            <Flex align="center" justify="center">
              <div
                style={{
                  textAlign: 'center',
                  color: COLORS.GRAY,
                  margin: '50px',
                }}
              >
                <EmptyIcon />
                <div style={{ marginTop: '10px' }}>
                  No content generated yet
                </div>
              </div>
            </Flex>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;
