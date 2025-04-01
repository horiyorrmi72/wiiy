import { IssueType } from '@prisma/client';
import { Flex, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { COLORS } from '../../../lib/constants';
import { useUserChatSession } from '../../chats/hooks/useChat';
import { useUserDocuments } from '../../documents/hooks/useUserDocuments';
import { useMyIssues } from '../../issues/hooks/useMyIssues';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import { useIssuesTutorial } from '../../project/components/tutorials';
import { useUpdateIssueMutation } from '../../project/hooks/useIssueMutation';
import { DocTable, EmptyDoc } from './DocTable';
import { EmptyIdea, IdeaTable } from './IdeaTable';
import { EmptyProject, IssuesTable } from './IssueTable';
import UserGuideCard from './UserGuideCard';

import 'driver.js/dist/driver.css';
import './MyIssues.scss';

export default function MyIssues() {
  const { user } = useCurrentUser();
  useIssuesTutorial(user);

  const { data: documents, isLoading: isLoadingDoc } = useUserDocuments(
    user.id
  );
  const { data: ideas, isLoading: isLoadingIdeas } = useUserChatSession(
    user.id
  );

  const { data, isLoading, isError, error } = useMyIssues();
  const navigate = useNavigate();
  let issues = data?.filter(
    (issue) =>
      issue.type === IssueType.TASK || issue.type === IssueType.BUILDABLE
  );

  const updateIssueMutation = useUpdateIssueMutation({
    onSuccess: () => {
      console.log('updateIssueMutation.success');
    },
    onError: (e) => {
      console.error('updateIssueMutation.error:', e);
    },
  });

  if (isLoading || isLoadingDoc) {
    return <LoadingScreen />;
  }
  if (isError) {
    return <>Error: {error}</>;
  }

  if (!user) {
    console.log(
      "in containers.myissues.components.MyIssues: user doesn't exist"
    );
    navigate('/signin');
    return;
  }

  return (
    <>
      <Flex className="my-issues" vertical>
        <Flex vertical>
          <Typography.Title
            level={4}
            style={{ marginBottom: '8px' }}
            className="main-heading"
          >
            Hi, {user.firstname?.trim()}
          </Typography.Title>
          <Flex
            style={{
              fontSize: '12px',
              paddingLeft: '2px',
              color: COLORS.GRAY,
            }}
          >
            Please see below for your tasks, documents or other activities.
          </Flex>
        </Flex>
        <Flex
          style={{ flexGrow: 1, marginTop: '20px', columnGap: '20px' }}
          className="main-content"
        >
          {issues?.length ? (
            <div style={{ flexGrow: 1, overflowX: 'hidden' }}>
              <div className="user-guide-card-mobile">
                <UserGuideCard />
              </div>
              <div
                style={{
                  border: `solid 1px ${COLORS.LIGHT_GRAY}`,
                  borderRadius: '15px',
                  padding: '10px',
                  maxHeight: 'calc(100vh - 122px)',
                  overflowY: 'auto',
                }}
              >
                <IssuesTable issues={issues} />
              </div>
            </div>
          ) : (
            <EmptyProject />
          )}
          <Flex
            vertical
            style={{
              minWidth: '45%',
              overflow: 'hidden',
            }}
          >
            <div className="user-guide-card">
              <UserGuideCard />
            </div>
            <div
              style={{
                fontSize: '16px',
                marginTop: '20px',
                marginBottom: '5px',
              }}
            >
              Recent docs
            </div>
            {documents?.length ? (
              <div
                style={{
                  border: `solid 1px ${COLORS.LIGHT_GRAY}`,
                  borderRadius: '15px',
                  padding: '8px',
                  overflowY: 'auto',
                }}
              >
                <DocTable docs={documents} />
              </div>
            ) : (
              <EmptyDoc />
            )}
            <div
              style={{
                fontSize: '16px',
                marginTop: '20px',
                marginBottom: '5px',
              }}
            >
              Recent Ideas
            </div>
            {ideas?.length ? (
              <div
                style={{
                  border: `solid 1px ${COLORS.LIGHT_GRAY}`,
                  borderRadius: '15px',
                  padding: '8px',
                  overflowY: 'auto',
                }}
              >
                <IdeaTable ideas={ideas} />
              </div>
            ) : (
              <EmptyIdea />
            )}
          </Flex>
        </Flex>
      </Flex>
    </>
  );
}
