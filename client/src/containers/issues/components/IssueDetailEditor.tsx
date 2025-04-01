import { useCallback } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { Button, Flex, Layout, Spin, theme } from 'antd';
import { Content } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';

import { useComments } from '../hooks/useComments';
import { useIssue, useIssueChangeHistory } from '../hooks/useIssue';
import IssueDetailEditorContent from './IssueDetailEditorContent';
import { IssueDetailEditorSide } from './IssueDetailEditorSide';

import './IssueDetailEditor.scss';

export default function IssueDetailEditor() {
  const { shortName } = useParams();
  const { data: issue, isLoading, isError, error } = useIssue(shortName);
  const {
    data: comments,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    error: commentsError,
  } = useComments(shortName);
  const { data: issueChangeHistory } = useIssueChangeHistory(shortName);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <Spin spinning={isLoading}>
      {issue && (
        <Layout
          className="issue-editor-layout"
          style={{ backgroundColor: colorBgContainer, gap: '24px' }}
        >
          <Content className="issue-detail-editor">
            <Button type="link" onClick={goBack}>
              <Flex align="center">
                <LeftOutlined />
                <span>Back</span>
              </Flex>
            </Button>
            <IssueDetailEditorContent
              issue={issue}
              comments={comments}
              issueChangeHistory={issueChangeHistory || undefined}
            />
          </Content>
          <Sider
            className="issue-editor-form"
            width={'380px'}
            style={{
              background: colorBgContainer,
            }}
          >
            <IssueDetailEditorSide issue={issue} />
          </Sider>
        </Layout>
      )}
    </Spin>
  );
}
