import { PromptTemplate } from '@langchain/core/prompts';
import { DevPlanGenInput } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import dayjs from 'dayjs';
import { setEpicsDataKeyMapping, validateEpicData } from '../schedulingService';
import { getTaskTypeFromSpecialtyName } from '../../lib/util';
import _ from 'lodash';
import { processLLMEndCallback } from './llmUtil';
import { DevPlanSchema } from '../../types/schedulingSchema';
import { AuthenticatedUserWithProfile } from '../../types/authTypes';
import fs from 'fs';
import path from 'path';
import { SampleTask } from '../../../shared/constants';

// Read the prompt template from the file
const devPlanTemplatePath = path.resolve(
  __dirname,
  'llm_prompts/devPlanGenPrompt.txt'
);
const devPlanTemplate = fs.readFileSync(devPlanTemplatePath, 'utf-8');

export async function genDevPlan(
  docData: any,
  input: DevPlanGenInput,
  currentUser: AuthenticatedUserWithProfile
) {
  const devPlanPrompt = PromptTemplate.fromTemplate(devPlanTemplate);
  let issueData;
  let result = '';
  const {
    additionalContextFromUserFiles,
    sampleTaskStoryPoint,
    ...schedulingParameters
  } = input;
  const { type: docType, id: docId, description: userFeedback } = docData;
  let taskTypes = schedulingParameters.requiredSpecialties
    .map((specialty) => {
      return getTaskTypeFromSpecialtyName(specialty);
    })
    .join(',');

  taskTypes = _.uniq(taskTypes.split(',')).join(',');

  const modelName = 'gpt-4o';
  const model = new ChatOpenAI({
    modelName,
    temperature: 0,
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in devPlanGen.callback');
          processLLMEndCallback(output.llmOutput, modelName, {
            currentUser,
            docId,
            docType,
          });
        },
      },
    ],
  });

  const structuredLlm = model.withStructuredOutput(
    DevPlanSchema.pick({ epics: true }),
    {
      name: 'development_plan',
    }
  );

  try {
    console.log(
      'in services.llm.genDevPlan.start:',
      additionalContextFromUserFiles,
      ', taskTypes:',
      taskTypes,
      ', SampleTask:',
      SampleTask,
      ', sampleTaskStoryPoint:',
      sampleTaskStoryPoint,
      ', userFeedback:',
      userFeedback
    );
    let genContentObj = await structuredLlm.invoke(
      await devPlanPrompt.format({
        additionalContextFromUserFiles,
        taskTypes,
        sampleTask: SampleTask,
        sampleTaskStoryPoint,
        userFeedback: userFeedback || '',
      })
    );
    issueData = genContentObj;
  } catch (err) {
    console.error('services.llm.genDevPlan.run.error:', err);
  }
  // append sprint planning result
  // issueData = EpicsData;
  if (!issueData || !issueData.epics) {
    console.error('services.llm.genDevPlan.run.error.no.content.generated');
    return;
  }
  setEpicsDataKeyMapping(issueData.epics);
  validateEpicData(issueData.epics);
  result = JSON.stringify({
    epics: issueData.epics,
    sprints: [],
    milestones: [],
  });
  console.log('in services.llm.genDevPlan.result:', result);
  return result;
}

const sourceMap: any = {
  value: 'sprints', // refer to milestones
  sprints: 'userStories',
  userStories: 'issues',
};
function validatePlanData(wrapperObj: any, targetKey: string): any {
  let targets = wrapperObj[targetKey] || [];
  let sourceKey = sourceMap[targetKey];
  if (!sourceKey) {
    // basecase for recursion: no more source key
    return wrapperObj;
  }
  targets.forEach((target: any) => {
    let sources = validatePlanData(target, sourceKey)[sourceKey];
    let { startDate, endDate, storyPoints } = sources.reduce(
      (result: any, source: any) => {
        return {
          startDate:
            new Date(result.startDate) > new Date(source.startDate)
              ? source.startDate
              : result.startDate,
          endDate:
            new Date(result.endDate) > new Date(source.endDate)
              ? result.endDate
              : source.endDate,
          storyPoints: result.storyPoints + source.storyPoint,
        };
      },
      {
        startDate: target.startDate,
        endDate: target.endDate,
        storyPoints: 0,
      }
    );
    target.startDate = dayjs(startDate).format('MM/DD/YYYY');
    target.endDate = dayjs(endDate).format('MM/DD/YYYY');
    target.storyPoint = storyPoints;
  });
  return wrapperObj;
}
