import {
  IssueStatus,
  IssueType,
  RecordStatus,
  WorkPlan,
  WorkPlanStatus,
  WorkPlanType,
  Project,
  Access,
  UserRole,
} from '@prisma/client';
import prisma from '../db/prisma';
import { Prisma } from '@prisma/client';
import { ProjectOutput, ProjectInfo } from '../../shared/types';
import { VisibleIssues } from '../routes/types/issueTypes';
import { JiraEntity } from '../../shared/types/jiraTypes';
import { generateKey } from './jiraService';
import { AuthenticatedUserWithProfile } from '../types/authTypes';
import { getVisibleProjectsWhereClause } from '../routes/types/teamTypes';

export async function getProjectById(
  currentUser: AuthenticatedUserWithProfile,
  projectId: string,
  organizationId: string
): Promise<ProjectOutput | undefined> {
  const dbProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      documents: true,
      creator: true,
      owner: true,
      team: {
        include: {
          members: {
            where: { status: RecordStatus.ACTIVE },
            include: { user: true },
          },
        },
      },
      issues: {
        where: VisibleIssues,
        orderBy: {
          plannedStartDate: { sort: 'asc', nulls: 'last' },
        },
        include: {
          childIssues: true,
          owner: true,
        },
      },
      workPlans: {
        where: {
          status: { not: WorkPlanStatus.OVERWRITTEN },
        },
        orderBy: {
          plannedStartDate: { sort: 'asc', nulls: 'last' },
        },
        include: {
          issues: {
            include: {
              childIssues: true,
              owner: true,
            },
          },
        },
      },
    },
  });

  if (
    !dbProject ||
    dbProject.organizationId !== organizationId ||
    (dbProject.creatorUserId !== currentUser.userId &&
      dbProject.access === Access.SELF &&
      currentUser.role !== UserRole.ADMIN)
  ) {
    return undefined;
  }

  const { issues, workPlans, ...project } = dbProject;
  const backlog = dbProject.workPlans.find(
    (wp) => wp.type === WorkPlanType.BACKLOG
  );
  const startTime = new Date().valueOf();

  const sprints = dbProject.workPlans
    .filter((wp) => wp.type === WorkPlanType.SPRINT)
    .sort((wp) => wp.plannedStartDate?.getSeconds() || 1)
    .map((sprint) => ({
      ...sprint,
      issues: sprint.issues.filter(
        (issue) => !issue.childIssues || issue.childIssues.length === 0
      ),
    }));

  const projectOutput: ProjectOutput = {
    ...project,
    buildables: issues.filter((i) => i.type === IssueType.BUILDABLE),
    backlog: backlog && {
      ...backlog,
      stories: issues
        .filter(
          (i) => i.type === IssueType.STORY && i.workPlanId === backlog.id
        )
        .map((story) => ({
          ...story,
          tasks: issues.filter(
            (i) => i.type === IssueType.TASK && i.parentIssueId === story.id
          ),
        })),
      tasks: issues.filter(
        (i) =>
          i.type === IssueType.TASK &&
          !i.parentIssueId &&
          i.workPlanId === backlog.id
      ),
    },
    backlogIssues: backlog?.issues || [],
    backlogId: backlog?.id,
    issues: issues,
    sprints: sprints,
    activeSprintInd: getTargetSprintInd(startTime, sprints),
    milestones: workPlans
      .filter((wp) => wp.type === WorkPlanType.MILESTONE)
      .map((milestone) => ({
        ...milestone,
        epics: issues
          .filter(
            (i) => i.type === IssueType.EPIC && i.workPlanId === milestone.id
          )
          .map((epic) => ({
            ...epic,
            stories: issues
              .filter(
                (i) => i.type === IssueType.STORY && i.parentIssueId === epic.id
              )
              .map((story) => ({
                ...story,
                tasks: issues.filter(
                  (i) =>
                    i.type === IssueType.TASK && i.parentIssueId === story.id
                ),
              })),
          })),
        sprints: workPlans
          .filter(
            (wp) =>
              wp.type === WorkPlanType.SPRINT &&
              wp.parentWorkPlanId === milestone.id
          )
          .map((sprint) => ({
            ...sprint,
            stories: issues
              .filter(
                (issue) =>
                  issue.type === IssueType.STORY &&
                  issues.some(
                    (child) =>
                      child.type === IssueType.TASK &&
                      child.workPlanId === sprint.id &&
                      child.parentIssueId === issue.id
                  )
              )
              .map((story) => {
                const tasks = issues.filter(
                  (child) =>
                    child.type === IssueType.TASK &&
                    child.workPlanId === sprint.id &&
                    child.parentIssueId === story.id
                );
                const { totals } = tasks.reduce(
                  ({ totals }, child) => {
                    if (child.status === IssueStatus.CANCELED) {
                      return { totals };
                    }
                    totals.storyPoint += child.storyPoint || 0;
                    (totals.completedStoryPoint +=
                      child.completedStoryPoint || 0),
                      (totals.progress =
                        totals.storyPoint !== 0
                          ? Math.floor(
                              (totals.completedStoryPoint / totals.storyPoint) *
                                100
                            )
                          : 0);

                    return { totals };
                  },
                  {
                    totals: {
                      storyPoint: 0,
                      completedStoryPoint: 0,
                      progress: 0,
                    },
                  }
                );

                return {
                  ...story,
                  ...totals,
                  tasks,
                  totalStoryPoint: story.storyPoint,
                  totalCompletedStoryPoint: story.completedStoryPoint,
                  totalProgress: story.progress,
                };
              }),
          })),
      }))
      .sort((a, b) => {
        // sort the miletones by start date and end date
        return (
          a.plannedStartDate!.getTime() - b.plannedStartDate!.getTime() ||
          a.plannedEndDate!.getTime() - b.plannedEndDate!.getTime()
        );
      }),
  };

  return projectOutput;
}

