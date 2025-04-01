import { useEffect, useState } from 'react';
import { Button, Input, message, Modal } from 'antd';

import { GithubUserProfile } from '../../../../shared/types/githubTypes';
import { createAndUploadToGithub } from '../../api/githubApi';
import useDocumentMutation from '../../hooks/useDocumentMutation';
import { ProjectFile } from './PrototypeEditor';
import { DocumentWithoutContent } from './PrototypeEditorShow';

interface GitHubShowProps {
  document?: DocumentWithoutContent;
  onClose: () => void;
  setGithubRepoUrl?: (repoUrl: string) => void;
  githubUserProfile?: GithubUserProfile;
}

export default function GitHubShow({
  document,
  onClose,
  setGithubRepoUrl,
  githubUserProfile,
}: GitHubShowProps) {
  const [repoName, setRepoName] = useState(
    document?.name
      ? String(document.name).toLowerCase().replace(/\s+/g, '-')
      : ''
  );
  const [isUploading, setIsUploading] = useState(false);

  const [files, setFiles] = useState<ProjectFile[]>([]);

  const { upsertDocumentMutation } = useDocumentMutation({
    onSuccess: () => {
      console.log('upsertDocumentMutation.success');
    },
    onError: () => {
      console.error('error');
    },
  });

  const handleRepoNameSubmit = async () => {
    if (!repoName.trim()) {
      message.error('Repository name cannot be empty');
      return;
    }

    if (!document?.id || !document?.name) {
      message.error('Document information is missing');
      return;
    }

    setIsUploading(true);

    try {
      message.loading('Creating repository and uploading files...', 0);

      const { repoUrl } = await createAndUploadToGithub(
        files,
        repoName,
        document.description || '',
        githubUserProfile?.accessToken || ''
      );

      await upsertDocumentMutation.mutateAsync({
        id: document?.id,
        meta: {
          ...document?.meta,
          repoUrl: repoUrl || '',
        },
      });

      message.destroy();
      message.success('Successfully uploaded to GitHub!');
      setGithubRepoUrl?.(repoUrl);
      onClose();
      // by default open github url after upload success
      window.open(repoUrl, '_blank');
    } catch (error) {
      message.destroy();
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload to GitHub';

      if (errorMessage.includes('Repository already exists')) {
        message.error(errorMessage);
      } else {
        message.error(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const processDocumentFiles = () => {
      try {
        if (!document?.id) {
          console.log('No document ID, skipping file processing');
          throw new Error('Document is required');
        }

        if (!document.contents) {
          console.log('No contents in document, setting empty files array');
          return;
        }

        console.log('Processing document contents:', {
          type: typeof document.contents,
          value: document.contents,
        });

        try {
          const contentsData = JSON.parse(document.contents);
          console.log('Parsed contents data:', contentsData);

          if (
            !contentsData ||
            !contentsData.files ||
            !Array.isArray(contentsData.files)
          ) {
            console.error(
              'Invalid file data format: expected an object with files array',
              {
                hasContentsData: !!contentsData,
                hasFiles: contentsData?.files,
                isArray: Array.isArray(contentsData?.files),
              }
            );
            setFiles([]);
            return;
          }

          const projectFiles: ProjectFile[] = contentsData.files.map(
            (file: any) => {
              // Ensure content is string, with special handling for package.json
              let fileContent = file.content;
              if (
                file.path === 'package.json' &&
                typeof fileContent === 'object'
              ) {
                fileContent = JSON.stringify(fileContent, null, 2);

                // console.log('package.json fileContent: ', fileContent);
              } else if (typeof fileContent !== 'string') {
                fileContent = String(fileContent);
              }

              return {
                type: 'file' as const,
                content: fileContent,
                path: file.path,
              };
            }
          );

          setFiles(projectFiles);
        } catch (err) {
          console.error('Error parsing document contents:', err);
          setFiles([]);
        }
      } catch (err) {
        console.log('Processed err:', err);
      } finally {
      }
    };

    processDocumentFiles();
  }, [document?.id, document?.contents]);

  return (
    <div>
      <Modal
        title="Create GitHub Repository"
        open={true}
        onOk={handleRepoNameSubmit}
        onCancel={onClose}
        confirmLoading={isUploading}
        okText="Create Repository"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            backgroundColor: '#52c41a',
            border: 'none',
          },
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <p>Enter a name for your GitHub repository:</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Repository name"
              disabled={isUploading}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              onClick={handleRepoNameSubmit}
              loading={isUploading}
              disabled={isUploading || !repoName.trim()}
              style={{ minWidth: '100px' }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
