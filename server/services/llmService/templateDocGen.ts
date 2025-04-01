import { RedisCache } from '@langchain/community/caches/ioredis';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { processLLMEndCallback } from './llmUtil';
import { RedisSingleton } from '../redis/redis';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';

import fs from 'fs';
import path from 'path';

// Read the prompt template from the file
const templatePromptPath = path.resolve(
  __dirname,
  'llm_prompts/customTemplatePromptGen.txt'
);
const prdTemplate = fs.readFileSync(templatePromptPath, 'utf-8');

export interface TemplateDocPromptDataInput {
  name: string;
  description: string;
  type: string;
}
export async function genTemplateDocPrompt(
  currentUser: AuthenticatedUserWithProfile,
  docData: TemplateDocPromptDataInput
) {
  const templateDocPrompt = PromptTemplate.fromTemplate(prdTemplate);
  const { description, name, type: docType } = docData;
  const { organizationId: orgId } = currentUser;
  console.log(
    'in services.llm.prdGen.genPRD.start:',
    description,
    ', orgId:',
    orgId,
    ', name:',
    name,
    ', genPrompt:',
    docType
  );

  const modelName =
    process.env.NODE_ENV === 'development' ? 'gpt-4o-mini' : 'gpt-4o';
  const templateDocPromptChain = RunnableSequence.from([
    {
      description: (input: TemplateDocPromptDataInput) => input.description,
      name: (input: TemplateDocPromptDataInput) => input.name,
      docType: (input: TemplateDocPromptDataInput) => input.type,
    },
    templateDocPrompt,
    new ChatOpenAI({
      temperature: 0,
      modelName,
      maxTokens: -1,
      cache: new RedisCache(RedisSingleton.getClient()),
      verbose: true,
      callbacks: [
        {
          handleLLMEnd: async (output) => {
            console.log('in prdGen.callback');
            processLLMEndCallback(output.llmOutput, modelName, {
              currentUser,
              docId: '',
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
    result = await templateDocPromptChain.invoke({
      description,
      name,
      type: docType,
    });
  } catch (err) {
    console.error('services.llm.templateDocGen.genTemplateDocPrompt:', err);
  }
  console.log(
    'in services.llm.templateDocGen.genTemplateDocPrompt.result:',
    result
  );
  return result;
}
