import { Button, Divider, Form, Table, Typography } from 'antd';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import useUserProfileQuery from '../../profile/hooks/useUserProfileQuery';
import { fetchJiraRedirectUrl } from '../api/jiraApi';
import useJiraResources from '../hooks/useJiraResources';
import { JiraResource, JiraUserProfile } from '../types/jiraTypes';

import './AdminHome.scss';

export default function AdminHome() {
  const { user } = useCurrentUser();
  const {
    data: existingProfile,
    isLoading,
    isSuccess,
  } = useUserProfileQuery(user.id);

  const { data: jiraResources, isLoading: jiraLoading } = useJiraResources();

  if (isLoading || jiraLoading) {
    return <LoadingScreen />;
  }

  if (existingProfile?.isAdmin === false) {
    return (
      <div style={{ color: 'red' }}>
        <h1>Unauthorized</h1>
        <p>You are not authorized to view this page.</p>
      </div>
    );
  }

  async function redirectToJiraAuthorization() {
    let url = await fetchJiraRedirectUrl();
    // Redirect to Jira's website for authorization.
    window.location.href = url;
  }

  const columnsForJiraResourcesTable = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Url',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (link: string) => (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {link}
        </a>
      ),
    },
  ];

  function getJiraUserProfileData(metaData: any): JiraUserProfile | null {
    return metaData?.jira_profile || null;
  }

  const jiraUserProfileColumns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      ellipsis: true,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
    },
  ];

  const jiraUserProfile = getJiraUserProfileData(existingProfile?.meta);

  return (
    <div className="admin-form">
      <Form
        name="OrganizationAdmin"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        autoComplete="off"
        initialValues={existingProfile}
        disabled={isLoading || !isSuccess}
      >
        <Divider plain style={{ color: 'grey' }}>
          JIRA Intergration
        </Divider>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="table-width">
            <Typography.Title level={4}>
              Account Authorization:
            </Typography.Title>
          </div>
        </div>
        <Form.Item
          label="Jira Id"
          name="jira"
          tooltip="Link your JIRA account to your profile."
          style={{ textAlign: 'center' }}
          className="existing-profile-row"
        >
          {existingProfile && !existingProfile.jiraEnabled && (
            <Button
              type="primary"
              onClick={async () => {
                await redirectToJiraAuthorization();
              }}
            >
              Connect with JIRA
            </Button>
          )}
          {existingProfile && existingProfile.jiraEnabled && (
            <span style={{ fontWeight: 'bold', color: 'green' }}>
              JIRA connected
            </span>
          )}
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="table-width">
            <Typography.Title level={4}>Jira User Profile:</Typography.Title>
            {jiraUserProfile && (
              <Table
                columns={jiraUserProfileColumns}
                dataSource={Object.keys(jiraUserProfile).map(
                  (key: string, index: number) => {
                    if (key === 'picture') {
                      return {
                        key: key + index,
                        value: (
                          <img
                            src={
                              jiraUserProfile[
                                key as keyof typeof jiraUserProfile
                              ] as string | undefined
                            }
                            alt=""
                            style={{ width: 64, height: 64 }}
                          />
                        ),
                      };
                    } else {
                      return {
                        key: key + index,
                        value: jiraUserProfile[
                          key as keyof typeof jiraUserProfile
                        ] as string | undefined,
                      };
                    }
                  }
                )}
                pagination={{ pageSize: 5 }}
              />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="table-width">
            <Typography.Title level={4}>Jira Resources:</Typography.Title>
            {jiraResources && (
              <Table
                dataSource={jiraResources.map(
                  (resource: JiraResource, index: number) => ({
                    ...resource,
                    key: index,
                  })
                )}
                columns={columnsForJiraResourcesTable}
              />
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}
