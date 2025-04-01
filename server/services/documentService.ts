import {
  Access,
  DOCTYPE,
  Document,
  DocumentPermissionStatus,
  DocumentPermissionTypes,
  DocumentStatus,
  Organization,
  Prisma,
  Project,
  TemplateDocument,
  TemplateStatus,
} from '@prisma/client';
import prisma from '../db/prisma';
import dayjs from 'dayjs';
import { DevPlan } from '../types/schedulingTypes';
import { isEmail } from '../lib/util';
import { AuthenticatedUserWithProfile } from '../types/authTypes';
import { genPRD } from './llmService/prdAgent';
import { genTechDesign } from './llmService/techDesignAgent';
import { genQAPlan } from './llmService/qaAgent';
import { genReleasePlan } from './llmService/releasePlanAgent';
import { genProposal } from './llmService/proposalGen';
import { OrganizationID } from '../db/seed/organizationsData';
import {
  DefaultSampleTaskStoryPoint,
  DefaultStoryPointsPerSprint,
  DefaultWeeksPerSprint,
} from '../../shared/constants';
import { genDevPlan } from './llmService/devPlanAgent';
import { genDefaultDoc } from './llmService/defaultDocAgent';
import { DocumentGenerationInput } from '../routes/types/documentTypes';
import { DevPlanMetaSchema } from '../routes/types/devPlanTypes';
import { DevPlanGenInput } from './types';
import { RedisSingleton } from './redis/redis';
import { genUIDesignAnthropic } from './llmService/uiDesignAgentAnthropic';
import { saveDocumentToDatabase } from './databaseService';
import { genAppClaude } from './llmService/appAgentAnthropic';
import { saveAppFileStructure } from './llmService/appGen/appGenUtil';
import { deployCodeToVercel } from './deployService';

export async function getDocumentForProject(
  projectId: string,
  docType: DOCTYPE
): Promise<Document | null> {
  let result = await prisma.document.findFirst({
    where: {
      projectId,
      type: docType,
      status: {
        in: [DocumentStatus.PUBLISHED, DocumentStatus.CREATED],
      },
    },
  });
  return result;
}

