import { Router } from 'express';
import {
  Project,
  ProjectStatus,
  TemplateProject,
  WorkPlanType,
  IssueStatus,
  IssueType,
  WorkPlanStatus,
  Issue,
  Access,
  UserRole,
  DocumentStatus,
} from '@prisma/client';
import { DocumentTypeNameMapping } from '../../lib/constant';

import prisma from '../../db/prisma';
import { IssuesData } from './../../db/seed/issueData';
import { userProfileRequestHandler } from '../../lib/util';
import { ProfileResponse } from '../../types/response';
import { AdminOrgId } from '../types/entityType';
import mixpanel from '../../services/trackingService';

import {
  CreateProjectInputSchema,
  ProjectOutput,
  ProjectInfo,
} from '../../../shared/types';
import {
  generateShortNameForProject,
  getProjectById,
  getProjectsInfoByOrganizationId,
} from '../../services/projectService';
import dayjs from 'dayjs';
import { generateIssueIdFromIndex } from '../../services/issueService';
import { createDocumentForBuildable } from '../../services/documentService';
import { sendEmail } from '../../services/emailService';
import { postProjectCreation } from '../../lib/emailTemplate';

const router = Router();
router.use(userProfileRequestHandler);

router.post('/', async function (req, res: ProfileResponse<Project>) {
  const currentUser = res.locals.currentUser;
  const parseResult = CreateProjectInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.error('Error parsing createProjectApi input', parseResult.error);
    res
      .status(500)
      .json({ success: false, errorMsg: parseResult.error.toString() });
    return;
  }
  const projectData = parseResult.data;
  projectData.ownerUserId = projectData.ownerUserId || currentUser.userId; // Default to current user if not set

  console.log(
    'in server.routes.api.projects.post.start:',
    currentUser?.userId,
    projectData
  );

  const isFirstProject = await prisma.user.findUnique({
    where: {
      id: currentUser.userId,
      AND: [
        { ownedProjects: { none: {} } }, // No owned projects
      ],
    },
  });

  let createResult: Project;
  try {
    let projectShortName = await generateShortNameForProject(projectData.name);
    createResult = await prisma.project.create({
      data: {
        ...projectData,
        shortName: projectShortName,
        organizationId: currentUser.organizationId,
        creatorUserId: currentUser.userId,
        access: projectData.access || Access.SELF,
        workPlans: {
          create: {
            name: 'Backlog',
            type: WorkPlanType.BACKLOG,
            status: IssueStatus.CREATED,
            creatorUserId: currentUser.userId,
            ownerUserId: projectData.ownerUserId,
            plannedEndDate: null,
          },
        },
      },
    });
    // todo - move this out when template is ready for user to pick
    try {
      // create buildable issues
      let idx = 0;
      // create the buildable issues
      let buildables = await prisma.issue.createManyAndReturn({
        data: IssuesData.map((issue) => {
          idx += 1;
          let shortName = generateIssueIdFromIndex(projectShortName, idx);
          return {
            ...issue,
            shortName,
            projectId: createResult.id,
            creatorUserId: createResult.creatorUserId,
            ownerUserId: createResult.ownerUserId,
          };
        }),
      });
      // next create the documents for all the buildable issues
      await Promise.all(
        buildables.map((buildable: Issue) => {
          // track successful project creation
          mixpanel.track('Document Created', {
            distinct_id: currentUser.email,
            projectId: createResult.id,
            projectName: createResult.name,
            name: buildable.name,
          });
          return createDocumentForBuildable({
            name: `${DocumentTypeNameMapping[buildable.name].name} - ${
              projectData.name
            }`,
            issueId: buildable.id,
            projectId: createResult.id,
            type: DocumentTypeNameMapping[buildable.name].type,
            userId: createResult.creatorUserId,
            access: projectData.access || Access.SELF,
          });
        })
      );
      console.log('server.routes.api.projects.issues.success');
    } catch (err) {
      console.error('server.routes.api.projects.issues.error:', err);
      res
        .status(500)
        .json({ success: false, errorMsg: 'Error creating projects' });
      return;
    }
  } catch (e) {
    console.log('in server.routes.api.projects.post.failure:', e);
    res
      .status(500)
      .json({ success: false, errorMsg: 'Network error. Please retry.' });
    return;
  }
  console.log('in server.routes.api.projects.post.result:', createResult);

  if (isFirstProject) {
    await sendEmail({
      email: currentUser.email,
      subject: `🎉 Congrats on creating your first Omniflow project`,
      body: postProjectCreation(
        currentUser.firstname?.trim()
          ? currentUser.firstname
          : currentUser.email.split('@')[0],
        projectData.name
      ),
    });
  }
  res.status(201).json({ success: true, data: createResult });
});

