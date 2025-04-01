import { useCallback, useEffect, useRef, useState } from 'react';
import { InfoCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import {
  ChatSessionTargetEntityType,
  DOCTYPE,
  DocumentStatus,
  IssueType,
} from '@prisma/client';
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Empty,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Progress,
  Skeleton,
  Space,
  Spin,
  Steps,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate, useParams } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import {
  ErrorMessage,
  GenerationMinimumCredit,
} from '../../../common/constants';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { useProjectQuery } from '../../../common/hooks/useProjectsQuery';
import { COLORS } from '../../../lib/constants';
import { createDevPlanDocxFile } from '../../../lib/convert';
import trackEvent from '../../../trackingClient';
import DocumentToolbar from '../../documents/components/DocumentToolbar';
import { BuildingPath, DocumentsPath, ProjectsPath } from '../../nav/paths';
import { getSpecialtyDisplayName } from '../../profile/profileUtils';
import useDocumentMutation from '../../project/hooks/useDocumentMutation';
import { useTeamOrOrganizationUsers } from '../../team/hooks/useTeamOrOrganizationUsers';
import { getDevPlanApi } from '../api/getDevPlanApi';
import { useDevPlan } from '../hooks/useDevPlan';
import { useUpdateDevPlanMutation } from '../hooks/useUpdateDevPlanMutation';
import {
  DevPlanOutput,
  Epic,
  Milestone,
  Sprint,
  Story,
  Task,
} from '../types/devPlanTypes';
import { DevPlanDocument } from './DevPlanDocument';
import { DevPlanEditorItemTitle } from './DevPlanEditorItemTitle';
import { syncEpicInMilestone, syncMilestoneToEpic } from './DevPlanEditorUtils';
import { DevPlanMilestoneTitle } from './DevPlanMilestoneTitle';
import { DevPlanSpecialtyInput } from './DevPlanSpecialtyInput';
import { DevPlanSprintTitle } from './DevPlanSprintTitle';
import { DevPlanStoryTitle } from './DevPlanStoryTitle';
import { DevPlanTeamInput } from './DevPlanTeamInput';

import './DevPlanEditor.scss';

type FormFields = Readonly<
  Pick<
    DevPlanOutput,
    | 'requiredSpecialties'
    | 'chosenDocumentIds'
    | 'teamMembers'
    | 'weeksPerSprint'
    | 'epics'
    | 'milestones'
  > & { sprintStartDate: Dayjs }
>;

const DevPlanSteps = [
  {
    title: 'Review the work',
    // status: 'wait',
    description: 'Epics, Stories, Tasks',
  },
  {
    title: 'Confirm the schedule',
    // status: 'process',
    description: 'Milestones, Sprints',
  },
];

const defaultWeeksPerSprint = 2;

const EpicTemplate = {
  type: IssueType.EPIC,
  storyPoint: 0,
  children: [],
};

const StoryTemplate = {
  type: IssueType.STORY,
  storyPoint: 0,
  children: [],
};

const TaskTemplate = {
  type: IssueType.TASK,
};

function useDevPlanIdParameter(): string {
  const { docId } = useParams();
  if (!docId) {
    throw new Error('You must specify a dev plan ID parameter');
  }
  return docId;
}

