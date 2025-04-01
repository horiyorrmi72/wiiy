import { PlusOutlined } from '@ant-design/icons';
import { DOCTYPE } from '@prisma/client';
import { Button, Flex, Tag } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import { ReactComponent as DocumentIcon } from '../../../common/icons/document-icon.svg';
import { ReactComponent as EmptyIcon } from '../../../common/icons/empty-icon.svg';
import { COLORS } from '../../../lib/constants';
import {
  DocumentOutput,
  DocumentTypeNameMapping,
} from '../../documents/types/documentTypes';
import { DevPlansPath, DocumentsPath } from '../../nav/paths';

export function DocTable({ docs }: { docs: DocumentOutput[] }) {
  const navigate = useNavigate();

  return docs
    .sort((a, b) => {
      return dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix();
    })
    .slice(0, Math.min(6, docs.length))
    .map((doc, index) => (
      <Flex className="doc-item" key={index}>
        <div>
          <DocumentIcon style={{ fontSize: '20px', color: COLORS.PRIMARY }} />
        </div>
        <div
          className="link-button"
          style={{
            marginLeft: '6px',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
          onClick={() => {
            if (doc.type !== DOCTYPE.DEVELOPMENT_PLAN) {
              navigate(`/${DocumentsPath}/${doc.id}`);
            } else {
              navigate(`/${DevPlansPath}/${doc.id}`);
            }
          }}
        >
          {doc.name} &nbsp;
          <Tag>{DocumentTypeNameMapping[doc.type].name}</Tag>
        </div>
      </Flex>
    ));
}

export function EmptyDoc() {
  const { showAppModal } = useAppModal();
  return (
    <Flex
      style={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        border: `solid 1px ${COLORS.LIGHT_GRAY}`,
        borderRadius: '15px',
        marginBottom: '10px',
      }}
    >
      <Flex
        vertical
        style={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '15px',
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
    </Flex>
  );
}
