import { useCallback, useEffect, useState } from 'react';
import { TemplateDocument } from '@prisma/client';
import { Drawer, Flex } from 'antd';
import Sider from 'antd/es/layout/Sider';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import trackEvent from '../../../trackingClient';
import { DevPlanOutput } from '../../devPlans/types/devPlanTypes';
import { TemplateCenterModal } from '../../templateDocument/components/TemplateCenterModal';
import { DocumentOutput, TemplateDocumentOutput } from '../types/documentTypes';
import { DocHistoryItem } from './DocumentEditor';
import DocumentHistory from './DocumentHistory';
import Resizer from './Resizer';

import './EditorSidebar.scss';

interface EditorSidebarProps {
  document: DocumentOutput | DevPlanOutput;
  form: any;
  refetchDocument?: () => void;
  isDocFullScreen?: boolean;
  setIsDocFullScreen?: any;
  selectedTemplate?: TemplateDocumentOutput | null;
  onClickTemplateIcon?: () => void;
  setActiveHistory?: (value: DocHistoryItem | null) => void;
  setSelectTemplate?: (value: TemplateDocument | null) => void;
  children?: React.ReactNode;
}

const sideEditorWidthKey = 'sideEditorWidth';

export default function EditorSidebar({
  document,
  form,
  isDocFullScreen,
  setIsDocFullScreen,
  setActiveHistory,
  refetchDocument,
  setSelectTemplate,
  children,
}: EditorSidebarProps) {
  const [templateCenterOpen, setTemplateCenterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useCurrentUser();
  const [editorSidebarWidth, setEditorSidebarWidth] = useState(
    window.localStorage.getItem(sideEditorWidthKey) || '45%'
  );

  const resize = (e: MouseEvent) => {
    const newWidth = window.innerWidth - e.x + 'px';
    setEditorSidebarWidth(newWidth);
    window.localStorage.setItem(sideEditorWidthKey, newWidth);
    window.document.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1023);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleHistoryChange = useCallback(
    (item: DocHistoryItem, versionNumber: number) => {
      setActiveHistory?.(item);

      form.setFieldsValue({
        description: item?.description,
        contents: item?.content,
      });

      // track event
      trackEvent('viewDocHistory', {
        distinct_id: user.email,
        payload: JSON.stringify({
          documentId: document.id,
          documentType: document?.type,
          name: document?.name,
          versionNumber,
        }),
      });
    },
    [document, form, setActiveHistory, user.email]
  );

  const SidebarContent = (
    <>
      <Flex
        vertical
        gap={2}
        style={{
          padding: '10px',
          minHeight: '100%',
          height: '100%',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <Flex
          justify="space-between"
          vertical
          gap={2}
          style={{ marginBottom: 10 }}
        >
          <TemplateCenterModal
            open={templateCenterOpen}
            onClose={function (): void {
              setTemplateCenterOpen(false);
            }}
            onUseTemplate={function (template: TemplateDocument): void {
              setSelectTemplate?.(template);
            }}
          />
        </Flex>
        {children}
      </Flex>

      <DocumentHistory
        document={document}
        onHandleHistoryChange={handleHistoryChange}
        onRefetchDocument={refetchDocument}
      />
    </>
  );

  return (
    <>
      {!isDocFullScreen && !isMobile && <Resizer onResize={resize}></Resizer>}
      {isMobile ? (
        <Drawer
          open={isDocFullScreen}
          placement="right"
          onClose={() => setIsDocFullScreen(!isDocFullScreen)}
          styles={{
            body: { padding: 0 },
            header: {
              position: 'absolute',
              top: '12px',
              left: '12px',
              border: 'none',
              padding: '0',
              zIndex: 9999,
            },
          }}
          style={{
            overflow: 'hidden',
            paddingBottom: '10px',
            backgroundColor: '#F4F6FB',
          }}
        >
          {SidebarContent}
        </Drawer>
      ) : (
        <Sider
          width={editorSidebarWidth}
          theme="light"
          className="editor-side-bar-container"
          style={{
            flex: 1,
            overflow: 'hidden',
            paddingBottom: '10px',
            backgroundColor: '#F4F6FB',
            borderInlineStart: '1px solid rgba(5,5,5,0.06)',
            display: isDocFullScreen ? 'none' : 'flex',
          }}
        >
          {SidebarContent}
        </Sider>
      )}
    </>
  );
}