export async function getProjectsInfoByOrganizationId(
  userId: string,
  isAdmin: boolean,
  organizationId: string
): Promise<ProjectInfo[]> {
  console.log(
    'in server.services.projectService.getProjectsInfoByOrganizationId:',
    isAdmin
  );
  const dbProjects = await prisma.project.findMany({
    where: {
      organizationId: organizationId,
      ...getVisibleProjectsWhereClause(isAdmin, userId),
    },
  });

  const projectInfos: ProjectInfo[] = dbProjects.map((dbProject) => {
    let meta = (dbProject?.meta as Prisma.JsonObject) ?? {};
    const projectInfo: ProjectInfo = {
      name: dbProject.name,
      id: dbProject.id,
      jira_key: meta.jira ? (meta.jira as JiraEntity).key : '',
    };
    return projectInfo;
  });
  return projectInfos;
}

function getTargetSprintInd(targetTime: number, sprints: WorkPlan[]): number {
  const targetSprintInd = sprints.findIndex((sprint) => {
    const startTime =
      sprint.plannedStartDate && sprint.plannedStartDate.getTime();

    const endTime = sprint.plannedEndDate && sprint.plannedEndDate.getTime();

    return startTime! <= targetTime && endTime! >= targetTime;
  });
  if (!targetSprintInd || targetSprintInd < 0) return 0;
  return targetSprintInd;
}

export async function saveJiraProfileForProject(
  projectId: string,
  profile: JiraEntity
): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  // Update Jira information only.
  let newMeta = (project?.meta as Prisma.JsonObject) ?? {};
  newMeta.jira = profile;

  return await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      jiraId: `${profile.id}`,
      meta: newMeta,
    },
  });
}

export async function generateShortNameForProject(
  name: string
): Promise<string> {
  let key = generateKey(name);

  // Retry creating project with random suffix in key.
  for (let retryTimes = 0; retryTimes < 3; retryTimes++) {
    let shortName = key;
    if (retryTimes > 0) {
      shortName = (
        key.substring(0, 8) + Math.floor(Math.random() * 10000).toString()
      ).substring(0, 10);
    }

    let result = await prisma.project.findFirst({
      where: { shortName: shortName },
    });

    if (!result) {
      return shortName;
    }
  }

  throw Error('Could not find availble project short name after retry.');
}

export async function updateProjectStoryPointProgress(
  projectId: string,
  storyPointChange: number,
  action: string
): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    throw Error('Project not found.');
  }

  let storyPoint = project.storyPoint || 0;
  let completedStoryPoint = project.completedStoryPoint || 0;

  switch (action) {
    case 'updateCompletedStoryPoint':
      completedStoryPoint += storyPointChange;
      break;
    case 'updateTotalStoryPoint':
      storyPoint += storyPointChange;
      break;
    case 'updateBothStoryPoint':
      completedStoryPoint += storyPointChange;
      storyPoint += storyPointChange;
      break;
    default:
      throw Error(
        'in server.services.projectService.updateProjectStoryPointProgress, unknown action: ' +
          action
      );
  }

  return await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      storyPoint,
      completedStoryPoint,
      progress:
        storyPoint !== 0
          ? Math.floor((completedStoryPoint / storyPoint) * 100)
          : 0,
    },
  });
}
