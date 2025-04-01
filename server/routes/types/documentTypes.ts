import { DOCTYPE, Document } from '@prisma/client';

export type DocumentOutput = Readonly<
  Omit<Document, 'content' | 'type'> & {
    type: Exclude<DOCTYPE, typeof DOCTYPE.DEVELOPMENT_PLAN>;
    contents?: string;
  }
>;

export type LegacyDocumentOutput = Readonly<
  Omit<Document, 'content'> & {
    contentStr: string;
    chatSessionId?: string;
  }
>;

export type RefinementOutput = Readonly<{ contentStr: string }>;

export type RefinementGenerationInput = Readonly<{
  paragraphBefore: string;
  userInput: string;
  paragraphAfter: string;
  selection: string;
}>;

export interface FileContent {
  fileContent: string;
  fileType: string;
  fileId: string;
}

export type DocumentGenerationInput = Readonly<{
  id: string;
  description: string;
  name: string;
  projectId: string;
  meta: any;
  type: DOCTYPE;
  contents: string;
  imageBase64: string;
  templateId: string;
  outputFormat: string;
  uploadedFileContent?: FileContent[];
  chosenDocumentIds?: string;
  contextText?: string;
  additionalContextFromUserFiles?: string;
  chatSessionId?: string;
}>;

export type AppGenerationInput = Readonly<{
  id: string;
  description: string;
  name: string;
  projectId: string;
  meta: any;
  type: DOCTYPE;
  contents: string;
  imageBase64: string;
  templateId: string;
  outputFormat: string;
  uploadedFileContent?: FileContent[];
  chosenDocumentIds?: string;
  contextText?: string;
  additionalContextFromUserFiles?: string;
  chatSessionId?: string;
}>;

export type ChatMessage = Readonly<{
  type: string;
  message: string;
  createdAt: Date;
}>;