export function getDeliveryImpact(
  name: string,
  sprintKey: string,
  oldDevPlan: DevPlan,
  newDevPlan: DevPlan
) {
  // first: find new tasks created
  let target = newDevPlan.epics.reduce(
    (acc: any, m: any) => {
      m.children.forEach((s: any) => {
        if (s.name.trim().toLowerCase() === name.trim().toLowerCase()) {
          acc.epicName = m.name;
          acc.story = s;
        }
      });
      return acc;
    },
    { epicName: '', story: null }
  );
  console.log(
    'in server.services.documentService.getDeliveryImpact:',
    name,
    target
  );
  let newTaskInfo = target.story?.children.reduce(
    (acc: string[], curTask: any, index: number) => {
      let taskInfo = newDevPlan.sprints.reduce(
        (summary: any, curSprint: any) => {
          curSprint.children.forEach((s: any) => {
            s.children.forEach((t: any) => {
              if (t.key === curTask.key) {
                console.log(
                  'in server.services.documentService.getDeliveryImpact.findTask: t:',
                  t.key,
                  curTask.name
                );
                summary = {
                  ownerUserId: t.ownerUserId,
                  sprintName: curSprint.name,
                };
              }
            });
          });
          return summary;
        },
        {}
      );
      acc.push(
        `New Task ${index + 1}: ${curTask.name}, ${
          curTask.storyPoint
        } story point, owner: ${taskInfo.ownerUserId}, sprint: ${
          taskInfo.sprintName
        }`
      );
      return acc;
    },
    [
      `New Story: 1 story "${name}" with ${target.story?.children.length} task(s) and ${target.story.storyPoint} story points were added to epic [${target.epicName}]`,
    ]
  );

  // second: find epics delivery impact
  let [epicsBefore, epicsAfter] = [
    oldDevPlan.milestones,
    newDevPlan.milestones,
  ].map((mls) => {
    return mls.reduce((allEpics: any, m: any) => {
      m.epics.forEach((e: any) => {
        if (!allEpics[e.name]) {
          allEpics[e.name] = {
            milestone: m.name,
            totalStoryPoint: e.totalStoryPoint,
            startDate: e.startDate,
            endDate: e.endDate,
          };
        } else {
          allEpics[e.name] = {
            milestone: m.name,
            totalStoryPoint: e.totalStoryPoint,
            startDate: dayjs(allEpics[e.name].startDate).isBefore(e.startDate)
              ? allEpics[e.name].startDate
              : e.startDate,
            endDate: dayjs(allEpics[e.name].endDate).isBefore(e.endDate)
              ? e.endDate
              : allEpics[e.name].endDate,
          };
        }
      });
      return allEpics;
    }, {});
  });
  let epicsImpact = Object.keys(epicsBefore).reduce((acc: any, cur: any) => {
    let before = epicsBefore[cur];
    let after = epicsAfter[cur];
    acc[cur] = `${cur}:`;
    if (before.totalStoryPoint !== after.totalStoryPoint) {
      acc[
        cur
      ] += ` story points to change from ${before.totalStoryPoint} to ${after.totalStoryPoint},`;
    }
    if (before.endDate !== after.endDate) {
      acc[
        cur
      ] += ` delivery date to move from ${before.endDate} to ${after.endDate}`;
    }
    return acc;
  }, {});
  // third: find milestone delivery impact
  let [resultBefore, resultAfter] = [
    oldDevPlan.milestones,
    newDevPlan.milestones,
  ].map((mls) => {
    return mls.reduce((acc: any, cur: any) => {
      acc[cur.name] = {
        startDate: cur.startDate,
        endDate: cur.endDate,
        storyPoint: cur.storyPoint,
        completeEpics: cur.epics.reduce((doneEpics: any, cur: any) => {
          if (cur.storyPoint + cur.prevStoryPoint === cur.totalStoryPoint) {
            doneEpics += `[${cur.name}(${cur.totalStoryPoint} points)] `;
          }
          return doneEpics;
        }, ''),
      };
      return acc;
    }, {});
  });
  console.log(
    'in server.services.documentService.getDeliveryImpact:',
    resultBefore,
    resultAfter
  );
  let milestoneImpact = Object.keys(resultBefore).reduce(
    (acc: any, cur: any) => {
      let before = resultBefore[cur];
      let after = resultAfter[cur];
      acc[cur] = `${cur}:`;
      if (!after) {
        acc[cur] += ` will be removed.`;
        return acc;
      }
      // impact for story point
      if (before.storyPoint !== after.storyPoint) {
        acc[
          cur
        ] += ` story points to change from ${before.storyPoint} to ${after.storyPoint},`;
      } else {
        acc[cur] += ` story points remains as ${before.storyPoint},`;
      }
      // impact for delivery date
      if (before.endDate !== after.endDate) {
        acc[
          cur
        ] += ` delivery date to move from ${before.endDate} to ${after.endDate},`;
      } else {
        acc[cur] += ` delivery date remains as ${before.endDate},`;
      }
      //impact for epics
      if (before.completeEpics !== after.completeEpics) {
        acc[
          cur
        ] += ` completed epics to change from ${before.completeEpics} to ${after.completeEpics}.`;
      } else {
        acc[cur] += ` completed epics remain as ${before.completeEpics}.`;
      }
      return acc;
    },
    {}
  );

  return {
    newTaskInfo,
    // epicsBefore,
    // epicsAfter,
    epicsImpact,
    // resultBefore,
    // resultAfter,
    milestoneImpact,
  };
}

export interface DocumentCreationData {
  name: string;
  issueId: string;
  projectId: string;
  type: string;
  userId: string;
  access: string;
}

export async function createDocumentForBuildable(
  documentData: DocumentCreationData
) {
  let { name, issueId, projectId, type, userId, access } = documentData;
  try {
    let updateResult = await prisma.document.create({
      data: {
        name,
        type: type as DOCTYPE,
        status: DocumentStatus.CREATED,
        url: '',
        access: access as Access,
        issue: {
          connect: {
            id: issueId,
          },
        },
        creator: {
          connect: {
            id: userId,
          },
        },
        project: {
          connect: {
            id: projectId,
          },
        },
      },
    });
    console.log(
      'server.services.documentService.createDocumentForBuildable.success: ',
      updateResult.id
    );
  } catch (e) {
    console.error(
      'server.services.documentService.createDocumentForBuildable: ',
      e
    );
    throw e;
  }
}

