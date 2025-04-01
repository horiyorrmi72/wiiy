import { RedisCache } from '@langchain/community/caches/ioredis';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';

import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

import {
  textCollectionName,
  orgIdColName,
  processLLMEndCallback,
} from './llmUtil';
import { RedisSingleton } from '../redis/redis';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import { DocumentGenerationInput } from '../../routes/types/documentTypes';
import { formatDocumentsAsString } from 'langchain/util/document';

const uiDesignTemplate = `You are a professional UI designer. Create a UI design wireframe based on the following:
- The product is defined in the Product Requirement Document and additional context provided below.
- The user feedback on previously generated result is provided below.
- The UI design is the UI wireframe for the product.
- The UI design should include UI elements such as links, buttons, text fields, images, tables etc.
- Use modern styling and design principles.
- Break the UI design into different sections as appropriate. Each design section should be separated by a container with box-shadow, padding, and rounded corners.
- The output should only contain the complete html code for the web page.
- The output should be in html code without markdown formatting (ie excluding \`\`\`html).

Product Requirement Document: {prd}
Context: {context}
User Feedback: {userFeedback}
`;

const uiDesignPrompt = PromptTemplate.fromTemplate(uiDesignTemplate);

interface UIDesignGenInput {
  prd: string;
  userFeedback: string;
  context: string;
}

export async function genUIDesign(
  docData: DocumentGenerationInput,
  prd: string,
  currentUser: AuthenticatedUserWithProfile
) {
  console.log('in services.llm.genUIDesign.start:', prd);

  const { organizationId: orgId } = currentUser;
  const { type: docType, id: docId, description: userFeedback } = docData;
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

  const context = await retriever.invoke(prd).then(formatDocumentsAsString);

  const uiDesignChain = RunnableSequence.from([
    {
      context: (input: UIDesignGenInput) => input.context,
      prd: (input: UIDesignGenInput) => input.prd,
      userFeedback: (input: UIDesignGenInput) => input.userFeedback,
    },
    uiDesignPrompt,
    new ChatOpenAI({
      temperature: 0,
      modelName:
        process.env.NODE_ENV === 'development'
          ? 'gpt-4o-mini'
          : 'gpt-4o-2024-08-06',
      maxTokens: -1,
      cache: new RedisCache(RedisSingleton.getClient()),
      verbose: true,
      callbacks: [
        {
          handleLLMEnd: async (output) => {
            console.log('in uiDesignGen.callback:', output);
            processLLMEndCallback(output.llmOutput, 'gpt-4o-2024-08-06', {
              currentUser,
              docId,
              docType,
            });
          },
        },
      ],
    }),
    new StringOutputParser(),
  ]);

  let result = '';
  try {
    result = await uiDesignChain.invoke({
      prd,
      userFeedback,
      context,
    });
  } catch (err) {
    console.error('services.llm.genUIDesign.run:', err);
  }
  console.log('in services.llm.genUIDesign.result:', result);
  return result;
}
