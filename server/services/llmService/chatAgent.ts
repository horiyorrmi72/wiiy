import {
  Access,
  ChatSessionTargetEntityType,
  RecordStatus,
} from '@prisma/client';
import prisma from '../../db/prisma';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  AgentSystemMessages,
  getHistoryChain,
  processLLMEndCallback,
} from './llmUtil';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import { extractJsonObject } from '../../lib/util';
import MixPanel from '../trackingService';
import { FileContent } from '../../routes/types/documentTypes';

export interface GetOrCreateChatSessionInput {
  name: string;
  userId: string;
  userEmail: string;
  chatContent: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntitySubType: string;
}

export interface CreateChatSessionInput {
  name: string;
  access: string;
  userId: string;
  userEmail: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntitySubType: string;
}

export interface GenerateChatResponseInput {
  chatContent: string;
  sessionId: string;
  currentUser: AuthenticatedUserWithProfile;
  docId: string;
  targetEntityType: string; // DOCUMENT, OR PROJECT ETC.
  docType: string;
  uploadedFileContent: FileContent[];
  chosenDocumentIds: string;
}

export async function generateChatResponse({
  chatContent,
  sessionId,
  currentUser,
  docId,
  docType,
  uploadedFileContent,
}: GenerateChatResponseInput) {
  docType = docType || 'CHAT';
  console.log(
    'llmServices.chatAgent.generateChatResponse:',
    docType,
    chatContent,
    sessionId
  );

  // build chat model
  const modelName =
    process.env.NODE_ENV === 'development' ? 'gpt-4o-mini' : 'gpt-4o';
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName,
    temperature: 1,
    verbose: true,
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in chatAgent.generateChatResponse.callback');
          processLLMEndCallback(output.llmOutput, modelName, {
            currentUser,
            docId,
            docType,
          });
        },
      },
    ],
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', AgentSystemMessages[docType as string]],
    new MessagesPlaceholder('history'),
    [
      'human',
      ` 
      Analyze the following user request and determine if the user's intent is to create or update a document in response, or asking for more information. Use the additional context info provided below. Return the output in JSON format by following the instructions below:
      - Set JSON property "intent" to be "DOCUMENT" if the user is requesting to create or update a document, set "message" to be a message that explains the document is being generated, and "success_message" to be a message that informs user the document has been generated.
      - Set JSON property "intent" to be "REPLY" if the user is not requesting to create or update a document, set "message" to be the your complete reply to the user.

      User Request: "{userInput}"
      Additional Context: "{additionalContextFromUserFiles}"
      `,
    ],
  ]);

  let additionalContextFromUserFiles = '';

  if (uploadedFileContent.length > 0) {
    uploadedFileContent.forEach((item) => {
      if (item.fileType !== 'image') {
        additionalContextFromUserFiles += item.fileContent + '\n';
      }
    });
  }

  console.log(
    'in chatAgent.generateChatResponse:',
    additionalContextFromUserFiles
  );
  const chainWithHistory = await getHistoryChain({ prompt, model });
  const result = await chainWithHistory.invoke(
    {
      userInput: chatContent,
      additionalContextFromUserFiles,
    },
    {
      configurable: {
        sessionId,
      },
    }
  );
  console.log(
    'llmServices.chatAgent.generateChatResponse.result:',
    result.content
  );
  return extractJsonObject(result.content);
}