export async function checkDocumentAccess(
  dbDocument: Document & { project: Project | null },
  email: string,
  userId: string | null,
  organizationId: string | null
): Promise<{
  hasAccess: boolean;
  documentPermission: DocumentPermissionTypes;
}> {
  let hasAccess = false;
  let documentPermission: DocumentPermissionTypes =
    DocumentPermissionTypes.VIEW;
  if (userId && userId === dbDocument.creatorUserId) {
    // user is document creator
    hasAccess = true;
    documentPermission = DocumentPermissionTypes.EDIT;
  } else if (isEmail(email)) {
    // check document permission with email, whether the user is logged in or not
    const docPermissionWithEmail = await prisma.documentPermission.findFirst({
      where: {
        documentId: dbDocument.id,
        email,
        status: DocumentPermissionStatus.ACTIVE,
      },
    });
    if (docPermissionWithEmail !== null) {
      documentPermission = docPermissionWithEmail.permission;
      hasAccess = true;
    }
  }

  if (!hasAccess && userId != null && userId != '') {
    // Still no access permission, but the user has logged in, check document access
    switch (dbDocument.access) {
      case Access.SELF: // document only accessed to owner
        hasAccess = userId === dbDocument.creatorUserId;
        break;
      case Access.ORGANIZATION:
        hasAccess = organizationId === dbDocument.project?.organizationId;
        break;
      case Access.TEAM:
        if (dbDocument.project?.teamId) {
          const userTeam = await prisma.userTeam.findFirst({
            where: {
              userId,
              teamId: dbDocument.project.teamId,
            },
          });
          hasAccess = userTeam !== null;
        }
        break;
      default:
        break;
    }
  }

  if (!hasAccess && dbDocument.access === Access.PUBLIC) {
    // public: only has view access
    hasAccess = true;
  }

  return {
    hasAccess,
    documentPermission,
  };
}

export async function getGenTemplateDocumentPrompt(
  templateId: string
): Promise<string> {
  let template = await prisma.templateDocument.findUnique({
    where: {
      id: templateId,
    },
    select: {
      promptText: true,
    },
  });

  if (!template) {
    return '';
  }

  console.log(
    'in documentService.getGenTemplateDocumentPrompt.prompt:',
    template.promptText
  );
  return template.promptText as string;
}

export async function getGenDefaultTemplateDocumentOutputFormat(
  templateId: string
): Promise<string> {
  let template = await prisma.templateDocument.findUnique({
    where: {
      id: templateId,
    },
    select: {
      outputFormat: true,
    },
  });

  if (!template) {
    return '';
  }

  return template.outputFormat as string;
}

export async function getDefaultTemplateDocument(
  docType: string,
  currentUser: AuthenticatedUserWithProfile
): Promise<TemplateDocument | null> {
  // get content from database on the created PRD template document
  // update this query below to find the record with the highest useCount

  let templateDoc = await prisma.templateDocument.findFirst({
    where: {
      type: docType as DOCTYPE,
      status: TemplateStatus.PUBLISHED,
      OR: [
        {
          creatorUserId: currentUser.userId,
        },
        {
          access: Access.ORGANIZATION,
          organizationId: currentUser.organizationId,
        },
        {
          access: Access.PUBLIC,
        },
      ],
    },
    orderBy: {
      useCount: 'desc',
    },
  });
  if (!templateDoc) {
    templateDoc = await prisma.templateDocument.findFirst({
      where: {
        type: docType as DOCTYPE,
        status: TemplateStatus.PUBLISHED,
        access: Access.PUBLIC,
      },
      orderBy: {
        useCount: 'desc',
      },
    });
  }
  if (!templateDoc) {
    console.log(
      `in documentService.getDefaultTemplateDocument: No default template document found for: ${docType}, ${currentUser.email}`
    );
  }

  return templateDoc;
}

