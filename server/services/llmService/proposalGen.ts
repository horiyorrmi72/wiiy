import { RedisCache } from '@langchain/community/caches/ioredis';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';

import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import dayjs from 'dayjs';
import {
  textCollectionName,
  orgIdColName,
  processLLMEndCallback,
} from './llmUtil';
import { RedisSingleton } from '../redis/redis';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import fs from 'fs';
import path from 'path';

type ProposalGenInput = {
  rfp: string;
  authorDate: string;
  startDate: string;
  additionalContextFromUserFiles: string;
};

const proposalTemplatePath = path.resolve(
  __dirname,
  'llm_prompts/proposalGenPrompt.txt'
);
const proposalTemplate = fs.readFileSync(proposalTemplatePath, 'utf-8');
// const proposalPrompt = PromptTemplate.fromTemplate(proposalTemplate);

export async function genProposal(
  docData: any,
  startDate: string,
  currentUser: AuthenticatedUserWithProfile
) {
  const proposalPrompt = PromptTemplate.fromTemplate(proposalTemplate);

  console.log(
    'in services.llm.proposalGen.genProposal.start:',
    '\nstartDate:',
    startDate,
    ',genPrompt=',
    proposalPrompt
  );
  const { organizationId: orgId } = currentUser;
  const {
    description: rfp,
    docId,
    docType,
    additionalContextFromUserFiles,
  } = docData;
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

  // const context = await retriever.invoke(rfp).then(formatDocumentsAsString);
  const chain = RunnableSequence.from([
    {
      rfp: (input: ProposalGenInput) => input.rfp,
      startDate: (input: ProposalGenInput) =>
        dayjs(input.startDate).format('MMMM-DD-YYYY'),
      additionalContextFromUserFiles: (input: ProposalGenInput) =>
        input.additionalContextFromUserFiles,
      authorDate: (input: ProposalGenInput) => input.authorDate,
    },
    proposalPrompt,
    new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-4o-mini',
      maxTokens: -1,
      cache: new RedisCache(RedisSingleton.getClient()),
      verbose: true,
      callbacks: [
        {
          handleLLMEnd: async (output) => {
            console.log('in proposalGen.callback');
            processLLMEndCallback(output.llmOutput, 'gpt-4o-mini', {
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
    result = await chain.invoke({
      rfp: rfp,
      startDate: startDate,
      authorDate: dayjs().format('MMMM-DD-YYYY'),
      additionalContextFromUserFiles,
    });
  } catch (err) {
    console.error('services.llm.proposalGen.genProposal:', err);
  }
  console.log('in services.llm.proposalGen.genProposal.result:', result);
  return result;
}
