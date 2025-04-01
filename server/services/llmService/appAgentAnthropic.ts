import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { formatDocumentsAsString } from 'langchain/util/document';
import { MessageLimit } from '../../../shared/constants';
import { extractJsonObject } from '../../lib/util';
import { AppGenerationInput } from '../../routes/types/documentTypes';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import {
  convertJsonToCode,
  defaultProjectCodeTemplate,
  mergeCode,
} from './appGen/appGenUtil';
import {
  AgentSystemMessages,
  LimitedPostgresChatMessageHistory,
  orgIdColName,
  pool,
  processLLMEndCallback,
  textCollectionName,
} from './llmUtil';
import {
  ACTIVE_CLAUDE_MODEL_ID,
  getClaude35SonnetResponseWithImageInput,
  getClaudeSonnetResponse,
  renderTemplate,
} from './uiux/ai_utils';

import * as path from 'path';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';

export async function genAppClaude(
  docData: AppGenerationInput,
  currentUser: AuthenticatedUserWithProfile
): Promise<string> {
  console.log('in services.llm.genAppClaude.start:', docData);

  const {
    type: docType,
    id: docId,
    description: userFeedback,
    contents: appCode,
    imageBase64,
    additionalContextFromUserFiles,
    chatSessionId,
  } = docData;

  const { organizationId: orgId } = currentUser;
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    new OpenAIEmbeddings(),
    {
      url: process.env.QDRANT_DATABASE_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: textCollectionName,
    }
  );
  const retriever = vectorStore.asRetriever({
    filter: {
      must: [
        {
          key: orgIdColName,
          match: { value: orgId },
        },
      ],
    },
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', AgentSystemMessages[docType as string]],
    new MessagesPlaceholder('history'),
  ]);

  // Get message history
  const messageHistory = new LimitedPostgresChatMessageHistory({
    sessionId: chatSessionId || '',
    pool,
    tableName: 'chatHistories',
    escapeTableName: true,
    limit: MessageLimit, // Adjust as needed
  });

  // Retrieve context from vector store
  const context = await retriever
    .invoke(userFeedback)
    .then(formatDocumentsAsString);

  // Get previous messages
  const historyMessages = await messageHistory.getMessages();

  // Format the input variables
  const inputVariables = {
    additionalContextFromUserFiles,
    context,
    previousDocument: appCode,
    history: historyMessages,
  };

  // Generate the formatted prompt
  const formattedPrompt = await prompt.formatMessages(inputVariables);

  // Now you have the formatted prompt that you can use directly
  // console.log('Formatted prompt:', formattedPrompt);

  let result = '';
  let callBackFunc = async (output: any) => {
    processLLMEndCallback(output, ACTIVE_CLAUDE_MODEL_ID, {
      // Use the new model ID
      currentUser,
      docId,
      docType,
    });
  };

  try {
    // set default appCode
    const existingCode = appCode || JSON.stringify(defaultProjectCodeTemplate);
    if (existingCode) {
      console.log('in services.llm.genAppClaude: code exists');
      const appCodeInString = convertJsonToCode(existingCode);
      result = await improveAppCode(
        docId,
        appCodeInString,
        userFeedback,
        additionalContextFromUserFiles as string,
        imageBase64,
        callBackFunc,
        formattedPrompt
      );
      // merge newly generated code with existing code
      result = mergeCode(existingCode, result);
    } else {
      console.log('in services.llm.genAppClaude: appCode does not exist');
      result = await generateAppCode(
        docId,
        userFeedback,
        additionalContextFromUserFiles as string,
        imageBase64,
        callBackFunc,
        formattedPrompt
      );
    }
  } catch (err) {
    console.error('services.llm.genAppClaude.run:', err);
  }

  console.log('in services.llm.genAppClaude.result:', result);
  return result;
}

async function generateAppCode(
  docId: string,
  appInfo: string | null = null,
  additionalContextFromUserFiles: string,
  refImageBase64: string | null = null,
  callbackFunc: (output: any) => void,
  chatHistory: BaseMessage[] = []
): Promise<string> {
  const templatePath = path.join(
    __dirname,
    'appGen',
    'prompts',
    'main_app_prompt.txt'
  );

  const prompt = await renderTemplate(templatePath, {
    docId,
    app_info: appInfo,
    additionalContextFromUserFiles,
    refImageBase64,
    defaultCodeBase: JSON.stringify(defaultProjectCodeTemplate),
  });

  const promptWithChatHistory = [...chatHistory, new HumanMessage(prompt)];

  try {
    let result = '';
    if (!refImageBase64) {
      result = await getClaudeSonnetResponse(
        promptWithChatHistory,
        callbackFunc
      );
    } else {
      result = await getClaude35SonnetResponseWithImageInput(
        prompt,
        refImageBase64,
        callbackFunc
      );
    }
    // save file into local directory & s3
    let jsonObj = extractJsonObject(result);
    // saveAppFileStructure(docId, JSON.stringify(jsonObj, null, 2));
    return JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    console.error('Error generating app:', error);
    throw error;
  }
}

async function improveAppCode(
  docId: string,
  appCode: string,
  userRequest: string,
  additionalContextFromUserFiles: string,
  refImageBase64: string,
  callBackFunc: (output: any) => void,
  chatHistory: BaseMessage[] = []
): Promise<string> {
  // limit userRequest to 10000 characters
  userRequest = userRequest.substring(0, 10000);

  const prompt = await renderTemplate(
    path.join(__dirname, 'appGen', 'prompts', 'app_improvement_prompt.txt'),
    {
      docId,
      user_request: userRequest,
      app_code: appCode,
      additionalContextFromUserFiles,
      refImageBase64,
    }
  );

  const promptWithChatHistory = [...chatHistory, new HumanMessage(prompt)];

  try {
    let result = '';
    if (!refImageBase64) {
      result = await getClaudeSonnetResponse(
        promptWithChatHistory,
        callBackFunc
      );
    } else {
      result = await getClaude35SonnetResponseWithImageInput(
        prompt,
        refImageBase64,
        callBackFunc
      );
    }
    // save file into local directory & s3
    let jsonObj = extractJsonObject(result);
    // saveAppFileStructure(docId, JSON.stringify(jsonObj, null, 2));
    return JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    console.error('Error generating app:', error);
    throw error;
  }
}
