import { Flex, Typography } from 'antd';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import applause from '../../../common/icons/applause.png';
import FTUETour from '../../myIssues/components/FTUE';
import { BrainstormCard } from './BrainstormCard';
import { DocumentCard } from './DocumentCard';
import { GenerateTaskCard } from './GenerateTaskCard';
import { ProjectCard } from './ProjectCard';

import './Home.scss';

export function Home() {
  const { user, organization } = useCurrentUser();

  return (
    <Flex vertical className="home-container">
      <Flex vertical className="home-content">
        <Flex
          vertical
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: '30px 0',
            maxWidth: '800px',
          }}
        >
          {!(user.firstname?.trim() && organization.website?.trim()) && (
            <FTUETour openTour={true} />
          )}
          <Typography.Text className="welcome">
            <img alt="" src={applause} />
            Welcome to Omniflow
          </Typography.Text>
          <div className="welcome-content">
            Omniflow supercharges your entire product development lifecycle
            through AI{' '}
          </div>
        </Flex>
        <Flex className="home-cards">
          <BrainstormCard />
          <DocumentCard />
          <GenerateTaskCard />
          <ProjectCard />
        </Flex>
      </Flex>
    </Flex>
  );
}
