import { Request, Router } from 'express';
import prisma from '../../db/prisma';
import { ProfileResponse } from '../../types/response';
import {
  DOCTYPE,
  Organization,
  Prisma,
  TemplateAccess,
  TemplateDocument,
  TemplateStatus,
  User,
  UserRole,
} from '@prisma/client';
import { userProfileRequestHandler } from '../../lib/util';
import {
  OrganizationHierarchy,
  OrganizationWithContents,
  TeamAndProjects,
  TeamHierarchy,
} from '../types/organizationTypes';
import { VisibleUsers } from '../types/userTypes';
import {
  VisibleTeamMembers,
  getVisibleProjectsWhereClause,
  getVisibleTeamsWhereClause,
} from '../types/teamTypes';
import {
  MilestonesAndBacklog,
  VisibleProjects,
} from '../types/projectIncludes';
import { VisibleIssues } from '../types/issueTypes';
import { PaginationQuery } from '../../types/request';

const router = Router();
router.use(userProfileRequestHandler);

router.post(
  '/update',
  async function (request, response: ProfileResponse<Organization>) {
    try {
      const { size, industry, name, website, id } = request.body;

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          website,
          name,
          meta: {
            size,
            industry,
            name,
          },
        },
      });

      if (!organization) {
        throw new Error('The organization could not be found');
      }

      response.status(200).json({ success: true, data: organization });
    } catch (error) {
      console.error('Error in /organization', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
      return;
    }
  }
);

// Get information about the user's current organization
router.get(
  '/',
  userProfileRequestHandler,
  async function (
    request: Request,
    response: ProfileResponse<Organization | OrganizationWithContents>
  ) {
    try {
      const { userId, role, organizationId } = response.locals.currentUser;
      const { includeContents = false } = request.query;

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: includeContents
          ? {
              users: { where: VisibleUsers },
              teams: {
                where: {
                  ...getVisibleTeamsWhereClause(
                    role === UserRole.ADMIN,
                    userId
                  ),
                  parentTeamId: null,
                },
                include: {
                  _count: {
                    select: {
                      childTeams: {
                        where: getVisibleTeamsWhereClause(
                          role === UserRole.ADMIN,
                          userId
                        ),
                      },
                      members: { where: VisibleTeamMembers },
                      projects: { where: VisibleProjects },
                    },
                  },
                },
              },
              projects: {
                where: getVisibleProjectsWhereClause(
                  role === UserRole.ADMIN,
                  userId
                ),
                include: {
                  issues: { where: VisibleIssues },
                  workPlans: { where: MilestonesAndBacklog },
                  owner: { select: { id: true, username: true } },
                },
              },
              specialties: { where: { status: 'active' } },
            }
          : undefined,
      });

      if (!organization) {
        throw new Error('The organization could not be found');
      }

      response.status(200).json({ success: true, data: organization });
    } catch (error) {
      console.error('Error in /organization', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
      return;
    }
  }
);

// Get a list of users in the current user's organization
router.get(
  '/users',
  async function (request, response: ProfileResponse<ReadonlyArray<User>>) {
    const { organizationId } = response.locals.currentUser;
    const { excludeTeamId } = request.query as {
      excludeTeamId?: string | null;
    };

    const users = await prisma.user.findMany({
      where: {
        ...VisibleUsers,
        organizationId,
        ...(excludeTeamId
          ? { teams: { none: { teamId: excludeTeamId } } }
          : {}),
      },
    });
    response.status(200).json({ success: true, data: users });
  }
);

router.get(
  '/template-documents',
  async function (request, response: ProfileResponse<TemplateDocument[]>) {
    try {
      const { userId, organizationId } = response.locals.currentUser;

      if (!organizationId) {
        throw new Error('The organization could not be found');
      }

      const query = request.query as unknown as PaginationQuery &
        Record<string, string>;
      const q: string = query.q;
      const type: DOCTYPE = query.type as DOCTYPE;
      let page: number = Number(request.query.page) || 1;
      let limit: number = Number(request.query.limit) || 20;

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
        include: {
          organization: { select: { name: true } },
        },
      });
      const total = await prisma.templateDocument.count({
        where: conditions,
      });
      response.status(200).json({
        success: true,
        data: {
          list: result.sort((a, b) => {
            if (
              b.access === TemplateAccess.SELF ||
              (b.access === TemplateAccess.ORGANIZATION &&
                a.access === TemplateAccess.PUBLIC)
            ) {
              return 1;
            }
            return -1;
          }),
          pagination: {
            page,
            limit,
            total,
          },
        },
      });
    } catch (error) {
      console.error('Error in GET /organization/template-documents', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// Get information about the current organization, as well as a list of teams and projects the user can see within it
router.get(
  '/hierarchy',
  async function (
    request: Request,
    response: ProfileResponse<OrganizationHierarchy>
  ) {
    const { userId, role, organizationId } = response.locals.currentUser;
    let result;
    try {
      result = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          projects: {
            where: getVisibleProjectsWhereClause(
              role === UserRole.ADMIN,
              userId
            ),
          },
          teams: {
            where: getVisibleTeamsWhereClause(role === UserRole.ADMIN, userId), // Note that this will give us all teams, not just those directly under the organization
            include: {
              projects: { where: VisibleProjects },
            },
          },
        },
      });

      if (!result) {
        throw new Error('Information about the organization failed to load');
      }

      const { projects, teams: flatTeamList, ...organization } = result;

      const teams = flatTeamList
        .filter((t) => !t.parentTeamId)
        .map((t) => addChildrenToTeam(t, flatTeamList));

      // Convert the flat teams list into a hierarchy
      // const teams = teamsList.filter(team => !team.parentTeamId).map(team => addChildrenToTeam(team, teamsList));

      const data = { ...organization, projects, teams };
      response.status(200).json({ success: true, data });
    } catch (error) {
      console.error('An error occurred in /organization/hierarchy', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

function addChildrenToTeam(
  team: TeamAndProjects,
  flatTeamList: ReadonlyArray<TeamAndProjects>
): TeamHierarchy {
  return {
    ...team,
    teams: flatTeamList
      .filter((t) => t.parentTeamId === team.id)
      .map((childTeam) => addChildrenToTeam(childTeam, flatTeamList)),
  };
}

export const className = 'organization';
export const routes = router;
