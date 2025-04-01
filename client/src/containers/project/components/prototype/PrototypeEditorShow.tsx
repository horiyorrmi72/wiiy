import { useEffect, useState } from 'react';
import { Document, Prisma } from '@prisma/client';
import { Flex, Spin } from 'antd';

import { ProjectFile, PrototypeEditor } from './PrototypeEditor';

export interface DocumentBase extends Omit<Document, 'content'> {
  contentStr: string | null;
  content: Buffer | null;
  contents: string | null;
  project: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  meta: Record<string, any> | null;
  imageBase64: string | null;
  templateDocument: any | null;
}

export type DocumentWithoutContent = Readonly<Partial<DocumentBase>>;

interface PrototypeEditorShowProps {
  setSourceUrl: (sourceUrl: string) => void;
  document?: DocumentWithoutContent;
}

function PrototypeEditorShow({
  setSourceUrl,
  document,
}: PrototypeEditorShowProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

          // Only update if files have actually changed
          const currentFilesStr = JSON.stringify(files);
          const newFilesStr = JSON.stringify(projectFiles);

          if (currentFilesStr !== newFilesStr) {
            console.log('Files have changed, updating state with new files:', {
              fileCount: projectFiles.length,
              paths: projectFiles.map((f) => f.path),
            });
            setFiles(projectFiles);
          }
        } catch (err) {
          console.error('Error parsing document contents:', err);
          setFiles([]);
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to parse document contents';
          setError(errorMessage);
        }
      } catch (err) {
        console.log('Processed err:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to process files';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    processDocumentFiles();
  }, [document?.id, document?.contents, files]);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Spin size="large" />
        <div>Loading app preview...</div>
      </div>
    );
  }

  return (
    <div className="web-container-show">
      <Flex vertical style={{ height: '100%' }}>
        <Flex style={{ flex: 1, minHeight: 0 }}>
          {files.length > 0 && (
            <PrototypeEditor
              sourceUrl={document?.meta?.sourceUrl}
              projectFiles={files}
              docId={document?.id as string}
              documentMeta={document?.meta as Prisma.JsonObject}
              onError={handleError}
              setSourceUrl={setSourceUrl}
            />
          )}
          {!files.length && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h3>No Content Available</h3>
              </div>
            </div>
          )}
        </Flex>
      </Flex>
    </div>
  );
}

export default PrototypeEditorShow;
