import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { DOCTYPE, DocumentStatus, TemplateDocument } from '@prisma/client';
import { Flex, Form, message, Skeleton } from 'antd';
import { debounce } from 'lodash';
import { useNavigate, useParams } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import HtmlEditor from '../../../common/components/HtmlEditor';
import TiptapEditor from '../../../common/components/TiptapEditor';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { checkIsGenerationLocked } from '../../../common/util/app';
import { convertHTMLToParagraph } from '../../../lib/convert';
import trackEvent from '../../../trackingClient';
import { TableInfo } from '../../project/components/prototype/PrototypeDataBaseHandler';
import ProtoTypeDataShow from '../../project/components/prototype/PrototypeDataShow';
import { handleDeploy } from '../../project/components/prototype/PrototypeDeployHandler';
import PrototypeEditorShow from '../../project/components/prototype/PrototypeEditorShow';
import { usePRDTutorial } from '../../project/components/tutorials';
import useDocumentMutation from '../../project/hooks/useDocumentMutation';
import { TemplateCenterModal } from '../../templateDocument/components/TemplateCenterModal';
import { getDocumentApi } from '../api/getDocumentApi';
import { useDocument } from '../hooks/useDocument';
import { TemplateDocumentOutput } from '../types/documentTypes';
import {
  ChatBox,
  ChatInputBoxCommand,
  ChatInputBoxPayload,
  IHandleCommand,
} from './ChatBox';
import DocumentToolbar from './DocumentToolbar';
import EditorSidebar from './EditorSidebar';
import GeneratingDocLoader from './GeneratingDocLoader';
import { RequestDocumentAccess } from './requestDocumentAccess';

import './DocumentEditor.scss';

export type DocHistoryItem = {
  content: string;
  date: Date;
  description: string;
  email: string;
  userId: string;
  rating: Array<{ userId: string; value: number }>;
  imageBase64?: string;
};

function useDocumentIdParam(): string {
  const { docId } = useParams();
  if (!docId) {
    throw new Error('You must specify a document ID parameter');
  }
  return docId;
}

export interface FileItem {
  fileName: string;
  fileUrl: string;
  id: number;
  documentId: string;
  fileBlob: File | null;
}

export interface FileContent {
  fileContent: string;
  fileType: string;
  fileId: string;
}

