import { useEffect, useRef, useState } from 'react';
import {
  CodeOutlined,
  DesktopOutlined,
  EyeOutlined,
  LoadingOutlined,
  MobileOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Prisma } from '@prisma/client';
import { Button, Flex, message, Spin, Tooltip, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';

import PrototypeCodeEditor from '../../../../common/components/PrototypeCodeEditor';
import { checkDeploymentStatus, deployToVercel } from '../../api/deployApi';
import useDocumentMutation from '../../hooks/useDocumentMutation';

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file';
}

export interface PrototypeEditorProps {
  projectFiles: ProjectFile[];
  onError: (error: string) => void;
  docId: string;
  setSourceUrl: (sourceUrl: string) => void;
  sourceUrl: string;
  documentMeta: Prisma.JsonObject;
}

// File tree node type
interface FileTreeNode extends DataNode {
  key: string;
  title: string;
  path: string;
  isLeaf?: boolean;
  children?: FileTreeNode[];
}

export function PrototypeEditor({
  projectFiles: initialProjectFiles,
  onError,
  docId,
  setSourceUrl,
  sourceUrl,
  documentMeta,
}: PrototypeEditorProps) {
  const isFetchingContent = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lastReportedError = useRef<string | null>(null);
  const errorCount = useRef<number>(0);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop'
  );

  // Add helper functions for view mode
  const isCodeView = () => viewMode === 'code';
  const isPreviewView = () => viewMode === 'preview';

  // Add states
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Add state to manage project files
  const [projectFiles, setProjectFiles] =
    useState<ProjectFile[]>(initialProjectFiles);

  // Add error debouncing logic
  const lastErrorTime = useRef<number>(0);

  const [isUploadingToVercel, setIsUploadingToVercel] = useState(false);

  // Add useEffect to update projectFiles when initialProjectFiles changes
  useEffect(() => {
    const currentFilesStr = JSON.stringify(projectFiles);
    const newFilesStr = JSON.stringify(initialProjectFiles);

    if (currentFilesStr !== newFilesStr) {
      setProjectFiles(initialProjectFiles);

      // Try to find and open package.json
      const packageJsonFile = initialProjectFiles.find(
        (file) => file.path === 'package.json'
      );

      if (packageJsonFile) {
        setSelectedFile('package.json');
        setFileContent(packageJsonFile.content);
      } else {
        // If no package.json, don't select any file
        setSelectedFile('');
        setFileContent('');
      }
    }
  }, [initialProjectFiles, selectedFile, fileContent, projectFiles]);

  // Add useEffect to handle initial package.json opening
  useEffect(() => {
    if (initialProjectFiles.length > 0) {
      const packageJsonFile = initialProjectFiles.find(
        (file) => file.path === 'package.json'
      );

      if (packageJsonFile) {
        setSelectedFile('package.json');
        setFileContent(packageJsonFile.content);
      }
    }
  }, [initialProjectFiles]); // Empty dependency array means this runs once on mount

  const { upsertDocumentMutation } = useDocumentMutation({
    onSuccess: (doc) => {
      console.log('upsertDocumentMutation.success');
      isFetchingContent.current = false;
    },
    onError: () => {
      console.error('error');
      isFetchingContent.current = false;
    },
  });

  // Update file trees when project files change

  // Handle source file selection
  const handleSourceFileSelect = async (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) {
      setSelectedFile('');
      return;
    }

    const path = selectedKeys[0] as string;
    const file = projectFiles.find((f) => f.path === path);

    if (file && file.path !== selectedFile) {
      setSelectedFile(path);
      setFileContent(file.content);
    }
  };

  // Reset error state when switching to preview mode
  useEffect(() => {
    if (viewMode === 'preview') {
      lastReportedError.current = null;
      errorCount.current = 0;
      lastErrorTime.current = 0;
      setError(null);
    }
  }, [viewMode]);

  // Modify handleSave function
  const handleSave = async () => {
    if (!selectedFile) return;
    if (!docId) {
      message.error('Document ID is required for saving');
      return;
    }

    try {
      setIsEditing(true);

      // Create new array with the latest file content
      const updatedFiles = projectFiles.map((file) =>
        file.path === selectedFile ? { ...file, content: fileContent } : file
      );

      // Update local state first
      setProjectFiles(updatedFiles);

      // Save to backend
      await upsertDocumentMutation.mutateAsync({
        id: docId,
        contentStr: JSON.stringify({ files: updatedFiles }),
        meta: {
          ...documentMeta,
          sourceUrl: sourceUrl || '',
        },
      });

      // Deploy to Vercel after saving
      const newSourceUrl = await handleUploadToVercel(updatedFiles);

      // Update source URL if deployment was successful
      if (newSourceUrl) {
        await upsertDocumentMutation.mutateAsync({
          id: docId,
          meta: {
            ...documentMeta,
            sourceUrl: newSourceUrl,
          },
        });
      }
      setStatus('ready');
      setViewMode('preview');
      message.success('File saved successfully');
    } catch (err) {
      console.error('Error saving file:', err);
      message.error('Failed to save file');
      onError?.(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsEditing(false);
    }
  };

  // Add useEffect to build file tree when projectFiles changes
  useEffect(() => {
    const buildFileTree = (files: ProjectFile[]): FileTreeNode[] => {
      const tree: FileTreeNode[] = [];
      const fileMap = new Map<string, FileTreeNode>();

      files.forEach((file) => {
        const parts = file.path.split('/');
        let currentPath = '';

        parts.forEach((part, index) => {
          currentPath = index === 0 ? part : `${currentPath}/${part}`;

          if (!fileMap.has(currentPath)) {
            const node: FileTreeNode = {
              key: currentPath,
              title: part,
              path: currentPath,
              isLeaf: index === parts.length - 1,
              children: [],
            };

            if (index === 0) {
              tree.push(node);
            } else {
              const parentPath = currentPath.substring(
                0,
                currentPath.lastIndexOf('/')
              );
              const parent = fileMap.get(parentPath);
              if (parent && parent.children) {
                parent.children.push(node);
              }
            }

            fileMap.set(currentPath, node);
          }
        });
      });

      return tree;
    };

    const newFileTree = buildFileTree(projectFiles);
    setFileTree(newFileTree);

    // Set default expanded keys to first level directories
    const firstLevelKeys = newFileTree.map((node) => node.key);
    setExpandedKeys(firstLevelKeys);
  }, [projectFiles]);

  const handleUploadToVercel = async (updatedFiles: ProjectFile[]) => {
    if (!docId || !updatedFiles) {
      return '';
    }

    if (isUploadingToVercel) {
      return '';
    }

    setIsUploadingToVercel(true);
    setStatus('loading');

    try {
      const result = await deployToVercel(docId, updatedFiles);

      console.log('deployToVercel result', result);

      const tempDeploymentId = result.id;

      console.log('tempDeploymentId', tempDeploymentId);
      let retry = 0;
      // Start checking deployment status
      const checkStatus = async () => {
        try {
          const statusResult = await checkDeploymentStatus(
            tempDeploymentId,
            docId
          );
          console.log('statusResult', statusResult);
          if (statusResult.status === 'READY') {
            // Ensure we're using the full URL by checking if it starts with http:// or https://
            const fullUrl = statusResult.url.startsWith('http')
              ? statusResult.url
              : `https://${statusResult.url}`;
            // Add a timestamp to prevent caching and force a fresh load

            // setServerUrl(fullUrl);
            setSourceUrl(fullUrl);
            return fullUrl;
          } else if (statusResult.status === 'ERROR') {
            throw new Error('Deployment failed');
          } else {
            // Continue checking if not ready
            if (retry++ < 5) {
              setTimeout(() => checkStatus(), 5000);
            } else {
              console.error('Status check failed:', error);
              setStatus('error');
              message.error('Build failed, please try again later!');
              return '';
            }
          }
        } catch (error) {
          console.error('Status check failed:', error);
          setStatus('error');
          return '';
        }
      };
      // Start the status check loop
      const fullUrl = await checkStatus();
      return fullUrl;
    } catch (error) {
      console.error('Vercel deployment failed:', error);
      setStatus('error');
      return sourceUrl || '';
    } finally {
      setIsUploadingToVercel(false);
    }
  };

  return (
    <Flex
      vertical
      style={{
        height: '100vh',
        width: '100%',
      }}
    >
      {/* Top button bar */}
      <Flex
        style={{
          padding: '8px',
          borderTop: '1px solid #e8e8e8',
          borderBottom: '1px solid #e8e8e8',
          backgroundColor: '#fff',
        }}
      >
        {isPreviewView() ? (
          <Flex
            align="center"
            justify="space-between"
            style={{ width: '100%' }}
          >
            <Flex align="center" gap={8}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Preview
              </Typography.Title>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Status: {status}
              </Typography.Title>
            </Flex>
            <Flex gap={8} style={{ marginRight: '24px' }}>
              <Tooltip
                title={`${
                  previewMode === 'desktop' ? 'Mobile' : 'Desktop'
                } Preview Mode`}
              >
                <Button
                  type="default"
                  onClick={() =>
                    setPreviewMode(
                      previewMode === 'desktop' ? 'mobile' : 'desktop'
                    )
                  }
                  style={{
                    color: '#5345F3',
                    backgroundColor: '#fff',
                    border: 'none',
                    padding: '0px 5px',
                    fontSize: 18,
                  }}
                >
                  {previewMode === 'desktop' ? (
                    <MobileOutlined />
                  ) : (
                    <DesktopOutlined />
                  )}
                </Button>
              </Tooltip>

              <Tooltip title={isCodeView() ? 'Preview app' : 'View code'}>
                <Button
                  type="default"
                  onClick={() => setViewMode(isCodeView() ? 'preview' : 'code')}
                  style={{
                    color: '#5345F3',
                    backgroundColor: '#fff',
                    border: 'none',
                    padding: '0px 5px',
                    fontSize: 18,
                  }}
                >
                  {isCodeView() ? <EyeOutlined /> : <CodeOutlined />}
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
        ) : (
          <Flex
            align="center"
            justify="space-between"
            style={{ width: '100%' }}
          >
            <Flex align="center" gap={8}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Code
              </Typography.Title>
            </Flex>
            <Flex gap={8} style={{ marginLeft: 'auto', marginRight: '24px' }}>
              <Tooltip title="Save changes">
                <Button
                  type="default"
                  onClick={handleSave}
                  loading={isEditing}
                  disabled={!selectedFile || isEditing}
                  style={{
                    color: '#5345F3',
                    backgroundColor: '#fff',
                    border: 'none',
                    padding: '0px 5px',
                    fontSize: 18,
                  }}
                >
                  <SaveOutlined />
                </Button>
              </Tooltip>

              <Tooltip title="Preview app">
                <Button
                  type="default"
                  onClick={() => setViewMode('preview')}
                  style={{
                    color: '#5345F3',
                    backgroundColor: '#fff',
                    border: 'none',
                    padding: '0px 5px',
                    fontSize: 18,
                  }}
                >
                  <EyeOutlined />
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
        )}
      </Flex>

      {/* Bottom content area */}
      <Flex
        style={{
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {isCodeView() ? (
          <>
            {/* Left file tree */}
            <Flex
              vertical
              style={{
                width: '250px',
                minWidth: '250px',
                borderRight: '1px solid #e8e8e8',
                padding: '16px',
                overflow: 'auto',
                flex: 'none',
                height: '100%',
                paddingTop: '0',
              }}
            >
              <Flex
                vertical
                style={{
                  height: '100%',
                  borderBottom: '1px solid #e8e8e8',
                  paddingBottom: '16px',
                }}
              >
                <Flex
                  justify="space-between"
                  align="center"
                  style={{ marginBottom: '8px' }}
                >
                  <Typography.Title style={{ marginTop: '8px' }} level={5}>
                    Source Files
                  </Typography.Title>
                </Flex>
                <Tree
                  treeData={fileTree}
                  onSelect={handleSourceFileSelect}
                  selectedKeys={selectedFile ? [selectedFile] : []}
                  expandedKeys={expandedKeys}
                  onExpand={(newExpandedKeys) =>
                    setExpandedKeys(newExpandedKeys)
                  }
                  style={{ flex: 1, overflow: 'auto' }}
                />
              </Flex>
            </Flex>

            {/* Right editor */}
            <Flex
              vertical
              style={{
                flex: 1,
                minWidth: 0,
                padding: '16px',
                gap: '8px',
                overflow: 'hidden',
                position: 'relative',
                height: '100%',
                paddingTop: '0',
              }}
            >
              <Flex
                vertical
                style={{
                  height: '100%',
                  minHeight: 0,
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <Flex
                  justify="space-between"
                  align="center"
                  style={{ marginBottom: '8px', marginTop: '0' }}
                >
                  <Typography.Title level={5} style={{ marginTop: '8px' }}>
                    Editor {selectedFile !== '' ? `- ${selectedFile}` : ''}
                  </Typography.Title>
                </Flex>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #e8e8e8',
                    minHeight: 0,
                    height: 'calc(100% - 40px)',
                    overflow: 'auto',
                    position: 'relative',
                  }}
                >
                  <PrototypeCodeEditor
                    value={fileContent}
                    onUpdate={(content) => setFileContent(content || '')}
                    style={{
                      height: '100%',
                      width: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />
                </div>
              </Flex>
            </Flex>
          </>
        ) : (
          // Preview mode
          <Flex
            vertical
            style={{
              width: '100%',
              padding: '16px',
              flex: 1,
              minWidth: 0,
              alignItems: 'center',
              paddingTop: '0',
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                width: previewMode === 'mobile' ? '375px' : '100%',
                transition: 'width 0.3s ease-in-out',
              }}
            >
              {status === 'loading' && !error && sourceUrl === '' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    zIndex: 10,
                    gap: '16px',
                  }}
                >
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                    tip="Building app preview"
                  />
                  <Typography.Text type="secondary">
                    Please wait while we prepare your app for preview
                  </Typography.Text>
                </div>
              )}

              {status === 'error' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    zIndex: 10,
                    gap: '16px',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    Network Issue
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Oops. Something has gone wrong. Please refresh your browser
                    and retry.
                  </Typography.Text>
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: sourceUrl ? 'block' : 'none',
                  backgroundColor: '#fff',
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #e8e8e8',
                    backgroundColor: '#fff',
                  }}
                  src={sourceUrl || ''}
                  sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-popups-to-escape-sandbox allow-presentation"
                  referrerPolicy="no-referrer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

export default PrototypeEditor;
