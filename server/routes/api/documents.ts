import { DocumentOutput } from './../../../client/src/containers/documents/types/documentTypes';
import { ProfileResponse } from './../../types/response';
import {
  DOCTYPE,
  Document,
  DocumentStatus,
  IssueStatus,
  DocumentPermission,
  Access,
  DocumentPermissionTypes,
  DocumentPermissionStatus,
  ProjectStatus,
  Prisma,
  ChatSessionTargetEntityType,
} from '@prisma/client';
import { Router } from 'express';
import prisma from '../../db/prisma';
import {
  LegacyDocumentOutput,
  RefinementGenerationInput,
  RefinementOutput,
} from '../types/documentTypes';
import { isEmail, userProfileRequestHandler } from '../../lib/util';
import { SERVER_BASE_URL } from './../../../shared/constants';
import { GenerationMinimumCredit } from '../../services/llmService/llmUtil';
import { genRefinement } from '../../services/llmService/refinementGen';
import { sendTemplateEmail } from '../../services/sesMailService';
import {
  DocumentRequestAccessTemplateData,
  DocumentShareTemplateData,
} from '../types/emailTemplateDataTypes';
import {
  checkDocumentAccess,
  genDocumentAfterChat,
  getDefaultTemplateDocument,
} from '../../services/documentService';

const documentShareTemplateName = process.env.AWS_DOC_SHARE_TEMPLATE_NAME;

const router = Router();
router.use(userProfileRequestHandler);

// upsert document
// TODO: Do we need to handle Dev Plans specially here? Consider for creating documents in the planner
router.post(
  '/upsert',
  async function (req, res: ProfileResponse<LegacyDocumentOutput>) {
    const currentUser = res.locals.currentUser;

    let documentData = req.body;

    console.log(
      'in server.routes.api.documents.upsert.start:',
      currentUser?.userId,
      documentData
    );
    // TODO - set default value to DOCTYPE.OTHER
    let updateResult: Document | undefined;
    let { id, issueId, projectId, type, contentStr, chatSessionId } =
      documentData;
    delete documentData.issueId;
    delete documentData.projectId;
    delete documentData.contentStr;
    delete documentData.chatSessionId;

    // console.log('documentData:', documentData);
    try {
      if (documentData.id) {
        updateResult = await prisma.document.update({
          where: {
            id,
          },
          data: {
            ...documentData,
            organizationId: currentUser.organizationId,
            ...(contentStr
              ? { content: Buffer.from(contentStr, 'utf-8') }
              : {}),
          },
        });
      } else {
        updateResult = await prisma.document.upsert({
          where: {
            id: '',
          },
          update: {
            ...documentData,
          },
          create: {
            ...documentData,
            type,
            status: DocumentStatus.CREATED,
            url: '',
            issue: issueId
              ? {
                  connect: {
                    id: issueId,
                  },
                }
              : undefined,
            creator: {
              connect: {
                id: currentUser?.userId,
              },
            },
            organization: {
              connect: {
                id: currentUser.organizationId,
              },
            },
            project: projectId
              ? {
                  connect: {
                    id: projectId,
                  },
                }
              : undefined,
          },
        });

        console.log('updateResult:', updateResult);
        if (updateResult && chatSessionId) {
          // now update chat session to point to this doc
          await prisma.chatSession.update({
            where: { id: chatSessionId },
            data: {
              targetEntityType: ChatSessionTargetEntityType.DOCUMENT,
              targetEntityId: updateResult.id,
            },
          });
        }
      }
    } catch (e) {
      console.error('in server.routes.api.documents.upsert.failure:', e);
      res
        .status(500)
        .json({ success: false, errorMsg: 'Network error. Please retry.' });
      return;
    }

    // update issue status if DOCUMENT status is updated to PUBLISHED
    if (updateResult.status === DocumentStatus.PUBLISHED && projectId) {
      try {
        await prisma.issue.update({
          where: {
            id: updateResult.issueId!,
          },
          data: {
            status: IssueStatus.COMPLETED,
            progress: 100,
            actualEndDate: new Date(),
            changeHistory: {
              create: {
                userId: currentUser.userId,
                modifiedAttribute: JSON.stringify({
                  status: IssueStatus.COMPLETED,
                }),
              },
            },
          },
        });
      } catch (e) {
        console.error(
          'in server.routes.api.documents.upsert.issueUpdate.failure:',
          e
        );
        res
          .status(500)
          .json({ success: false, errorMsg: 'Network error. Please retry.' });
        return;
      }
    }
    console.log('in server.routes.api.documents.upsert.result:', updateResult);
    res.status(201).json({
      success: true,
      data: { ...updateResult, contentStr },
    });
  }
);