// get all project templates that are active
router.get(
  '/templates',
  async function (req, res: ProfileResponse<TemplateProject[]>) {
    // const currentUser = res.locals.currentUser;
    // get users
    let pTemplates = await prisma.templateProject.findMany({
      where: {
        organizationId: { in: [AdminOrgId /* currentUser?.organizationId */] }, // TODO: Resume including the user's organization ID
        status: ProjectStatus.COMPLETED,
      },
      include: {
        templateIssues: true,
      },
    });

    console.log('in server.routes.api.projects.templates.get.all:', pTemplates);
    res.status(200).json({
      success: true,
      data: pTemplates,
    });
  }
);

// get all project
router.get('/all', async function (req, res: ProfileResponse<ProjectInfo[]>) {
  const { userId, role, organizationId } = res.locals.currentUser;
  // get projects
  const projects = await getProjectsInfoByOrganizationId(
    userId,
    role === UserRole.ADMIN,
    organizationId
  );
  res.status(200).json({ success: true, data: projects });
});

// get a specific project
router.get(
  '/:projectId',
  async function (req, res: ProfileResponse<ProjectOutput>) {
    const { organizationId } = res.locals.currentUser;
    const { projectId } = req.params;

    console.log('in server.routes.api.projects.get.projectId', projectId);

    // get projects
    const project = await getProjectById(
      res.locals.currentUser,
      projectId,
      organizationId
    );

    if (!project) {
      res.status(404).json({
        success: false,
        errorMsg: 'The specified project could not be found',
      });
      return;
    }

    // console.log('in server.routes.api.projects.get.all:', projects);
    res.status(200).json({ success: true, data: project });
  }
);

/**
 * Update a project
 */
router.put('/:projectId', async function (req, res: ProfileResponse<Project>) {
  const { projectId } = req.params;
  const { userId } = res.locals.currentUser;

  const { name, description, dueDate } = req.body;
  const newOwnerUserId = req.body?.ownerUserId;

  // get existing project in order to validate if user has permission
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      ownerUserId: userId,
    },
  });
  if (!project) {
    res
      .status(401)
      .json({ success: false, errorMsg: 'User is not Project Owner' });
    return;
  }

  try {
    const result = await prisma.project.update({
      where: {
        id: projectId,
        ownerUserId: userId,
      },
      data: {
        name: name,
        description: description,
        dueDate: dayjs(dueDate).toISOString(),
        owner: {
          connect: { id: newOwnerUserId },
        },
      },
    });

    res.status(200).json({ success: true, data: result });
  } catch (e) {
    console.error('server.routes.api.projects.put failure:', e);
    res.status(500).json({ success: false, errorMsg: e as string });
    return;
  }
});

/**
 * Delete a project
 */
