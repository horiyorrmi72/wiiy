import { useEffect, useRef, useState } from 'react';
import { CloudUploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ChatSession, ChatSessionTargetEntityType } from '@prisma/client';
import {
  Button,
  Flex,
  Input,
  message,
  Spin,
  Tag,
  Tooltip,
  TreeDataNode,
  Typography,
  Upload,
} from 'antd';
import * as pdfjsLib from 'pdfjs-dist';
import { useParams } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import {
  AIAgentIntroMessage,
  AIAgentSampleInputs,
} from '../../../common/constants';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { ReactComponent as AiGenerationButton } from '../../../common/icons/ai-generation-button.svg';
import { ReactComponent as Pen } from '../../../common/icons/pen.svg';
import { getHeaders } from '../../../common/util/apiHeaders';
import {
  checkIsGenerationLocked,
  getParagraphsFromWordFile,
} from '../../../common/util/app';
import { getFileIcon } from '../../../common/util/fileIcon';
import { api_url, COLORS } from '../../../lib/constants';
import trackEvent from '../../../trackingClient';
import ChatRecords, {
  ChatRecord,
  UserType,
} from '../../documents/components/ChatRecords';
import DocTreeNodes from '../../documents/components/DocTreeNodes';
import DocumentToolbar, {
  DocumentToolBarActions,
} from '../../documents/components/DocumentToolbar';
import { useUserDocuments } from '../../documents/hooks/useUserDocuments';
import { IdeasPath } from '../../nav/paths';
import { useChatHistory, useUserChatSession } from '../hooks/useChat';

import './Chat.scss';

export interface IHandleCommand {
  e: React.MouseEvent<HTMLButtonElement> | React.ChangeEvent<HTMLInputElement>;
  command: ChatInputBoxCommand;
  payload: ChatInputBoxPayload;
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

export enum ChatInputBoxCommand {
  GENERATE,
  CHOOSE_DOC,
}

export interface ChatInputBoxPayload {
  fileList: FileItem[];
  fileContentList: FileContent[];
  chatContent: string;
}

function useChatSessionIdParam(): string {
  const { chatSessionId } = useParams();
  if (!chatSessionId) {
    throw new Error('You must specify a chatSessionId parameter');
  }
  return chatSessionId;
}

export function Chat() {
  const chatSessionId = useChatSessionIdParam();
  const { user, organization } = useCurrentUser();
  const { data: docs } = useUserDocuments(user.id);
  const { data: chatSessions } = useUserChatSession(user.id);
  const { data: initialHistoryRecords, isLoading } =
    useChatHistory(chatSessionId);
  const [selectedDocNodes, setSelectedDocNodes] = useState<TreeDataNode[]>([]);
  const { showAppModal } = useAppModal();
  const [chatRecords, setChatRecords] = useState<ChatRecord[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [fileContentList, setFileContentList] = useState<FileContent[]>([]);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [chatContent, setChatContent] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const outerDivRef = useRef<HTMLDivElement>(null);

  const chatSession = chatSessions?.find(
    (chat: ChatSession) => chat.id === chatSessionId
  );

  const isGenerationLocked = checkIsGenerationLocked(organization);

  useEffect(() => {
    if (!isLoading) {
      setChatRecords(initialHistoryRecords || []);
    }
  }, [isLoading, initialHistoryRecords]);

  useEffect(() => {
    if (successMessage) {
      setChatRecords([
        ...chatRecords,
        {
          type: UserType.AI,
          message: successMessage,
        },
      ]);
      setSuccessMessage('');
    }
  }, [successMessage, setChatRecords, chatRecords]);

  const isRightFileType = (file: File) => {
    const mimeType = file.type;

    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (
      mimeType === 'application/msword' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return '.docx';
    } else if (mimeType === 'application/pdf') {
      return 'pdf';
    } else {
      return 'others';
    }
  };

  const handleChooseMyFile = async (file: File) => {
    const fileType = isRightFileType(file);
    if (fileType === 'others') {
      message.error('Please upload image, word or pdf files.');
      return;
    }

    console.log('file', file);
    const fileOriginalName = file.name;
    let fileResult = '';
    setUploading(true);
    if (fileType === '.docx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        const paragraphs = getParagraphsFromWordFile(content);
        console.log('paragraphs:', paragraphs);
        fileResult = paragraphs.join('\n\n');
      };

      reader.onloadend = () => {
        console.log('fileResult:', fileResult);
        let fileContentListNew = [...fileContentList];

        fileContentListNew.unshift({
          fileType: '.docx',
          fileContent: 'This is a word document: \n' + fileResult,
          fileId: fileOriginalName,
        });
        setFileContentList(fileContentListNew);

        setUploading(false);
      };

      reader.onerror = (err) => {
        console.error(err);
        setUploading(false);
      };

      reader.readAsArrayBuffer(file);
    }
    if (fileType === 'pdf') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
      const loadingTask = pdfjsLib.getDocument({
        data: await file.arrayBuffer(),
      });
      const pdf = await loadingTask.promise;
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();

        const textItems = textContent.items
          .map((item) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');
        fileResult += textItems + '\n\n';
      }
      console.log('pdf content: ', fileResult);
      let fileContentListNew = [...fileContentList];

      fileContentListNew.unshift({
        fileType: 'pdf',
        fileContent: 'This is a pdf document: \n' + fileResult,
        fileId: fileOriginalName,
      });
      setFileContentList(fileContentListNew);
    }

    if (fileType === 'image') {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const reader = new FileReader();

      let base64String = '';
      reader.onload = () => {
        base64String = reader.result as string;
      };

      reader.onloadend = () => {
        let fileContentListNew = [...fileContentList];

        base64String = reader.result as string;

        fileContentListNew.unshift({
          fileType: 'image',
          fileContent: base64String,
          fileId: fileOriginalName,
        });
        setFileContentList(fileContentListNew);
      };

      reader.readAsDataURL(blob);
    }

    let fileListNew = [...fileList];
    const length = fileListNew.length;
    fileListNew.unshift({
      fileName: fileOriginalName,
      fileUrl: '',
      id: length + 1,
      documentId: '',
      fileBlob: file,
    });
    setFileList(fileListNew);
    setUploading(false);
  };