export async function genTemplateDocumentDoc(
  currentUser: AuthenticatedUserWithProfile,
  // docData: any,
  type: DOCTYPE,
  promptText: string,
  sampleInputText: string,
  templateName: string
): Promise<string> {
  let generateContent = '';

  const docName = `${templateName}: Sample Doc`;
  const docData = {
    name: docName,
    description: sampleInputText, // user sampleInputText
    promptText,
    id: '', // docId
    type, // docType
    additionalContextFromUserFiles: '',
    contents: '',
  };

  let inputContent = ''; // prd Content or development plan content
  // todo - remove this false check when development plans are enabled again
  if (
    ![
      DOCTYPE.TECH_DESIGN as string,
      DOCTYPE.DEVELOPMENT_PLAN as string,
      DOCTYPE.QA_PLAN as string,
      DOCTYPE.RELEASE_PLAN as string,
    ].includes(type)
  ) {
    // get prd content from database on the created PRD template document
    let templateDoc = await prisma.templateDocument.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        type:
          type === DOCTYPE.RELEASE_PLAN
            ? DOCTYPE.DEVELOPMENT_PLAN
            : DOCTYPE.PRD,
        status: TemplateStatus.PUBLISHED,
      },
      select: {
        sampleOutputText: true,
      },
    });
    if (!templateDoc) {
      // fallback to a public PRD template document from omniflow organization
      templateDoc = await prisma.templateDocument.findFirst({
        where: {
          organizationId: OrganizationID.Willy,
          type:
            type === DOCTYPE.RELEASE_PLAN
              ? DOCTYPE.DEVELOPMENT_PLAN
              : DOCTYPE.PRD,
          status: TemplateStatus.PUBLISHED,
          access: Access.PUBLIC,
        },
        select: {
          sampleOutputText: true,
        },
      });
    }
    if (templateDoc) {
      inputContent = templateDoc.sampleOutputText as string;
      console.log(
        'in documentService.genTemplateDocumentDoc:',
        type,
        templateDoc,
        inputContent
      );
    } else {
      throw new Error('No public PRD template document found.');
    }
  }
  switch (type) {
    case DOCTYPE.PRD:
      generateContent = await genPRD(docData, currentUser);
      break;
    case DOCTYPE.UI_DESIGN:
      generateContent = 'This type is not supported yet.';
      break;
    case DOCTYPE.TECH_DESIGN:
      generateContent = await genTechDesign(docData, currentUser);
      break;
    case DOCTYPE.DEVELOPMENT_PLAN:
      const devPlanContents = {
        weeksPerSprint: DefaultWeeksPerSprint,
        teamMembers: [
          {
            userId: currentUser.userId,
            specialty: 'fullstack engineer',
            storyPointsPerSprint: DefaultStoryPointsPerSprint,
          },
        ],
        requiredSpecialties: ['Fullstack Engineer'],
        chosenDocumentIds: [],
        sprintStartDate: new Date().toDateString(),
        sampleTaskStoryPoint: DefaultSampleTaskStoryPoint,
        prdContent: inputContent,
        techDesignContent: '',
      };
      try {
        generateContent = (await genDevPlan(
          docData,
          devPlanContents,
          currentUser
        )) as string;
      } catch (error) {
        const errorMsg = (error as string | Error).toString();
        console.error(
          'Error generating dev plan in server.routes.api.documents.generate',
          errorMsg
        );
      }
      break;
    case DOCTYPE.QA_PLAN:
      generateContent = await genQAPlan(docData, currentUser);
      break;
    case DOCTYPE.RELEASE_PLAN:
      generateContent = await genReleasePlan(docData, currentUser);
      break;
    case DOCTYPE.BUSINESS:
    case DOCTYPE.PRODUCT:
    case DOCTYPE.ENGINEERING:
    case DOCTYPE.MARKETING:
    case DOCTYPE.SALES:
    case DOCTYPE.SUPPORT:
      generateContent = await genDefaultDoc(docData, currentUser);
      break;
    case DOCTYPE.PROPOSAL:
    case DOCTYPE.OTHER:
      break;
  }

  if (!Boolean(generateContent.trim())) {
    throw new Error('generated template example document content is empty!');
  }
  return generateContent.trim();
}