export async function generateFullChatResponse({
  chatContent,
  sessionId,
  currentUser,
  docId,
  docType,
  uploadedFileContent,
  chosenDocumentIds,
}: GenerateChatResponseInput) {
  docType = docType || 'CHAT';
  console.log(
    'llmServices.chatAgent.generateFullChatResponse:',
    docType,
    chatContent,
    sessionId
  );

  // build chat model
  const modelName =
    process.env.NODE_ENV === 'development' ? 'gpt-4o-mini' : 'gpt-4o';
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName,
    temperature: 1,
    verbose: true,
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in chatAgent.generateFullChatResponse.callback');
          processLLMEndCallback(output.llmOutput, modelName, {
            currentUser,
            docId,
            docType,
          });
        },
      },
    ],
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', AgentSystemMessages[docType as string]],
    new MessagesPlaceholder('history'),
    [
      'human',
      ` 
      Analyze the user request below and create a detailed, professional reply. Use the additional context info provided below. Return the output in JSON format by following the instructions below:
      - Set JSON property "intent" to be "REPLY", and set "message" to be the your complete reply to the user.

      User Request: "{userInput}"
      Additional Context: "{additionalContextFromUserFiles}"
      `,
    ],
  ]);

  let additionalContextFromUserFiles = '';

  if (uploadedFileContent.length > 0) {
    uploadedFileContent.forEach((item) => {
      if (item.fileType !== 'image') {
        additionalContextFromUserFiles += item.fileContent + '\n';
      }
    });
  }

  if (chosenDocumentIds.trim() !== '') {
    const ids = chosenDocumentIds.split(',').map((idStr) => idStr.trim());
    const docs = await prisma.document.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        content: true,
        description: true,
      },
    });
    const docDescription =
      docs.length >= 1
        ? docs
            .map((item) => item.content?.toString('utf-8') as string)
            .join(',')
        : '';

    additionalContextFromUserFiles += docDescription + '\n';
    console.log('docDescription: ', docDescription);
  }

  console.log(
    'in chatAgent.generateFullChatResponse:',
    additionalContextFromUserFiles
  );
  const chainWithHistory = await getHistoryChain({ prompt, model });
  const result = await chainWithHistory.invoke(
    {
      userInput: chatContent,
      additionalContextFromUserFiles,
    },
    {
      configurable: {
        sessionId,
      },
    }
  );
  console.log(
    'llmServices.chatAgent.generateFullChatResponse.result:',
    result.content
  );
  return extractJsonObject(result.content);
}

export async function getOrCreateChatSession(
  input: GetOrCreateChatSessionInput
) {
  const {
    name,
    userId,
    userEmail,
    chatContent,
    targetEntityId,
    targetEntityType,
    targetEntitySubType,
  } = input;
  console.log(
    'services.llmService.chatAgent:',
    name,
    userId,
    userEmail,
    chatContent,
    targetEntityId,
    targetEntityType,
    targetEntitySubType
  );
  // Check for an existing active session for the user
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      userId,
      targetEntityId,
      status: RecordStatus.ACTIVE,
    },
    orderBy: { updatedAt: 'desc' }, // Get the latest session
  });

  if (existingSession) {
    console.log(
      'servives.llmService.chat.existingSession.found:',
      existingSession.id
    );
    return existingSession;
  }

  // No active session found, create a new one
  const newSession = await prisma.chatSession.create({
    data: {
      name,
      userId,
      targetEntityId,
      targetEntityType: targetEntityType as ChatSessionTargetEntityType,
    },
  });
  // track unique chat session
  MixPanel.track('ChatSession', {
    distinct_id: newSession.id,
    name,
    userId,
    userEmail,
    chatContent,
    targetEntitySubType,
    targetEntityId,
  });

  console.log('llmService.chat.getOrCreateChatSession:', newSession.id);
  return newSession;
}

export async function createChatSession(input: CreateChatSessionInput) {
  const {
    name,
    access,
    userId,
    userEmail,
    targetEntityId,
    targetEntityType,
    targetEntitySubType,
  } = input;
  console.log(
    'services.llmService.chatAgent:',
    name,
    access,
    userId,
    userEmail,
    targetEntityId,
    targetEntityType,
    targetEntitySubType
  );

  // No active session found, create a new one
  const newSession = await prisma.chatSession.create({
    data: {
      name,
      access: (access || Access.SELF) as Access,
      userId,
      targetEntityId,
      targetEntityType: targetEntityType as ChatSessionTargetEntityType,
    },
  });
  // track unique chat session
  MixPanel.track('ChatSession', {
    distinct_id: newSession.id,
    name,
    userId,
    userEmail,
    targetEntitySubType,
    targetEntityId,
  });

  console.log('servives.llmService.chat.createChatSession:', newSession.id);
  return newSession;
}