router.delete('/:projectId', async function (req, res: ProfileResponse<null>) {
  const { projectId } = req.params;
  const { userId, role, organizationId } = res.locals.currentUser;

  console.log('server.routes.api.projects.delete.projectId', projectId);

  // Perform soft deletion by setting the project Status to Cancelled
  // Only works if the project's owner is the current user

  try {
    let whereClause =
      role === UserRole.ADMIN
        ? {
            id: projectId,
            organizationId,
          }
        : {
            id: projectId,
            ownerUserId: userId,
          };
    await prisma.project.update({
      where: whereClause,
      data: {
        status: ProjectStatus.CANCELED,
      },
    });
  } catch (e) {
    console.error('api.projects.delete.error:', e);
    res
      .status(401)
      .json({ success: false, errorMsg: 'Network error. Please retry.' });
    return;
  }

  // Cascade soft deletion to Issues and Workplans
  try {
    await Promise.all([
      prisma.issue.updateMany({
        where: {
          status: {
            not: IssueStatus.CANCELED,
          },
          project: {
            status: ProjectStatus.CANCELED,
            id: projectId,
          },
        },
        data: {
          status: IssueStatus.CANCELED,
        },
      }),
      prisma.workPlan.updateMany({
        where: {
          status: {
            not: WorkPlanStatus.CANCELED,
          },
          project: {
            status: ProjectStatus.CANCELED,
            id: projectId,
          },
        },
        data: {
          status: WorkPlanStatus.CANCELED,
        },
      }),
      prisma.document.updateMany({
        where: {
          status: {
            not: WorkPlanStatus.CANCELED,
          },
          project: {
            status: ProjectStatus.CANCELED,
            id: projectId,
          },
        },
        data: {
          status: DocumentStatus.CANCELED,
        },
      }),
    ]);

    res.status(200).json({ success: true, data: null });
  } catch (e) {
    console.error('server.routes.api.projects.delete', e);
    res.status(500).json({ success: false, errorMsg: e as string });
  }
});

// This is not currently being used so commenting it out, but I don't want to lose track of this code
// // get all projects that are active
// router.get('/status', async function (req, res: ProfileResponse<IProjectResponse>) {
//   const { projectId } = req.query;

//   // todo - move this condition below to only happen when a specific project is being queried against: to be below line 97
//   let include = {
//     workPlans: {
//       where: {
//         type: WorkPlanType.MILESTONE,
//         status: IssueStatus.CREATED,
//       },
//       include: {
//         childWorkPlans: true,
//       },
//     },
//     issues: {
//       where: VisibleIssues,
//       include: {
//         parentIssue: true,
//       },
//     },
//   };
//   // get projects
//   let project = (await prisma.project.findFirst({
//     where: { id: projectId as string },
//     include,
//   })) as IProjectResponse;
//   let result = await genWeeklyStatus(projectId as string);
//   console.log('in server.routes.api.projects.get.status:', projectId, result);
//   project.weeklyStatus = result;
//   res
//     .status(200)
//     .json({ success: true, data: project });
// });

// Cancels a planning step. The step has to not be completed or canceled already, and the project cannot have started
router.delete(
  '/:projectId/planningStep/:issueId',
  async function (request, response: ProfileResponse<void>) {
    try {
      const { projectId, issueId } = request.params;
      const { organizationId } = response.locals.currentUser;

      // We use DeleteMany so we can do extra checking to make sure we only delete issues that match everything, not just ID
      const result = await prisma.issue.updateMany({
        where: {
          id: issueId,
          type: IssueType.BUILDABLE,
          status: {
            not: { in: [IssueStatus.COMPLETED, IssueStatus.CANCELED] },
          },
          project: {
            status: ProjectStatus.CREATED,
            id: projectId,
            organizationId,
          },
        },
        data: {
          status: IssueStatus.CANCELED,
        },
      });

      if (result.count === 0) {
        throw new Error(
          'The specified planning step could not be found: ' + issueId
        );
      }
      if (result.count !== 1) {
        throw new Error(
          '[CRITICAL] Deleting this issue ID modified more than one database record: ' +
            issueId
        );
      }

      response.status(200).json({ success: true, data: undefined });
    } catch (error) {
      console.error(
        'An error occurred in DELETE /projects/:projectId/planningStep/:issueId',
        error
      );
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

module.exports = {
  className: 'projects',
  routes: router,
};