  const handleDeleteFile = (paramItem: FileItem) => {
    const updatedFileList = fileList.filter((item) => item.id !== paramItem.id);
    const updatedFileContentList = fileContentList.filter(
      (item) => item.fileId !== paramItem.fileName
    );
    setFileList(updatedFileList);
    setFileContentList(updatedFileContentList);
  };

  const handleGenerate = () => {
    console.log('in containers.chats.components.chat.handleGenerate');
  };

  const handleInputChange = (
    e: React.FocusEvent<HTMLTextAreaElement, Element>
  ) => {
    setChatContent(e.target.value);
  };

  const sendMessageToAI = async () => {
    if (chatContent.trim() === '') {
      message.error('Chat content can not empty! ');
      return;
    }

    if (isLoading) {
      message.error('Loading chat history, please try again later.');
      return;
    }

    if (isGenerationLocked) {
      showAppModal({
        type: 'updateSubscription',
        payload: {
          email: user.email,
          source: 'Chat',
          destination: `Chat:${chatSessionId}`,
        },
      });
      return;
    }

    const updatedChatRecords = [
      ...chatRecords,
      {
        type: UserType.HUMAN,
        message: chatContent,
      },
    ];
    setChatRecords(updatedChatRecords);
    setChatContent('');
    setIsThinking && setIsThinking((isThinking) => true);
    const headers = await getHeaders();
    const result = await fetch(`${api_url}/api/chats/full-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entityId: chatSessionId,
        entityType: ChatSessionTargetEntityType.CHAT,
        entitySubType: '',
        description: chatContent,
        uploadedFileContent: fileContentList, //add uploaded file content
        chosenDocumentIds: selectedDocNodes?.length
          ? selectedDocNodes.map((f) => f.key).join(',')
          : '',
        chatSessionId,
      }),
    });

    // track chat message
    trackEvent('chatMessage', {
      distinct_id: chatSessionId,
      payload: JSON.stringify({
        userEmail: user.email,
        targetEntityType: ChatSessionTargetEntityType.CHAT,
        docType: '',
        chatContent,
      }),
    });

    const { success, data, errorMsg } = await result.json();
    setIsThinking && setIsThinking(false);
    if (!success) {
      message.error('Error loading document: ' + errorMsg);
      return;
    }

    console.log('ai response: ', data);
    setChatRecords([
      // Current thread hasn't finished. Please use updatedChatRecords here.
      ...updatedChatRecords,
      {
        type: UserType.AI,
        message: data.message,
      },
    ]);
    setSuccessMessage(data.success_message);
    // check if user intent is to create a document, we may alert user on document generation
    if (data.intent === 'DOCUMENT') {
      // TODO - ALERT User if they want to convert to document creation
      handleGenerate();
    }
  };

  const sampleInputs = AIAgentSampleInputs.CHAT;
  const introMsg = AIAgentIntroMessage.CHAT;
  const breadcrumbItems = [
    {
      key: 'ideas',
      label: 'Ideas',
      link: `/${IdeasPath}`,
    },
    {
      key: chatSession?.name as string,
      label: chatSession?.name as string,
    },
  ];

  return (
    <Flex
      className="chat-container"
      vertical
      style={{ height: '100%', justifyContent: 'space-between' }}
    >
      <DocumentToolbar
        breadcrumbItems={breadcrumbItems}
        docActions={[DocumentToolBarActions.Convert]}
      />
      <Flex vertical style={{ flexGrow: 1, justifyContent: 'space-between' }}>
        <ChatRecords
          isThinking={isThinking}
          isLoaded={!isLoading}
          records={chatRecords}
          introMsg={introMsg}
        />
        {!chatRecords?.length && !isLoading && (
          <Flex vertical>
            <Flex
              style={{
                margin: '8px 0',
                alignItems: 'center',
                borderTop: 'solid 1px #eee',
                paddingTop: '10px',
                boxShadow: '0 -5px 5px -5px #eee',
              }}
            >
              <Pen />
              <Typography.Title
                level={5}
                style={{ marginLeft: '4px', margin: 0 }}
              >
                Sample Prompt
              </Typography.Title>
            </Flex>
            <Flex className="sample-input-container">
              {sampleInputs?.map((item, index) => (
                <Typography.Text
                  key={index}
                  className="sample-item"
                  onClick={() => {
                    setChatContent(item);
                  }}
                >
                  {item}
                </Typography.Text>
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
      <Flex vertical className="user-input-container" ref={outerDivRef}>
        {fileList && fileList.length > 0 && (
          <Flex
            style={{
              padding: '10px 5px 5px 5px',
              borderRadius: '8px',
              backgroundColor: COLORS.LIGHT_GRAY,
            }}
          >
            {fileList.map((item, index) => {
              return (
                <Tag
                  className="file-tag"
                  closeIcon
                  key={index}
                  onClose={() => handleDeleteFile(item)}
                >
                  <Tooltip title={item.fileName}>
                    <Typography.Text ellipsis className="file-label">
                      {getFileIcon(item.fileName?.split('.')?.pop() || '')}
                      {item.fileName}
                    </Typography.Text>
                  </Tooltip>
                </Tag>
              );
            })}
          </Flex>
        )}
        <Flex
          style={{
            border: 'none',
            marginLeft: 5,
            marginTop: 5,
          }}
          align="center"
        >
          <Upload
            name="file"
            showUploadList={false}
            customRequest={({ file }) => {
              console.log('file: ', file);
              handleChooseMyFile(file as File);
            }}
          >
            <CloudUploadOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
            <span
              style={{
                fontSize: 12,
                margin: '0 10px 0 6px',
                cursor: 'pointer',
              }}
            >
              Upload file
            </span>
          </Upload>
          <DocTreeNodes
            docs={docs}
            selectedDocNodes={selectedDocNodes}
            setSelectedDocNodes={setSelectedDocNodes}
          />
        </Flex>
        <Input.TextArea
          autoSize={{ minRows: 6, maxRows: 18 }}
          value={chatContent}
          onChange={handleInputChange}
          placeholder="Please enter your questions or instructions. You may also upload or tag documents to provide additional context."
          className="chat-box-input"
          style={{
            width: '100%',
            fontSize: '13px',
            border: 'none',
            top: '0px',
          }}
        />
        <Flex
          style={{
            position: 'absolute',
            right: 0,
            bottom: 15,
          }}
        >
          <Flex>
            {isGenerationLocked && (
              <Tooltip title="Insufficient credits. Please buy more credits or upgrade.">
                <InfoCircleOutlined
                  style={{ color: 'orange' }}
                  onClick={handleGenerate}
                />
                &nbsp;&nbsp;
              </Tooltip>
            )}
            <Button
              size="small"
              style={{ border: 'none', padding: 0, margin: 1 }}
              onClick={sendMessageToAI}
              className="chat-submit-btn"
            >
              <AiGenerationButton />
            </Button>
          </Flex>
        </Flex>

        {uploading && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spin size="large" tip="Uploading..." />
          </div>
        )}
      </Flex>
    </Flex>
  );
}