export function DocumentEditor() {
  const [isMobile, setIsMobile] = useState(false);

  const { upsertDocumentMutation } = useDocumentMutation({
    onSuccess: (doc) => {
      console.log('upsertDocumentMutation.success');
      setIsFetching(false);
      isFetchingContent.current = false;

      if (
        doc.status === DocumentStatus.PUBLISHED &&
        doc.type !== DOCTYPE.UI_DESIGN &&
        doc.type !== DOCTYPE.PROTOTYPE
      ) {
        navigate(
          doc.projectId ? `/projects/${doc.projectId}/planning` : '/docs'
        );
      }
    },
    onError: () => {
      console.error('error');
      setIsFetching(false);
      isFetchingContent.current = false;
    },
  });

  const documentId = useDocumentIdParam();
  const navigate = useNavigate();
  const {
    data: doc,
    isLoading,
    isError,
    refetch: refetchDocument,
  } = useDocument(documentId);
  const formRef = useRef(null);
  const { showAppModal } = useAppModal();
  const { user, organization } = useCurrentUser();
  const [form] = Form.useForm();
  const isFetchingContent = useRef(false);
  const chatSessionId = useRef('');
  const isGenerationLocked = checkIsGenerationLocked(organization);
  const [isFetching, setIsFetching] = useState(false);
  const [isDocFullScreen, setIsDocFullScreen] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [currentImage, setCurrentImage] = useState<string | null>('');
  const [templateCenterOpen, setTemplateCenterOpen] = useState(false);
  const [selectTemplate, setSelectTemplate] =
    useState<TemplateDocumentOutput | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [localDoc, setLocalDoc] = useState(doc);
  const [isDatabaseModalVisible, setIsDatabaseModalVisible] = useState(false);
  const [databaseData, setDatabaseData] = useState<TableInfo[]>([]);

  usePRDTutorial(localDoc);

  useEffect(() => {
    setLocalDoc(doc);
  }, [doc]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 575);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (!form || !formRef?.current) {
      return;
    }

    form.setFieldsValue({
      name: localDoc?.name || '',
      description:
        localDoc?.description || localDoc?.project?.description || '',
      contents: localDoc?.contents,
      url: localDoc?.url || '',
    });

    if (localDoc?.templateDocument) {
      setSelectTemplate(localDoc?.templateDocument);
    }
  }, [localDoc, form, formRef]);

  const onUpdateHTML = debounce(
    useCallback(
      (e: string, timestamp: number) => {
        form.setFieldValue('contents', e);
      },
      [form]
    ),
    1000
  );

  const { generateDocumentMutation } = useDocumentMutation({
    onSuccess: (doc) => {
      console.log('generateDocumentMutation success', doc.contentStr);
      // only disable fetching content if contentStr is available, otherwise we will keep polling from server
      if (doc.contentStr) {
        form.setFieldValue('contents', doc.contentStr);
        setIsFetching(false);
        isFetchingContent.current = false;
        chatSessionId.current = doc.chatSessionId;
      }
    },
    onError: () => {
      console.error('documentEditor.generateDocumentMutation.error');
      setIsFetching(false);
    },
  });

  const triggerDocumentRefetch = useCallback(
    (interval = 1000) => {
      setTimeout(async () => {
        if (isFetchingContent.current) {
          let updatedDoc = await getDocumentApi(documentId);
          if (updatedDoc?.contents) {
            console.log('triggerDocumentRefetch:', Date.now());
            form.setFieldValue('contents', updatedDoc.contents);
            setLocalDoc(updatedDoc);
            setIsFetching(false);
            isFetchingContent.current = false;
            if (updatedDoc.type === DOCTYPE.PROTOTYPE) {
              setSourceUrl(updatedDoc.meta?.sourceUrl as string);
            }
          } else {
            triggerDocumentRefetch(5000);
          }
        }
      }, interval);
    },
    [documentId, form]
  );

  const updateLoadingPercent = useCallback(() => {
    if (!isFetchingContent.current) {
      return;
    }
    setTimeout(() => {
      setLoadingPercent((currentPercent) => {
        if (currentPercent < 100) {
          // distribute increase to 1min (60s) to get to 100%
          return Math.min(99, Math.floor(currentPercent + Math.random() * 5));
        }
        return currentPercent;
      });
      updateLoadingPercent();
    }, 1500);
  }, []);

  const handleDeployClick = useCallback(async () => {
    if (!localDoc?.id) {
      message.error('Please save the document first');
      return;
    }
    const success = await handleDeploy(
      localDoc.id,
      sourceUrl || localDoc?.meta?.sourceUrl || ''
    );

    if (success) {
      // Refresh the document to get the updated deployment status
      refetchDocument();
    }
  }, [localDoc?.id, localDoc?.meta?.sourceUrl, sourceUrl, refetchDocument]);

  const handleViewDatabaseData = (data: TableInfo[]) => {
    if (!data || data.length === 0) return;
    setDatabaseData(data);
    setIsDatabaseModalVisible(true);
  };

  if (!localDoc) {
    return (
      <>
        <Skeleton active />
      </>
    );
  }
  if (isError) {
    return (
      <RequestDocumentAccess
        documentId={documentId}
        onSuccess={() => {
          message.success('Request sent successfully');
          setTimeout(() => {
            navigate(`/index`);
          }, 1000);
        }}
      />
    );
  }

  async function generateContent(payload: ChatInputBoxPayload) {
    if (isGenerationLocked) {
      showAppModal({
        type: 'updateSubscription',
        payload: {
          email: user.email,
          source: 'documentEditor',
          destination: `generate:${localDoc?.type}`,
        },
      });
      return;
    }

    console.log('generateContent payload:', payload);
    try {
      if (
        localDoc?.type === DOCTYPE.PRD ||
        localDoc?.type === DOCTYPE.PROPOSAL
      ) {
        const values = await form.validateFields();
        console.log('Success:', values);
      }
    } catch (error) {
      console.log('Failed:', error);
      return;
    }
    const { chatContent } = payload;
    console.log('selectTemplate=', selectTemplate);
    // generateDocumentMutation.mutate({
    //   id: documentId,
    //   type: doc?.type,
    //   name: doc?.name || '',
    //   description: chatContent || doc?.description || '',
    //   projectId: doc?.projectId,
    //   contents: doc?.contents,
    //   imageBase64: currentImage,
    //   templateId: selectTemplate?.id,
    //   uploadedFileContent: fileContentList, //add uploaded file content
    //   chosenDocumentIds: fileList?.length
    //     ? fileList.map((f) => f.documentId).join(',')
    //     : '', // add chosen document ids
    //   chatSessionId: chatSessionId.current,
    // });
    //track event
    trackEvent('generateDocument', {
      distinct_id: user.email,
      payload: JSON.stringify({
        documentId: documentId,
        documentType: localDoc?.type,
        description:
          chatContent ||
          localDoc?.description ||
          localDoc?.project?.description ||
          '',
        chatSessionId: chatSessionId.current,
      }),
    });

    setIsFetching(true);
    isFetchingContent.current = true;
    // in case Heroku kills HTTP request 30s after the first one, we need to trigger a refetch
    // TODO - Try out streaming API to avoid this
    setLoadingPercent(0);
    updateLoadingPercent();
    triggerDocumentRefetch();
  }

  function updateDoc(
    e: React.MouseEvent<HTMLButtonElement>,
    refreshPage: boolean = true
  ) {
    let action: string = e?.currentTarget?.dataset?.action || '';
    let { name, description, contents, url } = form.getFieldsValue();
    let payload = {
      id: documentId,
      name,
      projectId: localDoc?.projectId,
      type: localDoc?.type,
      description: description,
      contentStr: contents || '',
      url,
      status:
        action === 'publish'
          ? DocumentStatus.PUBLISHED
          : DocumentStatus.CREATED,
    };
    upsertDocumentMutation.mutate(payload);
    // track event
    trackEvent(action === 'publish' ? 'publishDocument' : 'updateDocument', {
      distinct_id: user.email,
      payload: JSON.stringify({
        documentId: documentId,
        documentType: localDoc?.type,
        description,
        action,
      }),
    });
    if (refreshPage) {
      setIsFetching(true);
      isFetchingContent.current = true;
    }
  }

  function handleOnInputBoxCommand(
    command: IHandleCommand['command'],
    payload: ChatInputBoxPayload
  ) {
    switch (command) {
      case ChatInputBoxCommand.GENERATE:
        generateContent(payload);
        break;
    }
  }

  const breadcrumbItems = localDoc?.projectId
    ? [
        {
          key: 'project',
          label: localDoc.project?.name as string,
          link: `/projects/${localDoc!.projectId}`,
        },
        {
          key: 'planning',
          label: 'Planner',
          link: `/projects/${localDoc.projectId}/planning`,
        },
        {
          key: localDoc.type,
          label: localDoc.name,
        },
      ]
    : [
        {
          key: 'documents',
          label: 'Documents',
          link: `/docs`,
        },
        {
          key: localDoc?.type as string,
          label: localDoc?.name as string,
        },
      ];

  const fullScreenIconStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 100,
    fontSize: '24px',
    bottom: '6px',
    right: '10px',
  };

  const isGeneratingDoc = isLoading || isFetching || isFetchingContent.current;

  const updateDocFullScreen = () => {
    console.log('updateDocFullScreen');
    setIsDocFullScreen(!isDocFullScreen);
  };

  return (
    <Form
      ref={formRef}
      form={form}
      className="document-form"
      style={{ height: '100%' }}
    >
      <Flex style={{ height: '100%', position: 'relative', overflow: 'auto' }}>
        <div id="document-editor-container">
          {isGeneratingDoc && (
            <GeneratingDocLoader loadingPercent={loadingPercent} />
          )}
          <div
            style={{
              height: '100%',
              position: 'relative',
              width: '100%',
            }}
          >
            {isDocFullScreen && (
              <FullscreenExitOutlined
                title="Exit full screen"
                style={fullScreenIconStyle}
                onClick={updateDocFullScreen}
              />
            )}
            {!isDocFullScreen && (
              <FullscreenOutlined
                title="Full screen"
                style={fullScreenIconStyle}
                onClick={updateDocFullScreen}
              />
            )}
            <div style={{ padding: '0 16px' }}>
              <DocumentToolbar
                breadcrumbItems={breadcrumbItems}
                doc={localDoc}
                updateDoc={updateDoc}
                paragraphs={convertHTMLToParagraph({ doc: localDoc as any })}
                pdfLineHeight={1.3}
                onDeploy={handleDeployClick}
                onViewDatabase={handleViewDatabaseData}
              />
            </div>
            <Flex
              vertical
              style={{
                paddingTop: '0',
              }}
              className="document-editor-content"
            >
              <Form.Item label="" name="contents" rules={[{ required: false }]}>
                {/* Left side - PrototypeEditorShow */}

                {localDoc?.type === DOCTYPE.UI_DESIGN && (
                  <HtmlEditor onUpdate={onUpdateHTML} />
                )}
                {localDoc?.type === DOCTYPE.PROTOTYPE && (
                  <PrototypeEditorShow
                    document={localDoc}
                    setSourceUrl={setSourceUrl}
                  />
                )}
                {localDoc?.type !== DOCTYPE.UI_DESIGN &&
                  localDoc?.type !== DOCTYPE.PROTOTYPE && (
                    <TiptapEditor
                      selectedTemplate={selectTemplate}
                      onClickTemplateIcon={() =>
                        setTemplateCenterOpen(!templateCenterOpen)
                      }
                      onUpdate={debounce((e, contents: string) => {
                        updateDoc(e, false);
                      }, 1000)}
                    />
                  )}
              </Form.Item>
            </Flex>
          </div>
        </div>
        {/* Right side - ChatBox */}

        <EditorSidebar
          selectedTemplate={selectTemplate}
          onClickTemplateIcon={() => setTemplateCenterOpen(!templateCenterOpen)}
          setActiveHistory={(item) => {
            setCurrentImage(item?.imageBase64 ?? null);
          }}
          form={form}
          setSelectTemplate={(template) => {
            setSelectTemplate(template);
          }}
          document={localDoc}
          isDocFullScreen={isDocFullScreen}
          setIsDocFullScreen={setIsDocFullScreen}
          refetchDocument={refetchDocument}
        >
          <ChatBox
            isGeneratingDoc={isGeneratingDoc}
            doc={localDoc}
            currentImage={(currentImage || localDoc?.imageBase64) as string}
            selectedTemplateId={selectTemplate?.id as string}
            placeholder={
              isMobile
                ? 'Send a message'
                : localDoc?.contents
                  ? 'Add your feedback to the generated content before asking Joy to regenerate.'
                  : 'Please enter your instructions. You may also upload or link documents to provide additional context.'
            }
            onCommand={handleOnInputBoxCommand}
          />
        </EditorSidebar>
      </Flex>

      <TemplateCenterModal
        open={templateCenterOpen}
        onClose={function (): void {
          setTemplateCenterOpen(false);
        }}
        selectedTemplateId={selectTemplate?.id}
        onUseTemplate={function (template: TemplateDocument): void {
          console.log('select template: ', template);
          setSelectTemplate?.(template);
        }}
      />

      {isDatabaseModalVisible && databaseData && databaseData.length > 0 && (
        <ProtoTypeDataShow
          onClose={() => {
            setIsDatabaseModalVisible(false);
          }}
          data={databaseData}
          documentId={localDoc?.id || ''}
        />
      )}
    </Form>
  );
}