export async function genDocumentAfterChat(
  org: Organization,
  currentUser: AuthenticatedUserWithProfile,
  docData: DocumentGenerationInput
) {
  const orgMeta = (org.meta as Prisma.JsonObject) ?? {};
  const {
    projectId,
    id: docId,
    type: docType,
    description,
    name,
    chatSessionId,
    contents,
  } = docData;
  console.log(
    'documentServices.genDocumentAfterChat.start:',
    currentUser?.userId,
    docData
  );
  let meta = docData.meta as Prisma.JsonObject;
  let generateContent = '';
  let fileUrl = '';
  let migrations = {};
  let sourceUrl = '';

  // Next: update document content to empty for client fetching
  let docInDB = docId
    ? await prisma.document.update({
        where: {
          id: docId,
        },
        data: {
          content: null,
        },
      })
    : null;

  //define generatedDescription for tagged documents and uploaded files
  let additionalContextFromUserFiles = '';
  let generatedImageBase64 = '';
  const chosenDocumentIds = docData.chosenDocumentIds ?? '';
  const uploadedFileContent = docData.uploadedFileContent ?? [];
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
  if (uploadedFileContent.length > 0) {
    uploadedFileContent.forEach((item) => {
      if (item.fileType !== 'image') {
        additionalContextFromUserFiles += item.fileContent + '\n';
      } else {
        // todo - figure out a way to add multiple images contents. we cant just add '\n' because it may mutitate the string content
        generatedImageBase64 += item.fileContent;
      }
    });
  }

  let promptText = ''; // for generation using template
  let templateId = docData.templateId;
  if (templateId) {
    // update template use count
    await prisma.templateDocument.update({
      where: {
        id: templateId,
      },
      data: {
        useCount: { increment: 1 },
      },
    });
    // handle all other types of doc generation using a template. The promptText is already written and we will use it
    console.log(
      'documentServices.genDocumentAfterChat.actualDocBasedOnTemplatePrompt:'
    );
    promptText = await getGenTemplateDocumentPrompt(templateId);
    generateContent = await genDefaultDoc(
      {
        ...docData,
        additionalContextFromUserFiles,
        promptText,
        docId: docData.id,
        chatSessionId,
      },
      currentUser
    );
  } else if (docType === DOCTYPE.PRD) {
    //if you want to request chatgpt, remove the comments below
    generateContent = await genPRD(
      {
        ...docData,
        additionalContextFromUserFiles,
        chatSessionId,
      },
      currentUser
    );
  } else if (docType === DOCTYPE.TECH_DESIGN) {
    generateContent = await genTechDesign(
      { ...docData, additionalContextFromUserFiles, chatSessionId },
      currentUser
    );
  } else if (docType === DOCTYPE.DEVELOPMENT_PLAN) {
    const sampleTaskStoryPoint =
      (orgMeta?.sampleTaskStoryPoint as number) || DefaultSampleTaskStoryPoint;
    const schedulingParameters = DevPlanMetaSchema.parse(docData.meta);
    const contents: DevPlanGenInput = {
      additionalContextFromUserFiles,
      ...schedulingParameters,
      sampleTaskStoryPoint,
    } as DevPlanGenInput;

    try {
      generateContent = (await genDevPlan(
        docData,
        contents,
        currentUser
      )) as string;
    } catch (error) {
      const errorMsg = (error as string | Error).toString();
      console.error(
        'Error generating dev plan in documentServices.genDocumentAfterChat.generate',
        errorMsg
      );
      // save error code into redis in case server request times out
      RedisSingleton.setData({
        key: `devplan:${docData.id}`,
        val: errorMsg,
        expireInSec: 30,
      });
      return;
    }
  } else if (docType === DOCTYPE.QA_PLAN) {
    console.log(
      'documentServices.genDocumentAfterChat.generate.QA_PLAN:',
      additionalContextFromUserFiles
    );
    generateContent = await genQAPlan(
      { ...docData, additionalContextFromUserFiles, chatSessionId },
      currentUser
    );
  } else if (docType === DOCTYPE.RELEASE_PLAN) {
    console.log(
      'documentServices.genDocumentAfterChat.generate.RELEASE_PLAN:',
      additionalContextFromUserFiles
    );

    generateContent = await genReleasePlan(
      { ...docData, additionalContextFromUserFiles, chatSessionId },
      currentUser
    );
  } else if (docType === DOCTYPE.PROPOSAL) {
    generateContent = await genProposal(
      { ...docData, additionalContextFromUserFiles },
      docData.meta?.startDate as string,
      currentUser
    );
  } else if (docType === DOCTYPE.UI_DESIGN) {
    console.log(
      'documentServices.genDocumentAfterChat.generate.uiDesign:',
      additionalContextFromUserFiles
    );
    generateContent = await genUIDesignAnthropic(
      {
        ...docData,
        imageBase64: generatedImageBase64,
        additionalContextFromUserFiles,
        chatSessionId,
      },
      currentUser
      // genTemplate
    );
  } else if (docType === DOCTYPE.PROTOTYPE) {
    console.log(
      'documentServices.genDocumentAfterChat.generate.prototype:',
      additionalContextFromUserFiles
    );
    generateContent = await genAppClaude(
      {
        ...docData,
        imageBase64: generatedImageBase64,
        additionalContextFromUserFiles,
        chatSessionId,
      },
      currentUser
      // genTemplate
    );
    // fileUrl = await saveAppFileStructure(docId, generateContent);
    // migrations = await saveDocumentToDatabase(docId, generateContent, meta);
    // sourceUrl = await deployCodeToVercel(docId, generateContent);
    [fileUrl, migrations, sourceUrl] = await Promise.all([
      saveAppFileStructure(docId, generateContent),
      saveDocumentToDatabase(docId, generateContent, meta),
      deployCodeToVercel(docId, generateContent),
    ]);
  } else {
    // default generation for documents without templateID or not one of those existing types
    generateContent = await genDefaultDoc(
      {
        ...docData,
        additionalContextFromUserFiles,
        promptText,
        docId: docData.id,
        chatSessionId,
      },
      currentUser
    );
  }
  let updateResult;
  let metaHistory;
  try {
    metaHistory = JSON.parse(
      (docInDB?.meta as Prisma.JsonObject)?.history as string
    );
    if (metaHistory instanceof Array && metaHistory.length > 0) {
      metaHistory.unshift({
        // set content to be empty for PROTOTYPE due to large file size
        content: docInDB?.type === DOCTYPE.PROTOTYPE ? '' : generateContent,
        fileUrl,
        description,
        additionalContextFromUserFiles: Buffer.from(
          additionalContextFromUserFiles,
          'utf-8'
        ),
        date: new Date(),
        userId: currentUser.userId,
        email: currentUser.email,
        imageBase64: docData.imageBase64,
        chosenDocumentIds,
      });
    }
  } catch (e) {
    console.log('documentServices.genDocumentAfterChat:metaHistory created:');
    metaHistory = [
      {
        // set content to be empty for PROTOTYPE due to large file size
        content: docInDB?.type === DOCTYPE.PROTOTYPE ? '' : generateContent,
        fileUrl,
        description,
        additionalContextFromUserFiles: Buffer.from(
          additionalContextFromUserFiles,
          'utf-8'
        ),
        date: new Date(),
        userId: currentUser.userId,
        email: currentUser.email,
        templateDocumentId: docData.templateId || null,
        chosenDocumentIds,
      },
    ];
  }
  try {
    updateResult = await prisma.document.update({
      where: {
        id: docData.id,
      },
      data: {
        name,
        type: docType,
        description,
        projectId,
        organizationId: currentUser.organizationId,
        meta: {
          ...meta,
          history: JSON.stringify(metaHistory),
          migrations,
          sourceUrl,
        },
        content: Buffer.from(generateContent, 'utf-8'),
        templateDocumentId: docData.templateId || null,
      },
    });
  } catch (e) {
    console.error('documentServices.genDocumentAfterChat.update.failure:', e);
  }

  return generateContent;
}
