import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { formatDocumentsAsString } from 'langchain/util/document';
import { DocumentGenerationInput } from '../../routes/types/documentTypes';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import {
  AgentSystemMessages,
  LimitedPostgresChatMessageHistory,
  orgIdColName,
  pool,
  processLLMEndCallback,
  textCollectionName,
} from './llmUtil';
import { ACTIVE_CLAUDE_MODEL_ID } from './uiux/ai_utils';
import { improveWebDesign } from './uiux/web_design_improver';
import { generatePages } from './uiux/web_design_main';

import { MessageLimit } from '../../../shared/constants';

export async function genUIDesignAnthropic(
  docData: DocumentGenerationInput,
  currentUser: AuthenticatedUserWithProfile
): Promise<string> {
  console.log('in services.llm.genUIDesignAnthropic.start:', docData);

  const {
    type: docType,
    id: docId,
    description: description,
    contents: designHTML,
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
    .invoke(description)
    .then(formatDocumentsAsString);

  // Get previous messages
  const historyMessages = await messageHistory.getMessages();

  // Format the input variables
  const inputVariables = {
    additionalContextFromUserFiles,
    context,
    previousDocument: designHTML,
    history: historyMessages,
  };

  // Generate the formatted prompt
  const formattedPrompt = await prompt.formatMessages(inputVariables);

  // Now you have the formatted prompt that you can use directly
  // console.log('Formatted prompt:', formattedPrompt);

  let result = '';
  let callBackFunc = async (output: any) => {
    processLLMEndCallback(output, ACTIVE_CLAUDE_MODEL_ID, {
      currentUser,
      docId,
      docType,
    });
  };
  try {
    if (designHTML) {
      console.log('in services.llm.genUIDesignAnthropic: designHTML exists');
      result = await improveWebDesign(
        description,
        designHTML,
        callBackFunc,
        formattedPrompt
      );
    } else {
      console.log(
        'in services.llm.genUIDesignAnthropic: designHTML does not exist'
      );
      result = await generatePages(
        additionalContextFromUserFiles as string,
        true,
        description,
        imageBase64,
        callBackFunc,
        formattedPrompt
      );
    }
  } catch (err) {
    console.error('services.llm.genUIDesignAnthropic.run:', err);
  }
  console.log('in services.llm.genUIDesignAnthropic.result:', result);
  return result;
}
