import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';

import { useAppModal } from '../../../common/components/AppModal';
import { RollupSection } from '../../../common/components/RollupSection';
import { ReactComponent as EmptyIcon } from '../../../common/icons/empty-icon.svg';
import { COLORS } from '../../../lib/constants';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import ProjectsList from '../../project/components/ProjectsList';
import { useOrganizationWithContents } from '../hooks/useOrganization';

export function OrganizationHome() {
  const { showAppModal } = useAppModal();
  const {
    data: organization,
    isLoading,
    isError,
    error,
  } = useOrganizationWithContents();

  if (isError) {
    throw error;
  }

  if (isLoading || !organization) {
    return <LoadingScreen />;
  }

  return (
    <Flex className="page-container" vertical>
      <div>
        <RollupSection title="Current Projects" actions={[]}>
          {organization?.projects?.length ? (
            <ProjectsList projects={organization.projects} />
          ) : (
            <Flex
              vertical
              style={{
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '15px',
                height: '100%',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  color: COLORS.GRAY,
                  marginBottom: '20px',
                }}
              >
                <EmptyIcon />
                <div style={{ marginTop: '10px' }}>No projects available</div>
              </div>
              <Button
                id="add-project-btn"
                type="primary"
                icon={<PlusOutlined />}
                size={'middle'}
                onClick={() => showAppModal({ type: 'addProject' })}
              >
                New project
              </Button>
            </Flex>
          )}
          <></>
        </RollupSection>
      </div>
    </Flex>
  );
}
