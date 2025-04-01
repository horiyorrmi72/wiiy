import { useCallback } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Radio, Space, Tabs, Tooltip, Typography } from 'antd';
import {
  Outlet,
  redirect,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router';

import { ProjectOutput } from '../../../../../shared/types';
import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { useProjectQuery } from '../../../common/hooks/useProjectsQuery';
import { GlobalStoreInst } from '../../../common/util/globalStore';
import trackEvent from '../../../trackingClient';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import { BuildingPath, PlanningPath, ReportingPath } from '../../nav/paths';
import { useBoardFilterMode } from '../hooks/useBoardFilterMode';
import ProjectDropdownMenu from './ProjectDropdownMenu';

const TabItems = [
  { key: PlanningPath, label: 'Planner' },
  { key: BuildingPath, label: 'Builder' },
  { key: ReportingPath, label: 'Reporter' },
];

function useProjectIdParam() {
  const { id } = useParams();
  if (!id) {
    throw new Error('Please select a project');
  }
  return id;
}

function useActiveTabKey(): string {
  const location = useLocation();
  const pathComponents = location.pathname.split('/');
  // Note: the pathname starts with a / so the first pathComponent will be empty
  return pathComponents.length >= 4 ? pathComponents[3] : PlanningPath;
}

type ContextType = Readonly<{
  project: ProjectOutput;
  filterMode: string;
}>;
export function useProject() {
  return useOutletContext<ContextType>();
}

export function ProjectIndex() {
  // TODO - look at the project visa useProject and decide which tab to show first

  return redirect(PlanningPath);
}

export function Project() {
  const projectId = useProjectIdParam();
  const navigate = useNavigate();
  const activeKey = useActiveTabKey();
  const [boardMode, setBoardMode] = useBoardFilterMode();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const { showAppModal } = useAppModal();
  // const isLocked = isFeatureLocked(
  //   subscriptionStatus as string,
  //   subscriptionTier as string
  // );

  const isLocked = false; // disable paywall gating for now

  const onTabChange = useCallback(
    (key: string) => {
      console.log('Navigating to ' + key);
      navigate(key);
    },
    [navigate]
  );

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useProjectQuery(projectId);

  if (isError) {
    throw error;
  }

  if (isLoading || !project) {
    return <LoadingScreen />;
  }

  GlobalStoreInst.set('activeProject', project);

  let toggles = (
    <Radio.Group
      disabled={isLocked}
      onChange={(e) => {
        if (isLocked && e.target.value === 'kanban') {
          showAppModal({
            type: 'updateSubscription',
            payload: {
              email: user.email,
              source: 'builderWorkPlanMode',
              destination: 'SrumToggleKandan',
            },
          });
        } else {
          setBoardMode(e.target.value);
          // track event
          trackEvent('toggleKanbanScrum', {
            distinct_id: user.email,
            payload: JSON.stringify({
              project: project.name,
              mode: e.target.value,
            }),
          });
        }
      }}
      defaultValue={boardMode}
    >
      <Radio.Button value="sprint">Scrum</Radio.Button>
      <Radio.Button value="kanban">
        {isLocked && (
          <Tooltip title="Upgrade to Performance plan for access">
            <InfoCircleOutlined style={{ color: 'orange' }} />
          </Tooltip>
        )}
        &nbsp; Kanban
      </Radio.Button>
      {/* <Radio.Button value="milestone">Milestone</Radio.Button> */}
    </Radio.Group>
  );

  return (
    <Flex className="page-container" vertical>
      <Space
        align="center"
        style={{
          marginBottom: '0.5em',
        }}
      >
        <Typography.Title level={4} className="main-heading">
          Project: {project.name}
        </Typography.Title>
        <ProjectDropdownMenu project={project} />
      </Space>
      <Tabs
        id="project-tabs"
        className="project-nav"
        onChange={onTabChange}
        activeKey={activeKey}
        type="card"
        items={TabItems}
        tabBarExtraContent={activeKey === BuildingPath && toggles}
      />
      <Outlet
        context={{ project, filterMode: boardMode } satisfies ContextType}
      />
    </Flex>
  );
}
