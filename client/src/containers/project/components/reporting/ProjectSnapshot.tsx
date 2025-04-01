import {
  Badge,
  Card,
  Descriptions,
  Empty,
  Flex,
  List,
  Progress,
  Result,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import GaugeChart from 'react-gauge-chart';

import { useAppModal } from '../../../../common/components/AppModal';
import { useCurrentUser } from '../../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../../common/util/app';
import { SUBSCRIPTIONTIERS } from '../../../../lib/constants';
import {
  computeSnapshotData,
  getPassedTimeTooltip,
  getRiskTooltip,
} from '../../hooks/snapshotData';
import { RiskLevel } from '../../types/projectReportingTypes';
import { useProject } from '../Project';
import { ProjectRiskScore } from './ProjectRiskScore';

export function ProjectSnapshot() {
  const { project } = useProject();
  let { overall, planning, building } = computeSnapshotData(
    project,
    project.buildables,
    project.milestones
  );
  console.log('in containers.project.components.ProjectReporting:', project);

  const { showAppModal } = useAppModal();
  let { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  let isPageLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string,
    SUBSCRIPTIONTIERS.BUSINESS
  );
  if (isPageLocked) {
    return (
      <Empty description="">
        Please upgrade to &nbsp;
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            showAppModal({
              type: 'updateSubscription',
              payload: {
                email: user.email,
                source: 'secondaryMenu',
                destination: 'ReporterPage',
              },
            });
            console.log('Upgrade to Scale Plan');
            return;
          }}
        >
          Scale Plan
        </a>
        &nbsp; to access this feature.
      </Empty>
    );
  }

  const { Text } = Typography;
  return (
    <div className="project-reporting">
      <section className="project-progress">
        <Card
          title="Overall Project"
          bordered={false}
          className="app-card"
          style={{ marginTop: '10px' }}
        >
          <ProjectRiskScore project={project} data={overall} />
        </Card>
        <Card title="Planning" bordered={false} className="app-card">
          <Flex wrap="wrap" gap="small" justify="space-around">
            {planning.map((p, key) => (
              <Flex
                justify="space-around"
                style={{ flexWrap: 'wrap' }}
                key={key}
              >
                <Flex vertical style={{ width: '160px' }}>
                  <Text ellipsis={true} type="secondary">
                    {'Risk Score - ' + p.name}
                  </Text>
                  <Tooltip title={getRiskTooltip(p)}>
                    <GaugeChart
                      style={{ width: '90%' }}
                      nrOfLevels={20}
                      arcsLength={[
                        RiskLevel.LOW,
                        RiskLevel.MEDIUM,
                        RiskLevel.HIGH,
                      ]}
                      colors={['#5BE12C', '#F5CD19', '#EA4228']}
                      textColor="black"
                      needleColor="lightgray"
                      percent={p.metrics.riskScore as number}
                      arcWidth={0.1}
                      arcPadding={0.02}
                    />
                  </Tooltip>
                </Flex>
                <Flex
                  vertical
                  justify="space-between"
                  style={{ flex: 2, maxWidth: '360px' }}
                >
                  <Descriptions className="project" title=" " />
                  <Flex>
                    <Tooltip title={getPassedTimeTooltip(p)}>
                      <Progress
                        percent={p.metrics.pastTimePercentage as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Time Used
                    </Text>
                  </Flex>
                  <Flex>
                    <Tooltip title={p.metrics.progress + '% of work completed'}>
                      <Progress
                        percent={p.metrics.progress as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Work Progress
                    </Text>
                  </Flex>
                  <Flex>
                    <Tooltip
                      title={
                        'current velocity is ' +
                        p.metrics.velocity +
                        '% of expected velocity'
                      }
                    >
                      <Progress
                        percent={p.metrics.velocity as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Velocity
                    </Text>
                  </Flex>
                </Flex>
                {/* <Flex vertical style={{ flex: 2, maxWidth: '500px' }}>
                <Descriptions className="project-overvew" title="Insights" />
                <List
                  size="small"
                  className="epic-list"
                  dataSource={p.insights}
                  renderItem={(item: any) => {
                    let badgeColor = 'gray';
                    return (
                      <List.Item>
                        <Badge color={badgeColor} text={item}></Badge>
                      </List.Item>
                    );
                  }}
                />
              </Flex> */}
              </Flex>
            ))}
          </Flex>
          {/* <div>
            <Descriptions className="project-overvew" title="Insights" />
            <List
              size="small"
              className="epic-list"
              dataSource={['test abc', 'test 123', 'test 456']}
              renderItem={(item: any) => {
                let badgeColor = 'gray';
                return (
                  <List.Item>
                    <Badge color={badgeColor} text={item}></Badge>
                  </List.Item>
                );
              }}
            />
          </div> */}
        </Card>
        <Card title="Building" bordered={false} className="app-card">
          {building.length === 0 ? (
            overall.stage === 'Planning' ? (
              <Empty description="Please first publish PRD and Development Plan from Planning" />
            ) : (
              <Result
                status="success"
                title="Milestones completed"
                subTitle="Good job. You have completed all tasks for milestones in Builder."
              />
            )
          ) : (
            building.map((p, key) => (
              <Flex
                justify="space-around"
                key={key}
                style={{ marginBottom: '10px', flexWrap: 'wrap' }}
              >
                <Flex vertical style={{ width: '160px' }}>
                  <Text ellipsis={true} type="secondary">
                    {'Risk Score - ' + p.name}
                  </Text>
                  <Tooltip title={getRiskTooltip(p)}>
                    {/* <Progress
                    type="circle"
                    percent={p.metrics.riskScore as number}
                    strokeColor={conicColors}
                    size={80}
                  /> */}
                    <GaugeChart
                      style={{ width: '90%' }}
                      nrOfLevels={20}
                      arcsLength={[
                        RiskLevel.LOW,
                        RiskLevel.MEDIUM,
                        RiskLevel.HIGH,
                      ]}
                      colors={['#5BE12C', '#F5CD19', '#EA4228']}
                      textColor="black"
                      needleColor="lightgray"
                      percent={p.metrics.riskScore as number}
                      arcWidth={0.1}
                      arcPadding={0.02}
                    />
                  </Tooltip>
                </Flex>
                <Flex
                  vertical
                  justify="space-between"
                  className="metric-block"
                  style={{ minWidth: '260px' }}
                >
                  <Descriptions className="project" title=" " />
                  <Flex>
                    <Tooltip
                      title={
                        p.metrics.pastTime +
                        ' out of ' +
                        p.metrics.totalTime +
                        ' days, due by ' +
                        dayjs(p.metrics.plannedEndDate).format('MM/DD/YYYY')
                      }
                    >
                      <Progress
                        percent={p.metrics.pastTimePercentage as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Time Used
                    </Text>
                  </Flex>
                  <Flex>
                    <Tooltip title={p.metrics.progress + '% of work completed'}>
                      <Progress
                        percent={p.metrics.progress as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Work Progress
                    </Text>
                  </Flex>
                  <Flex>
                    <Tooltip
                      title={p.metrics.velocity + '% of expected velocity'}
                    >
                      <Progress
                        percent={p.metrics.velocity as number}
                        size="small"
                      />
                    </Tooltip>
                    <Text type="secondary" className="metric-label">
                      Dev Velocity
                    </Text>
                  </Flex>
                </Flex>
                <Flex vertical style={{ flex: 2, minWidth: '260px' }}>
                  <Descriptions className="project" title="Insights" />
                  <List
                    size="small"
                    className="epic-list"
                    dataSource={p.insights}
                    renderItem={(item: any) => {
                      return (
                        <List.Item>
                          <Badge color="gray" text={item}></Badge>
                        </List.Item>
                      );
                    }}
                  />
                </Flex>
              </Flex>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}
