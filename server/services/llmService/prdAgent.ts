import { RedisCache } from '@langchain/community/caches/ioredis';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  textCollectionName,
  orgIdColName,
  processLLMEndCallback,
  pool,
  AgentSystemMessages,
  LimitedPostgresChatMessageHistory,
} from './llmUtil';
import { RedisSingleton } from '../redis/redis';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';

import fs from 'fs';
import path from 'path';
import { formatDocumentsAsString } from 'langchain/util/document';

import { MessageLimit } from '../../../shared/constants';

// Read the prompt template from the file
const prdTemplatePath = path.resolve(__dirname, 'llm_prompts/prdGenPrompt.txt');
const prdTemplate = fs.readFileSync(prdTemplatePath, 'utf-8');

export interface PRDGenInput {
  description: string;
  context: string;
  additionalContextFromUserFiles: string;
}

export interface PRDGenDocData {
  name: string;
  description: string;
  additionalContextFromUserFiles: string;
  type: string;
  id: string;
  chatSessionId?: string;
  contents: string;
}

export async function genPRD(
  docData: PRDGenDocData,
  currentUser: AuthenticatedUserWithProfile
) {
  const {
    description,
    id: docId,
    type: docType,
    additionalContextFromUserFiles,
    chatSessionId,
    contents,
  } = docData;
  const { organizationId: orgId } = currentUser;
  console.log(
    'in services.llm.prdGen.genPRD.start:',
    description,
    ', orgId:',
    orgId,
    ', genPrompt:',
    prdTemplate
  );
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

  // build chat model
  const modelName =
    process.env.NODE_ENV === 'development' ? 'gpt-4o-mini' : 'gpt-4o';
  const model = new ChatOpenAI({
    temperature: 0,
    modelName,
    maxTokens: -1,
    cache: new RedisCache(RedisSingleton.getClient()),
    verbose: true,
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in genPRD.callback');
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
    ['human', prdTemplate],
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
    .invoke(description)
    .then(formatDocumentsAsString);

  // Get previous messages
  const historyMessages = await messageHistory.getMessages();

  // Format the input variables
  const inputVariables = {
    description,
    additionalContextFromUserFiles,
    context,
    previousDocument: contents,
    history: historyMessages,
  };

  // Generate the formatted prompt
  const formattedPrompt = await prompt.formatMessages(inputVariables);

  // Now you have the formatted prompt that you can use directly
  // console.log('Formatted prompt:', formattedPrompt);

  // You can still call the model if needed
  let result;
  try {
    result = await model.invoke(formattedPrompt);
  } catch (err) {
    console.error('services.llm.prdGen.genPRD:', err);
  }

  console.log('in services.llm.prdGen.genGRD.result:', result);
  return result?.content as string;
}
