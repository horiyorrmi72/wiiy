import { RedisCache } from '@langchain/community/caches/ioredis';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';

import {
  textCollectionName,
  orgIdColName,
  processLLMEndCallback,
  pool,
  AgentSystemMessages,
} from './llmUtil';
import { RedisSingleton } from '../redis/redis';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import fs from 'fs';
import path from 'path';
import { formatDocumentsAsString } from 'langchain/util/document';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';

// Read the prompt template from the file
const techDesignTemplatePath = path.resolve(
  __dirname,
  'llm_prompts/techDesignGenPrompt.txt'
);
const techDesignTemplate = fs.readFileSync(techDesignTemplatePath, 'utf-8');

interface TechDesignGenInput {
  userFeedback: string;
  additionalContextFromUserFiles: string;
}

export interface TechDesignGenDocData {
  name: string;
  description: string;
  additionalContextFromUserFiles: string;
  type: string;
  id: string;
  chatSessionId?: string;
}

export async function genTechDesign(
  docData: TechDesignGenDocData,
  currentUser: AuthenticatedUserWithProfile
) {
  const { organizationId: orgId } = currentUser;
  const {
    type: docType,
    id: docId,
    description,
    additionalContextFromUserFiles,
    chatSessionId,
  } = docData;

  console.log(
    'in services.llm.genTechDesign.start:',
    additionalContextFromUserFiles,
    description,
    ', genPrompt:',
    techDesignTemplate
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
    ['human', techDesignTemplate],
  ]);

  const chain = prompt.pipe(model);
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    inputMessagesKey: 'description',
    historyMessagesKey: 'history',
    getMessageHistory: async (sessionId) => {
      const chatHistory = new PostgresChatMessageHistory({
        sessionId,
        pool,
        tableName: 'chatHistories',
        escapeTableName: true,
      });
      // TODO: fix below in a more elegant way since PostgresChatMessageHistory auto add message
      chatHistory.addMessage = async (message) => {
        return;
      };
      return chatHistory;
    },
  });

  let result;
  try {
    result = await chainWithHistory.invoke(
      {
        description,
        additionalContextFromUserFiles,
        context: await retriever
          .invoke(description)
          .then(formatDocumentsAsString),
      },
      {
        configurable: {
          sessionId: chatSessionId,
        },
      }
    );
  } catch (err) {
    console.error('services.llm.techDesignAgent.genTechDesign:', err);
  }

  console.log('in services.llm.techDesignAgent.genTechDesign.result:', result);
  return result?.content as string;
}
