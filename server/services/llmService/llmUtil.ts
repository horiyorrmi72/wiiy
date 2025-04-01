import pg from 'pg';

import { updateOrgCreditsAfterContentGen } from '../creditService';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  Runnable,
  RunnableWithMessageHistory,
} from '@langchain/core/runnables';
import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { ACTIVE_CLAUDE_MODEL_ID } from './uiux/ai_utils';
import { BaseMessage, MessageContent } from '@langchain/core/messages';

export const textCollectionName = 'text-collection';
export const orgIdColName = 'organization_id';

export const OmniflowCreditToTokenConversion = 10;

export const GenerationMinimumCredit = 500;

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getHistoryChain({
  prompt,
  model,
}: {
  prompt: ChatPromptTemplate;
  model: Runnable;
}) {
  const chain = prompt.pipe(model);
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    inputMessagesKey: 'userInput',
    historyMessagesKey: 'history',
    getMessageHistory: async (sessionId) => {
      const chatHistory = new PostgresChatMessageHistory({
        sessionId,
        pool,
        tableName: 'chatHistories',
        escapeTableName: true,
      });
      return chatHistory;
    },
  });
  return chainWithHistory;
}
export async function processLLMEndCallback(
  output: any,
  modelName: string,
  input: any
) {
  console.log(`in ${modelName} callback:`, output);
  const { currentUser, docId, templateDocId, docType } = input;
  let tokenUsageJson;
  if (modelName === 'gpt-4o-mini') {
    // Regex to match the tokenUsage JSON object
    const regex = /"tokenUsage":\s*({[^}]*})/;
    // Extract the tokenUsage JSON
    const match = JSON.stringify(output).match(regex);
    if (match) {
      tokenUsageJson = JSON.parse(match[1]);
      console.log('in llmUtil.processLLMEndCallback:', tokenUsageJson);
    }
  } else if (modelName === 'gpt-4o') {
    tokenUsageJson = output?.tokenUsage;
  } else if (modelName === ACTIVE_CLAUDE_MODEL_ID) {
    try {
      const { output_tokens, input_tokens } = output?.usage;
      tokenUsageJson = {
        completionTokens: output_tokens,
        promptTokens: input_tokens,
        totalTokens: output_tokens + input_tokens,
      };
    } catch (error) {
      console.log(
        'in llmUtil.processLLMEndCallback.error, output.usage not found:',
        error
      );
    }
  }

  if (!tokenUsageJson) {
    console.log(
      'in llmUtil.processLLMEndCallback.error: No tokenUsage JSON found.'
    );
    return;
  }

  // update org token next
  await updateOrgCreditsAfterContentGen(
    currentUser,
    docType,
    tokenUsageJson,
    docId,
    templateDocId
  );
}

// Define OpenAI-style message type
export type OpenAIMessage = {
  type: 'system' | 'user' | 'assistant';
  content: MessageContent;
};

// Function to convert BaseMessage[] to OpenAI-style chat format
export function convertToOpenAIFormat(
  messages: BaseMessage[]
): OpenAIMessage[] {
  return messages.map((msg) => {
    let type: OpenAIMessage['type'];

    switch (msg._getType()) {
      case 'system':
        type = 'system';
        break;
      case 'human':
        type = 'user';
        break;
      case 'ai':
        type = 'assistant';
        break;
      default:
        type = 'user'; // Fallback to user role
    }

    return {
      type,
      content: msg.content,
    };
  });
}

export class LimitedPostgresChatMessageHistory extends PostgresChatMessageHistory {
  private limit: number;

  constructor({
    sessionId,
    pool,
    tableName,
    escapeTableName,
    limit,
  }: {
    sessionId: string;
    pool: any;
    tableName: string;
    escapeTableName: boolean;
    limit: number;
  }) {
    super({ sessionId, pool, tableName, escapeTableName });
    this.limit = limit;
  }

  async getMessages(): Promise<BaseMessage[]> {
    const allMessages = await super.getMessages();
    // console.log(
    //   `[Limited] Total messages: ${allMessages.length}, Returning last ${this.limit}:`,
    //   allMessages.slice(-this.limit)
    // );
    return allMessages.slice(-this.limit);
  }
}

export const AgentSystemMessages: Record<string, string> = {
  PRD: `Your name is Joy and you are an expert product manager and coach. You write high quality product requirement documents(PRDs). You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.`,
  UI_DESIGN:
    'You are a great UI and UX Designer. You create high quality UI design based on product description. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  PROTOTYPE:
    'You are an amazing product owner that understands how to build a product. You define key features based on user description, craft the design and build out the codebase. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  TECH_DESIGN:
    'You are a strong technical lead. You are great at creating software technical design documents based on a given product requirement document. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  DEVELOPMENT_PLAN:
    'You are an expert scrum master. You are great at breaking down product requirements into development issues for your team.',
  QA_PLAN:
    'You are an expert QA lead. You create a well articulated QA test plan based on product requirements. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  RELEASE_PLAN:
    'You are an expert Release Engineer. You instruct teams to create release plan for a given product. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  SUPPORT:
    'You are a great customer support advocate. You create detailed, professional support documents. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  MARKETING:
    'You are a great marketing person. You write well-crafted marketing documents to help with customer needs. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  SALES:
    'You are a professional sales person. You write well-defined sales related documents to help with customer needs. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  BUSINESS:
    'You are a professional business person. You write professional, business related documents. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  PRODUCT:
    'Your name is Joy and you are an expert product manager. You write high quality product requirement documents(PRDs). You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  ENGINEERING: 'You are a strong engineer.',
  PROPOSAL:
    'You write high quality project proposal for your team or customers.',
  OTHER:
    'You are an expert content writer. You write high quality content based on user needs. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.',
  CHAT: `Your name is Joy and you are an expert coach for product development. You offer great insights on product, technology and process related questions. You interact with users as needed, ask proper questions before giving professional, engaging, and thoughtful replies.`,
};
