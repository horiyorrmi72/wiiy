import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CodeOutlined,
  DesktopOutlined,
  LaptopOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { html } from '@codemirror/lang-html';
import { EditorState } from '@codemirror/state';
import { Button, Card, Collapse, Tooltip } from 'antd';
import { basicSetup, EditorView } from 'codemirror';

import { COLORS } from '../../lib/constants';

import './HtmlEditor.scss';

const { Panel } = Collapse;

interface HtmlEditorProps {
  value?: string;
  onUpdate?: (content: string, timestamp: number) => void;
}

const HtmlEditor: React.FC<HtmlEditorProps> = ({ value = '', onUpdate }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorInstanceRef = useRef<EditorView | null>(null);

  const [showPreview, setShowPreview] = useState(true);
  const [showDesktop, setShowDesktop] = useState(true);

  const isValidURL = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const isImageURL = (url: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  };

  const updatePreview = useCallback((content: string) => {
    const previewFrame = iframeRef.current;
    if (previewFrame) {
      const preview =
        previewFrame.contentDocument ?? previewFrame.contentWindow?.document;
      if (preview) {
        try {
          preview.open();
          preview.write(content);
          const viewportMeta = preview.createElement('meta');
          viewportMeta.name = 'viewport';
          viewportMeta.content = 'width=device-width, initial-scale=1';
          preview?.head?.appendChild(viewportMeta);
        } catch (error) {
          console.error('Error updating preview:', error);
        } finally {
          preview.close();
        }
      }
    }
  }, []);

  const handleUpdate = useCallback(
    (content: string) => {
      const previewFrame = iframeRef.current;
      if (previewFrame) {
        if (isValidURL(content)) {
          if (isImageURL(content)) {
            const imageContent = `<html><head><style>body{margin:0;padding:0;}img{width:100%;height:auto;display:block;}</style></head><body><img src="${content}" alt="Image" /></body></html>`;
            updatePreview(imageContent);
          } else {
            previewFrame.src = content;
          }
        } else {
          updatePreview(content ?? '');
        }
      }
      if (onUpdate) {
        const timestamp = Date.now();
        onUpdate(content, timestamp);
      }
    },
    [onUpdate, updatePreview]
  );

  const toggleCodeAndPreview = () => {
    setShowPreview(!showPreview);
  };

  const toggleDesktopAndMobile = () => {
    setShowDesktop(!showDesktop);
    let iframe = document.getElementById('page-preview');
    if (iframe) {
      iframe.style.width = showDesktop ? '375px' : '100%'; // Mobile device width
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    const clickHandler = () => {
      iframe?.contentDocument?.body.addEventListener('click', () => {
        document.dispatchEvent(new Event('mousedown'));
      });
    };

    if (editorRef.current && !editorInstanceRef.current) {
      const updateListener = EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          const content = v.state.doc.toString();
          handleUpdate(content);
        }
      });

      if (iframe && iframe.contentWindow) {
        iframe.addEventListener('load', clickHandler);
      }

      const state = EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          html(),
          updateListener,
          EditorView.theme({
            '&': {
              height: '100%',
              maxHeight: 'calc(100% - 50)',
              overflow: 'auto',
            },
            '.cm-scroller': {
              overflow: 'auto',
            },
            '.cm-content': {
              width: '100%',
              boxSizing: 'border-box',
            },
            '.cm-line': {
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            },
          }),
          EditorView.lineWrapping,
        ],
      });

      editorInstanceRef.current = new EditorView({
        state: state,
        parent: editorRef.current,
      });

      handleUpdate(value);
    }

    return () => {
      try {
        if (editorInstanceRef.current) {
          editorInstanceRef.current.destroy();
          editorInstanceRef.current = null;
        }

        if (iframe && iframe.contentWindow) {
          iframe.contentDocument?.body?.removeEventListener(
            'click',
            clickHandler
          );
        }
      } catch (e) {
        console.error('error:', e);
      }
    };
  }, [value, handleUpdate, onUpdate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '100%',
      }}
    >
      <Card
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>UI Preview</span>
            <div>
              <Tooltip title={showPreview ? 'View code' : 'Preview app'}>
                <Button
                  onClick={toggleCodeAndPreview}
                  type="link"
                  style={{ padding: '0 5px' }}
                >
                  {showPreview ? (
                    <CodeOutlined
                      style={{
                        color: COLORS.PRIMARY,
                        fontSize: 18,
                      }}
                    />
                  ) : (
                    <LaptopOutlined
                      style={{
                        color: COLORS.PRIMARY,
                        fontSize: 18,
                      }}
                    />
                  )}
                </Button>
              </Tooltip>
              <Tooltip title={showDesktop ? 'Mobile' : 'Desktop'}>
                <Button
                  onClick={toggleDesktopAndMobile}
                  type="link"
                  style={{ padding: '0 5px' }}
                >
                  {showDesktop ? (
                    <MobileOutlined
                      style={{
                        color: COLORS.PRIMARY,
                        fontSize: 18,
                      }}
                    />
                  ) : (
                    <DesktopOutlined
                      style={{
                        color: COLORS.PRIMARY,
                        fontSize: 18,
                      }}
                    />
                  )}
                </Button>
              </Tooltip>
              {/* <Tooltip title="Download code">
                <Button
                  onClick={toggleDesktopAndMobile}
                  type="link"
                  style={{ padding: '0 5px' }}
                >
                  <DownloadOutlined
                    style={{
                      color: COLORS.PRIMARY,
                      fontSize: 18,
                    }}
                  />
                </Button>
              </Tooltip> */}
            </div>
          </div>
        }
        style={{
          overflow: 'hidden',
          border: 'none',
          borderRadius: '0',
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
        styles={{
          body: {
            padding: '10px',
            background: '#F5F5F5',
            display: showPreview ? 'block' : 'none',
          },
        }}
      >
        <iframe
          ref={iframeRef}
          id="page-preview"
          className="preview"
          title="Preview"
        />
      </Card>
      <Collapse
        defaultActiveKey={['1']}
        style={{
          border: 'none',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          borderRadius: 0,
          display: showPreview ? 'none' : 'block',
          height: '100%',
        }}
      >
        <Panel
          header="UI Editor (You may enter Design URL, or update html code to update UI preview)"
          key="1"
        >
          <div ref={editorRef} className="editor"></div>
        </Panel>
      </Collapse>
    </div>
  );
};

export default HtmlEditor;
