import { Request } from 'express';
import { Router } from 'express';
import { userProfileRequestHandler } from '../../lib/util';
import prisma from '../../db/prisma';
import {
  ChatSessionTargetEntityType,
  DOCTYPE,
  Prisma,
  TemplateAccess,
  TemplateDocument,
  TemplateStatus,
} from '@prisma/client';
import { ProfileResponse } from '../../types/response';
import { PaginationQuery } from '../../types/request';
import { GenerationMinimumCredit } from '../../services/llmService/llmUtil';
import { genTemplateDocPrompt } from '../../services/llmService/templateDocGen';
import { genDefaultDoc } from '../../services/llmService/defaultDocAgent';
import {
  DefaultSampleTaskStoryPoint,
  DefaultStoryPointsPerSprint,
  DefaultWeeksPerSprint,
} from '../../../shared/constants';
import { genDevPlan } from '../../services/llmService/devPlanAgent';
import { DocumentTypeNameMapping } from '../../lib/constant';
import { getOrCreateChatSession } from '../../services/llmService/chatAgent';

const router = Router();
router.use(userProfileRequestHandler);

// create template documents
router.post('/', async function (req, res: ProfileResponse<TemplateDocument>) {
  try {
    const currentUser = res.locals.currentUser;

    let {
      id,
      name,
      description,
      type,
      access,
      promptText,
      sampleOutputText,
      sampleInputText,
    } = req.body;

    console.log(
      'in server.routes.api.templateDocuments.addTemplateDocument.start:',
      currentUser?.userId,
      req.body
    );

    // Generate example doc
    let org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
    });
    if (!org) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Organization not found.' });
      return;
    } else if (org.credits < GenerationMinimumCredit) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Insufficient credits.' });
      return;
    }

    const updateTemplateDocument = await prisma.templateDocument.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        type,
        status: TemplateStatus.PUBLISHED,
        access,
        promptText,
        sampleInputText,
        sampleOutputText,
        creatorUserId: currentUser.userId,
        organizationId: currentUser.organizationId,
      },
    });
    console.log(
      'in server.routes.api.templateDocuments.addTemplateDocument.result:',
      updateTemplateDocument
    );
    res.status(201).json({ success: true, data: updateTemplateDocument });
  } catch (error) {
    console.log(
      'in server.routes.api.templateDocuments.update.failure:',
      error
    );
    res
      .status(500)
      .json({ success: false, errorMsg: (error as Error).message });
    return;
  }
});

// create template documents prompt
router.post(
  '/instructions',
  async function (req, res: ProfileResponse<string>) {
    try {
      const currentUser = res.locals.currentUser;

      let { name, description, type } = req.body;

      console.log(
        'in server.routes.api.templateDocuments.createTemplate.instructions.start:',
        currentUser?.userId,
        req.body
      );

      // Generate example doc
      let org = await prisma.organization.findUnique({
        where: { id: currentUser.organizationId },
      });
      if (!org) {
        res
          .status(500)
          .json({ success: false, errorMsg: 'Organization not found.' });
        return;
      } else if (org.credits < GenerationMinimumCredit) {
        res
          .status(500)
          .json({ success: false, errorMsg: 'Insufficient credits.' });
        return;
      }

      const result = await genTemplateDocPrompt(currentUser, {
        name,
        type,
        description,
      });

      console.log(
        'in server.routes.api.templateDocuments.createTemplate.instructions:',
        result
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.log(
        'in server.routes.api.templateDocuments.createTemplate.instructions..failure:',
        error
      );
      res
        .status(500)
        .json({ success: false, errorMsg: (error as Error).message });
      return;
    }
  }
);

// generate document
router.post(
  '/review-output',
  async function (
    req,
    res: ProfileResponse<{
      sampleOutputText: string;
      chatSessionId: string;
      docId: string;
    }>
  ) {
    const currentUser = res.locals.currentUser;

    let org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
    });
    if (!org) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Organization not found.' });
      return;
    } else if (org.credits < GenerationMinimumCredit) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Insufficient credits.' });
      return;
    }

    const { type: docType, sampleInputText, promptText } = req.body;
    console.log(
      'in server.routes.api.templateDocuments.review-output.start:',
      currentUser?.userId,
      docType,
      sampleInputText,
      promptText
    );

    // create doc and generate entity ID
    let chatSessionId = req.body.chatSessionId;
    let templateDocId;
    if (!chatSessionId) {
      // first create the template document
      let templateDocName = DocumentTypeNameMapping[docType].name + ' Template';
      templateDocId = (
        await prisma.templateDocument.create({
          data: {
            organizationId: currentUser.organizationId,
            name: templateDocName,
            type: docType as DOCTYPE,
            creatorUserId: currentUser.userId,
          },
        })
      ).id;
      // then create the chat session
      chatSessionId = (
        await getOrCreateChatSession({
          name: templateDocName,
          userId: currentUser?.userId,
          chatContent: sampleInputText,
          userEmail: currentUser.email,
          targetEntityId: templateDocId,
          targetEntityType: ChatSessionTargetEntityType.DOCUMENT,
          targetEntitySubType: 'Template Document:' + docType,
        })
      ).id;
    } else {
      templateDocId = (
        await prisma.chatSession.findFirst({
          where: {
            id: chatSessionId,
          },
        })
      )?.targetEntityId;
    }
    // handle all other types of doc generation including: business, marketing, sales, support etc
    // todo - we may add specific handlers for each type in the future
    console.log('in server.routes.api.documents.generate.templateDoc');
    let generatedContent = '';
    if (docType === DOCTYPE.DEVELOPMENT_PLAN) {
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
        sprintStartDate: new Date().toDateString(),
        sampleTaskStoryPoint: DefaultSampleTaskStoryPoint,
        prdContent: sampleInputText,
        techDesignContent: '',
      };
      try {
        generatedContent = (await genDevPlan(
          { type: docType, id: '', description: sampleInputText },
          { ...devPlanContents, chosenDocumentIds: [] },
          currentUser
        )) as string;
      } catch (error) {
        const errorMsg = (error as string | Error).toString();
        console.error(
          'Error generating dev plan in server.routes.api.templateDocuments.review-output',
          errorMsg
        );
      }
    } else {
      generatedContent = await genDefaultDoc(
        {
          chatSessionId,
          description: sampleInputText,
          promptText,
          type: docType,
          templateDocId,
          additionalContextFromUserFiles: '',
        },
        currentUser
      );
    }
    console.log(
      'in server.routes.api.documents.generate.result:',
      generatedContent
    );

    res.status(200).json({
      success: true,
      data: {
        sampleOutputText: generatedContent,
        chatSessionId,
        docId: templateDocId as string,
      },
    });
  }
);