export function DevPlanEditor() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const devPlanId = useDevPlanIdParameter();

  const [currentStep, setStep] = useState(0);
  const [savedFormValues, setSavedFormValues] = useState<FormFields>();
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [isDevPlanBeingPublished, setIsDevPlanBeingPublished] = useState(false);
  const isFetchingDevPlan = useRef(false);

  const [epicActiveKeys, setEpicActiveKeys] = useState<string[]>([]);
  const [storyActiveKeys, setStoryActiveKeys] = useState<string[]>(['0']);

  const { showAppModal } = useAppModal();

  const { user, organization } = useCurrentUser();
  const isGenerationLocked =
    (organization?.credits ?? 0) <= GenerationMinimumCredit;
  const { data: devPlan, isLoading, isError, error } = useDevPlan(devPlanId);
  const { data: availableUsers } = useTeamOrOrganizationUsers({
    source: 'team',
    teamId: devPlan?.project?.teamId,
  });

  const { data: project } = useProjectQuery(devPlan?.projectId as string);
  const prdDoc = project?.documents.find((b) => b.type === DOCTYPE.PRD);

  const [form] = Form.useForm<FormFields>();
  const [teamError, setTeamError] = useState<string>();
  const [paragraphs, setParagraphs] = useState<any[]>([]);

  const formValues = Form.useWatch([], form);
  useEffect(() => {
    if (devPlan?.epics) {
      setEpicActiveKeys(devPlan.epics.map((_, index) => index * 100 + ''));
    }
    if (devPlan) {
      const newParagraphs = createDevPlanDocxFile(devPlan, availableUsers);
      setParagraphs(newParagraphs);
    }
  }, [formValues, savedFormValues, devPlan, availableUsers]);

  const onUpdateDevPlanSuccess = useCallback(
    (output: DevPlanOutput) => {
      if (output.status === DocumentStatus.PUBLISHED) {
        navigate(`/${ProjectsPath}/${output.projectId}/${BuildingPath}`);
      } else {
        const newValues = {
          requiredSpecialties: output.requiredSpecialties,
          chosenDocumentIds: output.chosenDocumentIds,
          teamMembers: output.teamMembers,
          weeksPerSprint: output.weeksPerSprint || defaultWeeksPerSprint,
          sprintStartDate: dayjs(output.sprintStartDate, 'MM/DD/YYYY'),
          epics: output.epics,
          milestones: output.milestones,
        };
        setSavedFormValues(newValues);
        form.setFieldsValue(newValues);
      }
    },
    [form, navigate]
  );
  const updateDevPlanMutation = useUpdateDevPlanMutation({
    onSuccess: onUpdateDevPlanSuccess,
  });

  const { generateDocumentMutation } = useDocumentMutation({
    onSuccess: (doc) => {
      console.log('generateDocumentMutation success', doc.contentStr);
      if (doc.contentStr) {
        // we only set isFetchingDevPlan to false if we have a valid plan generated
        isFetchingDevPlan.current = false;
        window.location.reload(); // This is only necessary because we don't have a dedicated devplan/generate API
      }
    },
    onError: (error) => {
      handleErrorMsgs(error);
    },
  });

  const validateTeamMemberSpecialties = useCallback(() => {
    if (currentStep === 0) {
      return false;
    }
    let requiredSpecialties = form.getFieldValue('requiredSpecialties');
    let teamMemberSpecialties = form
      .getFieldValue('teamMembers')
      .map((s: any) => s.specialty);
    let missingSpecialties = requiredSpecialties.reduce(
      (accu: string[], s: string) => {
        if (teamMemberSpecialties.includes(s)) {
          return accu;
        } else if (
          // if frontend or backend is required but fullstack engineer is present, it's okay
          ['FRONTEND_ENGINEER', 'BACKEND_ENGINEER'].includes(s) &&
          teamMemberSpecialties.includes('FULLSTACK_ENGINEER')
        ) {
          return accu;
        } else if (
          // if fullstack is required but frontend/backend engineer is present, it's okay
          s === 'FULLSTACK_ENGINEER' &&
          teamMemberSpecialties.includes('FRONTEND_ENGINEER') &&
          teamMemberSpecialties.includes('BACKEND_ENGINEER')
        ) {
          return accu;
        }
        // finally, return the missing specialty
        return [...accu, s];
      },
      []
    );
    console.log('missingSpecialties:', missingSpecialties);
    if (missingSpecialties.length) {
      setTeamError(
        `Please add teammates: ${missingSpecialties
          .map((s: string) => getSpecialtyDisplayName(s))
          .join(', ')}`
      );
      return false;
    } else {
      setTeamError(undefined);
      return true;
    }
  }, [form, currentStep]);
  const handleErrorMsgs = (error: string | Error) => {
    const errorMessage = (error as string | Error).toString();
    console.log('DevPlanEditor.generateDocumentMutation.error: ', errorMessage);
    // disable isFetchingDevPlan if we have an error so page won't keep showing spinner and it will display the error
    if (errorMessage.endsWith(ErrorMessage.NOT_ENOUGH_CAPACITY_BACKEND)) {
      isFetchingDevPlan.current = false;
      setTeamError('This project requires backend (or fullstack) team members');
    } else if (
      errorMessage.endsWith(ErrorMessage.NOT_ENOUGH_CAPACITY_FRONTEND)
    ) {
      isFetchingDevPlan.current = false;
      setTeamError(
        'This project requires frontend (or fullstack) team members'
      );
    } else if (
      errorMessage.endsWith(ErrorMessage.NOT_ENOUGH_CAPACITY_ANDROID)
    ) {
      isFetchingDevPlan.current = false;
      setTeamError('This project requires Android team members');
    } else if (errorMessage.endsWith(ErrorMessage.NOT_ENOUGH_CAPACITY_IOS)) {
      isFetchingDevPlan.current = false;
      setTeamError('This project requires iOS team members');
    } else {
      console.error(
        'DevPlanEditor.generateDocumentMutation.error: ',
        errorMessage
      );
      throw error;
    }
  };

  const setEpicsDataKeyMapping = (epics: ReadonlyArray<Epic>) => {
    epics.forEach((epic: Epic, index: number) => {
      if (epic) {
        epic.key = epic.key || `epic:${epics.length}`;
        epic.children.forEach((story: any, index: number) => {
          if (story) {
            story.key =
              story.key || `${epic.key};story:${epic.children.length}`;
            story.children.forEach((task: any, index: number) => {
              if (task) {
                task.key =
                  task.key || `${story.key};task:${story.children.length}`;
                task.sprintKey = task.sprintKey || '';
              }
            });
          }
        });
      }
    });
  };

  const validateStoryPoints = useCallback(
    (targets: Array<Milestone | Sprint | Epic | Story | Task>) => {
      let list = targets || [];
      for (let index = list.length - 1; index >= 0; --index) {
        let target = targets[index];
        // remove at story level will leave an undefined or incompeleted item in the array
        // we need to remove it to avoid errors.
        if (!target || (!target.name && !target.type)) {
          targets.splice(index, 1);
          return;
        }
        if ('children' in target && target.children) {
          validateStoryPoints(target.children); // First process the children
          target.storyPoint = target.children.reduce(
            (result, child) => result + child.storyPoint,
            0
          );
        }
      }
    },
    []
  );

  const saveDevPlan = useCallback(() => {
    if (devPlan) {
      form.validateFields().then(
        (values) => {
          setEpicsDataKeyMapping(values.epics);
          validateStoryPoints(values.epics);
          const input = {
            devPlanId: devPlan.id,
            epics: values.epics || devPlan.epics,
            sprints: devPlan.sprints,
            milestones: values.milestones || devPlan.milestones,
            weeksPerSprint: values.weeksPerSprint || defaultWeeksPerSprint,
            requiredSpecialties: values.requiredSpecialties.join(','),
            chosenDocumentIds: values.chosenDocumentIds.join(','),
            teamMembers: values.teamMembers || devPlan.teamMembers,
            sprintStartDate:
              values.sprintStartDate?.format('MM/DD/YYYY') ||
              devPlan.sprintStartDate,
            regenerateMilestones: true,
            publishPlan: false,
          };
          updateDevPlanMutation.mutate(input);
          // track event
          trackEvent('updateDevPlan', {
            distinct_id: user.email,
            payload: JSON.stringify({
              name: devPlan.name,
              id: devPlan.id,
              action: 'saveDevPlanAfterChange:reviewTask',
            }),
          });
        },
        () => {} // Just mark as invalid - nothing else to do
      );
    }
  }, [devPlan, form, updateDevPlanMutation, validateStoryPoints, user.email]);

  const saveDevPlanInMilestone = useCallback(() => {
    if (devPlan) {
      form.validateFields().then(
        (values) => {
          validateStoryPoints(values.milestones);
          const input = {
            devPlanId: devPlan.id,
            epics: values.epics || devPlan.epics,
            sprints: devPlan.sprints,
            milestones: values.milestones || devPlan.milestones,
            weeksPerSprint: values.weeksPerSprint || defaultWeeksPerSprint,
            requiredSpecialties: values.requiredSpecialties.join(','),
            chosenDocumentIds: values.chosenDocumentIds.join(','),
            teamMembers: values.teamMembers,
            sprintStartDate: values.sprintStartDate.format('MM/DD/YYYY'),
            regenerateMilestones: true,
            publishPlan: false,
          };
          // milestone and epics don't share same story instance in devplan,
          // we need to copy your changed story point and name in milestones to epics
          // we only do this when milestones exist, because when it doesn't exist, it's a newly created plan
          if (input.milestones.length) {
            syncMilestoneToEpic(input);
          }

          // after that we update epic's story point to correct value.
          validateStoryPoints(input.epics);

          // after that we update epic info in the milestone objects since they are another copy.
          syncEpicInMilestone(input);
          updateDevPlanMutation.mutate(input);
          // track event
          trackEvent('updateDevPlan', {
            distinct_id: user.email,
            payload: JSON.stringify({
              name: devPlan.name,
              id: devPlan.id,
              action: 'saveDevPlanAfterChange:reviewTimeline',
            }),
          });
        },
        () => {} // Just mark as invalid - nothing else to do
      );
    }
  }, [devPlan, form, updateDevPlanMutation, validateStoryPoints, user.email]);

  // remove a task and save devplan
  const removeThenSave = (
    removeFunction: (index: number | number[]) => void,
    saveFunction: () => void
  ) => {
    return (index: number | number[]) => {
      removeFunction(index);
      saveFunction();
    };
  };

  const publishDevPlan = useCallback(() => {
    if (devPlan) {
      // track event
      trackEvent('publishDevPlan', {
        distinct_id: user.email,
        payload: JSON.stringify({
          name: devPlan.name,
          id: devPlan.id,
          projectId: devPlan.projectId,
        }),
      });
      // display message for publish dev plan for documents
      if (!devPlan.projectId) {
        const modal = Modal.info({
          title: 'Dev Plan Publish',
          width: '510px',
          content: (
            <div>
              <p>
                We currenlty only supports Dev Plan Publish inside a project.
                Please first{' '}
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    modal.destroy();
                    showAppModal({ type: 'addProject' });
                  }}
                >
                  Add A Project
                </a>{' '}
                before publishing dev plan.
              </p>{' '}
            </div>
          ),
          onOk() {},
        });
        return;
      }
      form.validateFields().then(
        (values) => {
          const input = {
            devPlanId: devPlan.id,
            epics: values.epics || devPlan.epics,
            sprints: devPlan.sprints,
            milestones: values.milestones || devPlan.milestones,
            weeksPerSprint: values.weeksPerSprint || defaultWeeksPerSprint,
            requiredSpecialties: values.requiredSpecialties.join(','),
            chosenDocumentIds: values.chosenDocumentIds.join(','),
            teamMembers: values.teamMembers,
            sprintStartDate: values.sprintStartDate.format('MM/DD/YYYY'),
            // TODO: decide a best regenerateMilestones flag logic
            regenerateMilestones: currentStep === 0,
            publishPlan: true,
          };
          updateDevPlanMutation.mutate(input);
          setIsDevPlanBeingPublished(true);
        },
        () => {} // Just mark as invalid - nothing else to do
      );
    }
  }, [
    devPlan,
    form,
    currentStep,
    updateDevPlanMutation,
    user.email,
    showAppModal,
  ]);

  const autoSaveDevPlan = useCallback(() => {
    let isTeamValid = validateTeamMemberSpecialties();
    if (isTeamValid) {
      currentStep === 0 ? saveDevPlan() : saveDevPlanInMilestone();
    } else {
      console.log(
        "Team members don't have the required specialties, skipping autosave"
      );
    }
  }, [
    saveDevPlan,
    currentStep,
    saveDevPlanInMilestone,
    validateTeamMemberSpecialties,
  ]);

  const updateLoadingPercent = useCallback(() => {
    if (loadingPercent >= 99 || !isFetchingDevPlan.current) {
      return;
    }
    setTimeout(() => {
      setLoadingPercent((currentPercent) => {
        console.log('currentPercent:', currentPercent);
        if (currentPercent < 100) {
          // distribute increase to 1min (60s) to get to 100%
          return Math.floor(currentPercent + Math.random() * 5);
        }
        return currentPercent;
      });
      updateLoadingPercent();
    }, 1500);
  }, [loadingPercent]);

  const triggerDevPlanRefetch = useCallback(
    (interval = 32000) => {
      console.log('triggerDevPlanRefetch called: ', isFetchingDevPlan.current);
      setTimeout(async () => {
        console.log(
          'triggerDevPlanRefetch Execution: isFetching: ',
          isFetchingDevPlan.current
        );
        if (isFetchingDevPlan.current) {
          console.log('triggerDevPlanRefetch: isFetching');
          let createdDevPlan;
          try {
            createdDevPlan = await getDevPlanApi(devPlan?.id as string);
          } catch (err) {
            handleErrorMsgs(err as Error);
          }
          if (createdDevPlan?.milestones?.length) {
            console.log(
              'triggerDevPlanRefetch.success:',
              createdDevPlan?.milestones?.length
            );
            isFetchingDevPlan.current = false;
            window.location.reload();
          } else if (!createdDevPlan?.milestones?.length) {
            console.log('triggerDevPlanRefetch: no plan found');
            triggerDevPlanRefetch(5000);
          }
        }
      }, interval);
    },
    [devPlan, isFetchingDevPlan]
  );

  const generateDevPlan = useCallback(() => {
    if (isGenerationLocked) {
      showAppModal({
        type: 'updateSubscription',
        payload: {
          email: user.email,
          source: 'devPlanEditor',
          destination: 'generateDevPlan',
        },
      });
      return;
    }
    if (devPlan) {
      form
        .validateFields([['requiredSpecialties'], ['chosenDocumentIds']])
        .then(
          (values) => {
            const input = {
              entityId: devPlan.id,
              entityType: ChatSessionTargetEntityType.DOCUMENT,
              entitySubType: DOCTYPE.DEVELOPMENT_PLAN,
              // id: documentId,
              // type: doc?.type,
              name: devPlan.name,
              description: devPlan?.description || '',
              projectId: devPlan.projectId as string,
              templateId: devPlan.templateDocumentId!,
              meta: {
                requiredSpecialties: values.requiredSpecialties.join(','),
                chosenDocumentIds: values.chosenDocumentIds.join(','),
              },
            };
            setTeamError(undefined);
            generateDocumentMutation.mutate(input);
            // in case Heroku kills HTTP request 30s after the first one, we need to trigger a refetch
            // TODO - Try out streaming API to avoid this
            isFetchingDevPlan.current = true;
            setLoadingPercent(0);
            updateLoadingPercent();
            triggerDevPlanRefetch();
          },
          () => {} // Just mark as invalid - nothing else to do
        );
    }
  }, [
    devPlan,
    form,
    generateDocumentMutation,
    triggerDevPlanRefetch,
    updateLoadingPercent,
    isGenerationLocked,
    showAppModal,
    user.email,
  ]);

  const onFormValuesChange = (changedValues: Partial<FormFields>) => {
    if (changedValues.teamMembers) {
      setTeamError(undefined);
    }
  };

  const handleNextStep = () => {
    if (currentStep < DevPlanSteps.length) {
      setStep((val) => val + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setStep((val) => val - 1);
    }
  };

  // todo - add spinner for loading and error msg display for errors
  if (isLoading || !devPlan || !devPlan?.epics || isFetchingDevPlan.current) {
    return (
      <>
        <Progress percent={loadingPercent} status="active" size="small" />
        <Skeleton active />
      </>
    );
  }
  if (isError) {
    return <>Error: {error}</>;
  }

  const breadcrumbItems = devPlan.project
    ? [
        {
          key: 'project',
          label: devPlan.project.name as string,
          link: `/projects/${devPlan.projectId}`,
        },
        {
          key: 'planning',
          label: 'Planner',
          link: `/projects/${devPlan.projectId}/planning`,
        },
        {
          key: devPlan.type,
          label: devPlan.name,
        },
      ]
    : [
        {
          key: 'documents',
          label: 'Documents',
          link: '/docs',
        },
        {
          key: devPlan.type,
          label: devPlan.name,
        },
      ];

  return (
    <Spin spinning={isDevPlanBeingPublished}>
      <Flex className="dev-plan-editor">
        <Flex vertical flex={1} style={{ overflow: 'auto' }}>
          <DocumentToolbar
            breadcrumbItems={breadcrumbItems}
            doc={devPlan}
            updateDoc={publishDevPlan}
            paragraphs={paragraphs}
          />
          <Form
            form={form}
            labelCol={{ span: 4 }}
            wrapperCol={{ flex: 1 }}
            autoComplete="off"
            size="large"
            disabled={
              updateDevPlanMutation.isLoading ||
              generateDocumentMutation.isLoading
            }
            initialValues={{
              ...devPlan,
              sprintStartDate: dayjs(devPlan.sprintStartDate, 'MM/DD/YYYY'),
            }}
            onValuesChange={onFormValuesChange}
          >
            <Flex className="form-row">
              <Form.Item
                label="Link Documents"
                name="chosenDocumentIds"
                rules={[
                  {
                    required: true,
                    message: 'Please select or add needed document',
                  },
                ]}
                tooltip="Please select or add needed document"
              >
                <DevPlanDocument
                  onChange={autoSaveDevPlan}
                  value={devPlan.chosenDocumentIds}
                  project={project}
                />
              </Form.Item>
              <Form.Item
                label="Roles Needed"
                name="requiredSpecialties"
                rules={[
                  {
                    required: true,
                    message: 'Please select or add roles needed',
                  },
                ]}
                tooltip="Add the roles needed in your team to complete this project"
              >
                <DevPlanSpecialtyInput
                  onChange={autoSaveDevPlan}
                  value={devPlan.requiredSpecialties}
                />
              </Form.Item>
            </Flex>

            {currentStep === 1 && (
              <Flex className="form-row">
                <Form.Item
                  label="Team members:"
                  name="teamMembers"
                  rules={[
                    { required: true, message: 'You must select team members' },
                  ]}
                  validateStatus={teamError ? 'error' : undefined}
                  help={teamError}
                  tooltip="You may invite your team, OR create virtual teammates by selecting from the dropdown menu"
                >
                  <DevPlanTeamInput
                    teamId={devPlan.project?.teamId}
                    value={devPlan.teamMembers}
                    onChange={autoSaveDevPlan}
                    placeholder="Invite team or Add virtual teammates by selecting from dropdown menu"
                  />
                </Form.Item>
                {/* <Form.Item
            label="Weeks per Sprint"
            name="weeksPerSprint"
            rules={[
              {
                required: true,
                message: 'You must specify the number of weeks per sprint',
              },
            ]}
          >
            <InputNumber />
          </Form.Item> */}
                <Form.Item
                  label="Start Date"
                  name="sprintStartDate"
                  rules={[{ required: true }]}
                >
                  <DatePicker
                    format="MM/DD/YYYY"
                    allowClear={false}
                    onChange={autoSaveDevPlan}
                    disabledDate={(current) =>
                      current && current < dayjs().endOf('day')
                    }
                  />
                </Form.Item>
              </Flex>
            )}
            <Form.Item style={{ marginTop: '10px' }}>
              <Steps
                type="navigation"
                current={currentStep}
                size="small"
                items={DevPlanSteps}
                onChange={setStep}
                className="devPlan-tabs"
              />
            </Form.Item>
            {currentStep === 0 && (
              <Form.List name="epics">
                {(epicFields, { add: addEpic, remove: removeEpic }) => (
                  <Flex
                    vertical
                    gap={2}
                    style={{
                      border: `solid 1px ${COLORS.COLOR_ANTD_BORDER}`,
                      borderRadius: '8px',
                      paddingBottom: '10px',
                      padding: '10px 15px',
                    }}
                  >
                    {epicFields.length === 0 && (
                      <Empty
                        description={
                          <div style={{ margin: '10px 0' }}>
                            <Typography.Title level={3}>
                              Tasks are not generated yet
                            </Typography.Title>
                            {!devPlan.projectId ? (
                              <Typography.Text>
                                Please first add the Roles and Document needed
                                above and press "Generate Task" button to
                                generate the tasks.
                              </Typography.Text>
                            ) : (
                              <Typography.Text>
                                Please first{' '}
                                <a href={`/${DocumentsPath}/${prdDoc?.id}`}>
                                  Publish a PRD
                                </a>{' '}
                                before creating task breakdown.{' '}
                              </Typography.Text>
                            )}
                          </div>
                        }
                      />
                    )}
                    <Collapse
                      className="accordion"
                      activeKey={epicActiveKeys}
                      style={{ border: 'none' }}
                      onChange={(e) => setEpicActiveKeys(e as string[])}
                      items={epicFields.map((epicField, epicIndex) => ({
                        key: epicIndex * 100,
                        headerClass: 'dev-plan-header epic-header',
                        label: (
                          <DevPlanEditorItemTitle
                            type="Epic"
                            index={epicField.name}
                            onDelete={removeThenSave(removeEpic, saveDevPlan)}
                            onSave={saveDevPlan}
                          />
                        ),
                        children: (
                          <Form.List name={[epicField.name, 'children']}>
                            {(
                              storyFields,
                              { add: addStory, remove: removeStory }
                            ) => (
                              <Flex vertical gap={2}>
                                <Collapse
                                  size="small"
                                  style={{ border: 'none' }}
                                  activeKey={storyActiveKeys}
                                  onChange={(e) =>
                                    setStoryActiveKeys(e as string[])
                                  }
                                  className="story-header"
                                  items={storyFields.map(
                                    (storyField, storyIndex) => ({
                                      key:
                                        epicIndex * 100 + storyIndex * 10 + '',
                                      headerClass: 'dev-plan-header',
                                      label: (
                                        <DevPlanEditorItemTitle
                                          type="Story"
                                          index={storyField.name}
                                          onDelete={removeThenSave(
                                            removeStory,
                                            saveDevPlan
                                          )}
                                          onSave={saveDevPlan}
                                        />
                                      ),
                                      children: (
                                        <Form.List
                                          name={[storyField.name, 'children']}
                                        >
                                          {(
                                            taskFields,
                                            { add: addTask, remove: removeTask }
                                          ) => (
                                            <Flex vertical gap={2}>
                                              {taskFields.map((taskField) => (
                                                <Card
                                                  size="small"
                                                  key={taskField.key}
                                                  style={{
                                                    backgroundColor:
                                                      token.colorFillAlter,
                                                    border: 'none',
                                                    borderRadius: '0',
                                                  }}
                                                  className="dev-plan-header task-card"
                                                >
                                                  <DevPlanEditorItemTitle
                                                    key={taskField.key}
                                                    type="Task"
                                                    index={taskField.name}
                                                    onDelete={removeThenSave(
                                                      removeTask,
                                                      saveDevPlan
                                                    )}
                                                    onSave={saveDevPlan}
                                                  />
                                                </Card>
                                              ))}
                                              <Space
                                                style={{
                                                  marginLeft: '18px',
                                                  marginBottom: '5px',
                                                }}
                                              >
                                                <Button
                                                  type="dashed"
                                                  icon={<PlusCircleOutlined />}
                                                  onClick={() =>
                                                    addTask(TaskTemplate)
                                                  }
                                                >
                                                  New Task
                                                </Button>
                                              </Space>
                                            </Flex>
                                          )}
                                        </Form.List>
                                      ),
                                    })
                                  )}
                                />
                                <Space style={{ marginBottom: '3px' }}>
                                  <Button
                                    type="dashed"
                                    icon={<PlusCircleOutlined />}
                                    onClick={() => addStory(StoryTemplate)}
                                  >
                                    New Story
                                  </Button>
                                </Space>
                              </Flex>
                            )}
                          </Form.List>
                        ),
                      }))}
                    />
                    {epicFields.length > 0 && (
                      <Space>
                        <Button
                          type="dashed"
                          icon={<PlusCircleOutlined />}
                          onClick={() => addEpic(EpicTemplate)}
                        >
                          New Epic
                        </Button>
                      </Space>
                    )}
                  </Flex>
                )}
              </Form.List>
            )}
            {currentStep === 1 && (
              <Form.List name="milestones">
                {(
                  milestoneFields,
                  { add: addMilestone, remove: removeMilestone }
                ) => (
                  <Flex
                    vertical
                    gap={2}
                    style={{
                      border: `solid 1px ${COLORS.COLOR_ANTD_BORDER}`,
                      borderRadius: '8px',
                      paddingBottom: '10px',
                      padding: '10px 15px',
                    }}
                  >
                    {milestoneFields.length === 0 && (
                      <Empty
                        description={
                          <div style={{ margin: '10px 0' }}>
                            <Typography.Title level={3}>
                              The Development Schedule is not created yet
                            </Typography.Title>
                            {devPlan.chosenDocumentIds.length &&
                            devPlan.requiredSpecialties.length ? (
                              <Typography.Text>
                                Please add team members and project start date
                                above before creating the dev schedule.
                              </Typography.Text>
                            ) : (
                              <Typography.Text>
                                Please first create the{' '}
                                <a
                                  href="/"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setStep(0);
                                  }}
                                >
                                  Task Breakdown
                                </a>{' '}
                                and review the work items
                              </Typography.Text>
                            )}
                          </div>
                        }
                      />
                    )}
                    <Collapse
                      style={{ border: 'none' }}
                      items={milestoneFields.map((milestoneField) => ({
                        key: milestoneField.key,
                        headerClass: 'dev-plan-header epic-header',
                        label: (
                          <Form.Item name={milestoneField.name}>
                            <DevPlanMilestoneTitle />
                          </Form.Item>
                        ),
                        children: (
                          <Form.List name={[milestoneField.name, 'children']}>
                            {(
                              sprintFields,
                              { add: addSprint, remove: removeSprint }
                            ) => (
                              <Collapse
                                style={{ border: 'none' }}
                                className="story-header"
                                items={sprintFields.map((sprintField) => ({
                                  key: sprintField.key,
                                  headerClass: 'dev-plan-header',
                                  label: (
                                    <Form.Item name={sprintField.name}>
                                      <DevPlanSprintTitle />
                                    </Form.Item>
                                  ),
                                  children: (
                                    <Form.List
                                      name={[sprintField.name, 'children']}
                                    >
                                      {(
                                        storyFields,
                                        { add: addStory, remove: removeStory }
                                      ) => (
                                        <Collapse
                                          style={{
                                            border: 'none',
                                            borderTop: `solid 1px ${COLORS.COLOR_ANTD_BORDER}`,
                                            marginLeft: '20px',
                                          }}
                                          items={storyFields.map(
                                            (storyField) => ({
                                              key: storyField.key,
                                              headerClass: 'dev-plan-header',
                                              label: (
                                                <Form.Item
                                                  name={storyField.name}
                                                >
                                                  <DevPlanStoryTitle />
                                                </Form.Item>
                                              ),
                                              children: (
                                                <Form.List
                                                  name={[
                                                    storyField.name,
                                                    'children',
                                                  ]}
                                                >
                                                  {(
                                                    taskFields,
                                                    {
                                                      add: addTask,
                                                      remove: removeTask,
                                                    }
                                                  ) => (
                                                    <Flex vertical gap={2}>
                                                      {taskFields.map(
                                                        (taskField) => (
                                                          <Card
                                                            size="small"
                                                            key={taskField.key}
                                                            style={{
                                                              backgroundColor:
                                                                token.colorFillAlter,
                                                              border: 'none',
                                                              borderRadius: '0',
                                                            }}
                                                            className="dev-plan-header task-card"
                                                          >
                                                            <DevPlanEditorItemTitle
                                                              key={
                                                                taskField.key
                                                              }
                                                              type="Task"
                                                              index={
                                                                taskField.name
                                                              }
                                                              onDelete={removeThenSave(
                                                                removeTask,
                                                                saveDevPlanInMilestone
                                                              )}
                                                              onSave={
                                                                saveDevPlanInMilestone
                                                              }
                                                            />
                                                          </Card>
                                                        )
                                                      )}
                                                    </Flex>
                                                  )}
                                                </Form.List>
                                              ),
                                            })
                                          )}
                                        />
                                      )}
                                    </Form.List>
                                  ),
                                }))}
                              />
                            )}
                          </Form.List>
                        ),
                      }))}
                    />
                  </Flex>
                )}
              </Form.List>
            )}
            <Form.Item>
              <Flex
                justify="center"
                align="center"
                style={{ marginTop: '20px' }}
              >
                <Flex
                  justify="center"
                  gap={20}
                  align="flex-start"
                  style={{ width: 300 }}
                >
                  {currentStep === 0 &&
                    (devPlan.epics.length ? (
                      <Popconfirm
                        title="Warning"
                        className="generate-btn-pop"
                        description={
                          <Space.Compact direction="vertical">
                            <Typography.Text>
                              This will overwrite the current dev plan,
                              including any current work items and status
                            </Typography.Text>
                            <Typography.Text>
                              Do you want to continue?
                            </Typography.Text>
                          </Space.Compact>
                        }
                        onConfirm={generateDevPlan}
                      >
                        <Flex align="center">
                          {isGenerationLocked && (
                            <Tooltip title="Insufficient credits. Please buy more credits or upgrade.">
                              <InfoCircleOutlined style={{ color: 'orange' }} />
                              &nbsp;&nbsp;
                            </Tooltip>
                          )}
                          <Button
                            type="primary"
                            block
                            style={{ flex: 1, padding: '0' }}
                            disabled={isGenerationLocked}
                          >
                            Generate Task
                          </Button>
                        </Flex>
                      </Popconfirm>
                    ) : (
                      <Button
                        type="primary"
                        style={{ flex: 1, padding: '0' }}
                        onClick={generateDevPlan}
                      >
                        Generate Task
                      </Button>
                    ))}
                  {currentStep !== 0 && (
                    <Button
                      type="primary"
                      style={{ flex: 1, padding: '0' }}
                      onClick={handlePrevStep}
                    >
                      Previous{' '}
                    </Button>
                  )}
                  {currentStep !== DevPlanSteps.length - 1 && (
                    <Button
                      type="primary"
                      style={{ flex: 1, padding: '0' }}
                      onClick={handleNextStep}
                      disabled={!devPlan.epics.length}
                    >
                      Next
                    </Button>
                  )}
                  {currentStep === DevPlanSteps.length - 1 && (
                    <Button
                      type="primary"
                      style={{ flex: 1, padding: '0' }}
                      disabled={!devPlan.milestones?.length}
                      onClick={publishDevPlan}
                    >
                      Publish Dev Plan
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Form.Item>
          </Form>
        </Flex>
        {/* <EditorSidebar form={form} document={devPlan} /> */}
      </Flex>
    </Spin>
  );
}