// Get all documents for a user
router.get(
  '/',
  async function (request, response: ProfileResponse<DocumentOutput[]>) {
    const currentUser = response.locals.currentUser;

    try {
      const documents = await prisma.document.findMany({
        where: {
          creatorUserId: currentUser.userId,
          // type: { not: DOCTYPE.DEVELOPMENT_PLAN }, // todo - re-enable development plans later
          status: { notIn: [DocumentStatus.CANCELED, DocumentStatus.ARCHIVED] },
        },
        include: {
          project: {
            where: {
              status: { in: [ProjectStatus.CREATED, ProjectStatus.STARTED] },
            },
          },
          organization: true,
          creator: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      response.status(200).json({
        success: true,
        data: documents.map((doc) => ({
          ...doc,
          type: doc.type,
          contents: doc.content?.toString('utf-8'),
          meta: doc.meta as Prisma.JsonObject,
        })),
      });
    } catch (error) {
      console.error('Error occurred in GET /documents', error);
      response.status(200).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// Get a specific document by ID. Note that this will not return dev plan documents - the /devPlan APIs handle those exclusively
router.get(
  '/:documentId',
  async function (request, response: ProfileResponse<DocumentOutput>) {
    try {
      const { documentId } = request.params;
      const { organizationId, userId, email } =
        response.locals && response.locals.currentUser
          ? response.locals.currentUser
          : { organizationId: null, userId: undefined, email: undefined };

      const dbDocument = await prisma.document.findUnique({
        where: { id: documentId },
        include: { project: true, templateDocument: true, organization: true },
      });

      if (!dbDocument) {
        throw new Error('Could not find this document: ' + documentId);
      } else if (dbDocument.type === DOCTYPE.DEVELOPMENT_PLAN) {
        throw new Error(
          'Development plan documents can only be accessed via /devPlan API: ' +
            documentId
        );
      }

      let hasAccess = false;

      if (
        dbDocument.access === Access.PUBLIC ||
        userId === dbDocument.creatorUserId // user is document creator
      ) {
        hasAccess = true;
      } else {
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

      if (!hasAccess && Boolean(email)) {
        const docPermissionWithEmail =
          await prisma.documentPermission.findFirst({
            where: {
              documentId,
              email,
              status: DocumentPermissionStatus.ACTIVE,
            },
          });
        hasAccess = docPermissionWithEmail !== null;
      }

      if (!hasAccess) {
        throw new Error(
          'You have no permission to view this document: ' + documentId
        );
      }

      // DocumentTemplate
      if (
        userId &&
        !dbDocument.templateDocument &&
        dbDocument.type !== DOCTYPE.UI_DESIGN
      ) {
        dbDocument.templateDocument = await getDefaultTemplateDocument(
          dbDocument.type,
          response.locals.currentUser
        );
      }

      const { content: rawContents, type, ...document } = dbDocument;
      const contents = rawContents?.toString('utf-8');

      response.status(200).json({
        success: true,
        data: {
          ...document,
          type,
          contents,
          meta: document.meta as Prisma.JsonObject,
        },
      });
    } catch (error) {
      console.error('Error occurred in GET /documents/:documentId', error);
      response.status(200).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// Get a shared document by ID
// TODO: use passCode, replace email
router.get(
  '/shared/:documentId',
  async function (
    request,
    response: ProfileResponse<
      DocumentOutput & {
        currentUserId: string | null;
        documentPermission: DocumentPermissionTypes;
      }
    >
  ) {
    try {
      let email = '',
        userId = null,
        organizationId = null;
      if (response.locals.currentUser) {
        email = response.locals.currentUser.email;
        userId = response.locals.currentUser.userId;
        organizationId = response.locals.currentUser.organizationId;
      }
      const { documentId } = request.params;
      let accessEmail = request.query.accessEmail as string; // Input email to check document access.
      if (!isEmail(accessEmail)) {
        accessEmail = email;
      }

      const dbDocument = await prisma.document.findUnique({
        where: { id: documentId },
        include: { project: true, organization: true },
      });

      if (!dbDocument) {
        throw new Error('Could not find this document.');
      }

      const { hasAccess, documentPermission } = await checkDocumentAccess(
        dbDocument,
        accessEmail,
        userId,
        organizationId
      );
      if (!hasAccess) {
        if (!isEmail(accessEmail)) {
          throw new Error('Please enter your email to access this document.');
        }
        throw new Error('You have no permission to access this document.');
      }

      const { content: rawContents, type, ...document } = dbDocument;
      const contents = rawContents?.toString('utf-8');

      response.status(200).json({
        success: true,
        data: {
          ...document,
          type,
          contents,
          currentUserId: userId,
          documentPermission,
          meta: document.meta as Prisma.JsonObject,
        },
      });
    } catch (error) {
      console.error('Error occurred in GET /documents/:documentId', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// request document access
router.post('/requestAccess', async function (req, res: ProfileResponse) {
  const currentUser = res.locals.currentUser;
  const { documentId, message } = req.body;

  try {
    // find document
    const dbDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: { creator: true },
    });

    if (
      !dbDocument ||
      dbDocument.type === DOCTYPE.DEVELOPMENT_PLAN // You have to use the /devPlan API to access these
    ) {
      throw new Error('Could not find this document.');
    }

    // send email
    sendTemplateEmail<DocumentRequestAccessTemplateData>({
      templateName: 'DocRequestAccess',
      recipientEmails: [dbDocument.creator.email],
      TemplateData: {
        recipient_name: `${dbDocument.creator.firstname}`,
        sender_name: `${currentUser?.email}`,
        doc_name: dbDocument.name,
        message: message,
        link: `${SERVER_BASE_URL}/docs/${dbDocument.id}`,
      },
    });
    res.status(200).json({
      success: true,
      data: { msg: 'request sent' },
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      errorMsg: (error as string | Error).toString(),
    });
  }
});

router.post(
  '/generate-refinement',
  async function (req, res: ProfileResponse<RefinementOutput>) {
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

    const docData = req.body as RefinementGenerationInput;

    console.log(
      'in server.routes.api.documents.generate-refinement.start:',
      currentUser?.userId
    );
    let generateContent = '';

    try {
      generateContent = await genRefinement(docData, currentUser);

      console.log(
        'in server.routes.api.documents.generate-refinement.result:',
        generateContent
      );

      res.status(201).json({
        success: true,
        data: { contentStr: generateContent },
      });
    } catch (error) {
      console.error('Error occurred in GET /document-refinement', error);

      res.status(200).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// generate document
router.post(
  '/generate',
  async function (req, res: ProfileResponse<{ contentStr: string }>) {
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

    console.log('api.documents.document.generate');
    let generatedContent = await genDocumentAfterChat(org, currentUser, {
      ...req.body,
      chosenDocumentIds:
        req.body.chosenDocumentIds ?? req.body.meta?.chosenDocumentIds,
      id: req.body.entityId,
      type: req.body.entitySubType,
    });

    res.status(201).json({
      success: true,
      data: { contentStr: generatedContent as string },
    });
  }
);
// get access permission
router.get(
  '/:documentId/permission',
  async function (request, response: ProfileResponse<DocumentPermission[]>) {
    try {
      const { documentId } = request.params;
      const dbDocument = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!dbDocument) {
        throw new Error('Could not find this document: ' + documentId);
      }

      const result = await prisma.documentPermission.findMany({
        where: {
          documentId,
          status: DocumentPermissionStatus.ACTIVE,
        },
      });

      response.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.log('in server.routes.api.doc.permission.post.failure:', error);
      response
        .status(500)
        .json({ success: false, errorMsg: 'Network error. Please retry.' });
    }
  }
);

// add access permission
router.post(
  '/:documentId/permission',
  async function (request, response: ProfileResponse<string>) {
    try {
      const { documentId } = request.params;
      let userIds: [string] = request.body.userIds;
      console.log(
        'in api.documents.post.documentId.permission:',
        JSON.stringify(request.body)
      );
      // const shareUrl = request.body.shareUrl;
      // const permission: DocumentPermissionTypes = request.body.permission;
      const currentUser = response.locals.currentUser;

      const {
        emails,
        permission,
        documentPermissions,
        documentAccess,
        shareUrl,
      }: {
        documentId: string;
        emails: string[];
        permission: DocumentPermissionTypes;
        documentPermissions: DocumentPermission[];
        documentAccess: Access;
        shareUrl: string;
      } = request.body;

      const dbDocument = await prisma.document.findUnique({
        where: { id: documentId },
        include: { project: true },
      });

      if (!dbDocument) {
        throw new Error('Could not find this document: ' + documentId);
      }

      // update exists permissions
      for (const docPermission of documentPermissions) {
        await prisma.documentPermission.update({
          where: {
            id: docPermission.id,
          },
          data: {
            permission: docPermission.permission,
          },
        });
      }

      // to delete permissions
      const dbPermissions = await prisma.documentPermission.findMany({
        where: {
          documentId,
        },
      });
      const toDeletePermissionIds = [];
      for (const dbPermission of dbPermissions) {
        if (
          !documentPermissions.some(
            (docPermission) => dbPermission.id === docPermission.id
          )
        ) {
          toDeletePermissionIds.push(dbPermission.id);
        }
      }
      await prisma.documentPermission.updateMany({
        where: {
          id: {
            in: toDeletePermissionIds,
          },
        },
        data: {
          status: DocumentPermissionStatus.CANCELED,
        },
      });

      // Update Document access
      await prisma.document.update({
        where: {
          id: documentId,
        },
        data: {
          access: documentAccess,
        },
      });

      // add new permissions
      const toCreateEmails = emails.filter(
        (email) =>
          !documentPermissions
            .map((docPermission) => docPermission.email)
            .includes(email)
      );

      const toCreatePermissions = toCreateEmails.map((email) => {
        return {
          documentId,
          email,
          permission,
          status: DocumentPermissionStatus.ACTIVE,
        };
      });

      await prisma.documentPermission.createMany({
        data: toCreatePermissions,
      });

      const currentUserProfile = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { firstname: true, lastname: true },
      });

      if (userIds && userIds.length) {
        // Send Share Email
        const toUsers = await prisma.user.findMany({
          where: {
            id: { in: userIds },
          },
        });

        for (const toUser of toUsers) {
          sendTemplateEmail<DocumentShareTemplateData>({
            templateName: 'DocLink',
            recipientEmails: [toUser.email],
            TemplateData: {
              recipient_name: `${toUser.firstname} ${toUser.lastname}`,
              sender_name: `${currentUserProfile?.firstname} ${currentUserProfile?.lastname}`,
              doc_name: dbDocument.name,
              link: shareUrl,
            },
          });
        }
      }

      for (const email of toCreateEmails) {
        sendTemplateEmail<DocumentShareTemplateData>({
          templateName: 'DocLink',
          recipientEmails: [email],
          TemplateData: {
            recipient_name: `${email}`,
            sender_name: `${currentUserProfile?.firstname} ${currentUserProfile?.lastname}`,
            doc_name: dbDocument.name,
            link: shareUrl,
          },
        });
      }

      response.status(201).json({
        success: true,
        data: 'ok',
      });
    } catch (error) {
      console.log('in server.routes.api.doc.permission.post.failure:', error);
      response
        .status(500)
        .json({ success: false, errorMsg: 'Network error. Please retry.' });
    }
  }
);

router.post('/rating', async function (request, response) {
  try {
    const data = request.body;

    const updateResult = await prisma.document.update({
      where: {
        id: data.id,
      },
      data: {
        meta: { history: JSON.stringify(data.meta.history) },
      },
    });

    response.status(201).json({
      success: true,
      data: { ...updateResult },
    });
  } catch (e) {
    console.log('in server.routes.api.issues.update.failure:', e);
    response
      .status(500)
      .json({ success: false, errorMsg: 'Network error. Please retry.' });
    return;
  }
});

module.exports = {
  className: 'documents',
  routes: router,
};
