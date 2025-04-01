import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Spin } from 'antd';

import { useAppModal } from '../../../common/components/AppModal';
import { RollupSection } from '../../../common/components/RollupSection';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { ReactComponent as EmptyIcon } from '../../../common/icons/empty-icon.svg';
import { COLORS } from '../../../lib/constants';
import { useUserDocuments } from '../hooks/useUserDocuments';
import DocumentList from './DocumentList';

const DocumentHome: React.FC = () => {
  const { user } = useCurrentUser();
  const { showAppModal } = useAppModal();
  const { data: documents, isLoading } = useUserDocuments(user.id);

  return (
    <Spin spinning={isLoading}>
      <Flex vertical>
        <RollupSection title="Current Documents" actions={[]}>
          {documents?.length ? (
            <DocumentList documents={documents || []} />
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
                <div style={{ marginTop: '10px' }}>No documents available</div>
              </div>
              <Button
                id="add-project-btn"
                type="primary"
                icon={<PlusOutlined />}
                size={'middle'}
                onClick={() => showAppModal({ type: 'addDocument' })}
              >
                New document
              </Button>
            </Flex>
          )}
          <></>
        </RollupSection>
      </Flex>
    </Spin>
  );
};

export default DocumentHome;