// get template documents with pagination & search
router.get(
  '/',
  async function (req: Request, response: ProfileResponse<TemplateDocument[]>) {
    try {
      const { userId, organizationId } = response.locals.currentUser;

      const query = req.query as unknown as PaginationQuery &
        Record<string, string>;
      const q: string = query.q;
      const type: DOCTYPE = query.type as DOCTYPE;
      let page: number = Number(req.query.page) || 1;
      let limit: number = Number(req.query.limit) || 20;

      if (isNaN(page) || page <= 0) {
        throw new Error('Invalid page number');
      }

      if (isNaN(limit) || limit <= 0) {
        throw new Error('Invalid limit number');
      }
      if (!page || page < 1) {
        page = 1;
      }
      const skip = (page - 1) * limit;

      const conditions: Prisma.TemplateDocumentWhereInput = {
        AND: [
          {
            OR: [
              {
                creatorUserId: userId,
                access: TemplateAccess.SELF,
              },
              {
                organizationId,
                access: TemplateAccess.ORGANIZATION,
              },
              {
                access: TemplateAccess.PUBLIC,
              },
            ],
          },
        ],
        status: TemplateStatus.PUBLISHED,
      };
      if (type) {
        conditions.type = type;
      }
      if (Boolean(q)) {
        (conditions.AND as Prisma.TemplateDocumentWhereInput[]).push({
          OR: [
            {
              name: { contains: q, mode: 'insensitive' },
            },
            {
              description: { contains: q, mode: 'insensitive' },
            },
          ],
        });
      }

      const result = await prisma.templateDocument.findMany({
        where: conditions,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
        include: { organization: { select: { name: true } } },
      });
      const total = await prisma.templateDocument.count({
        where: conditions,
      });
      response.status(200).json({
        success: true,
        data: {
          list: result,
          pagination: {
            page,
            limit,
            total,
          },
        },
      });
    } catch (error) {
      console.error('Error in GET /template-documents', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

router.get(
  '/:id',
  async function (req: Request, response: ProfileResponse<TemplateDocument>) {
    try {
      const { userId, organizationId } = response.locals.currentUser;
      const id: string = req.params.id;

      const result = await prisma.templateDocument.findFirst({
        where: {
          id,
        },
        include: { organization: { select: { name: true } } },
      });

      if (result == null) {
        throw new Error('Could not find this document template: ' + id);
      }

      // Check access
      if (
        (result.access === TemplateAccess.SELF &&
          result.creatorUserId != userId) ||
        (result.access === TemplateAccess.ORGANIZATION &&
          result.organizationId != organizationId)
      ) {
        throw new Error(
          'You have no permission to view this document template: ' + id
        );
      }
      response.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in GET /template-documents', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

module.exports = {
  className: 'template-documents',
  routes: router,
};
