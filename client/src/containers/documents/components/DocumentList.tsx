import { useEffect, useState } from 'react';
import { DOCTYPE } from '@prisma/client';
import { Flex, Space, Table, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useNavigate } from 'react-router';

import { UserAvatar } from '../../../common/components/UserAvatar';
import { ReactComponent as DocumentIcon } from '../../../common/icons/document-icon.svg';
import { COLORS } from '../../../lib/constants';
import { DocumentDropdownOperMenu } from '../../layout/components/DocumentDropdownOperMenu';
import { DevPlansPath, DocumentsPath, ProjectsPath } from '../../nav/paths';
import {
  DocumentOutput,
  DocumentTypeNameMapping,
} from '../types/documentTypes';

type DocumentListProps = Readonly<{
  documents: DocumentOutput[];
}>;

export default function DocumentList({ documents }: DocumentListProps) {
  const navigate = useNavigate();
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  );

  let cols = getDocumentListTableColumns(navigate);
  let data = getDocumentListData(documents);

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 575) {
        setScreenSize('mobile');
      } else if (width <= 1023) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  if (screenSize === 'tablet') {
    cols = cols.filter((col) =>
      ['name', 'type', 'project', 'action'].includes(col.key)
    );
  } else if (screenSize === 'mobile') {
    cols = cols.filter((col) => ['name', 'action'].includes(col.key));
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Table className="document-list" columns={cols} dataSource={data} />
    </Space>
  );
}

function getDocumentListTableColumns(navigate: (id: string) => void) {
  const documentColumns = [
    {
      title: 'Name',
      key: 'name',
      width: 220,
      ellipsis: {
        showTitle: false,
      },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (record: any) => {
        return (
          <Flex
            style={{ alignItems: 'center', cursor: 'pointer', width: '100%' }}
            onClick={() => {
              if (record.type !== DOCTYPE.DEVELOPMENT_PLAN) {
                navigate(`/${DocumentsPath}/${record.id}`);
              } else {
                navigate(`/${DevPlansPath}/${record.id}`);
              }
            }}
          >
            <div>
              <DocumentIcon
                style={{ fontSize: '20px', color: COLORS.PRIMARY }}
              />
            </div>
            <Tooltip placement="topLeft" title={record.name}>
              <div
                className="link-button"
                style={{
                  marginLeft: '6px',
                  marginTop: '-6px',
                  width: 'calc(100% - 28px)',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {record.name}
              </div>
            </Tooltip>
          </Flex>
        );
      },
    },
    {
      title: 'Type',
      key: 'type',
      ellipsis: true,
      sorter: (a: any, b: any) => a.type.localeCompare(b.type),
      render: (rec: any) => {
        return (
          <Typography.Text>
            {DocumentTypeNameMapping[rec.type as string].name}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Project',
      key: 'project',
      ellipsis: true,
      sorter: (a: any, b: any) =>
        a.project?.name.localeCompare(b.project?.name),
      render: (rec: any) => {
        return rec.project?.id ? (
          <Typography.Text
            className="link-button"
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.project?.id}`);
            }}
          >
            {rec.project?.name}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" style={{ padding: '4px 15px' }}>
            N.A.
          </Typography.Text>
        );
      },
    },
    {
      title: 'Owner',
      width: 80,
      key: 'owner',
      sorter: (a: any, b: any) =>
        a.creator?.username.localeCompare(b.creator?.username),
      render: (rec: any) => {
        return (
          <Space
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.id}`);
            }}
          >
            <Tooltip title={rec.creator?.username}>
              <div>
                <UserAvatar user={rec.creator} />
              </div>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Access',
      key: 'access',
      width: 105,
      ellipsis: true,
      sorter: (a: any, b: any) => a.access.localeCompare(b.access),
      render: (rec: any) => {
        return <Typography.Text>{_.capitalize(rec.access)}</Typography.Text>;
      },
    },
    {
      title: 'Created At',
      key: 'createdAt',
      ellipsis: true,
      sorter: (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      render: (rec: any) => {
        return (
          <Typography.Text>
            {dayjs(rec.createdAt).format('MM/DD/YYYY')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (rec: any) => {
        return <DocumentDropdownOperMenu document={rec} />;
      },
    },
  ];

  return documentColumns;
}

function getDocumentListData(documents: DocumentOutput[]) {
  let data: Array<any> = [];
  documents.forEach((doc, index) => {
    data.push({
      ...doc,
      id: doc.id,
      key: index,
      name: doc.name,
      createdAt: doc.createdAt,
      type: doc.type,
      project: doc.project,
      status: doc.status,
      access: doc.access,
    });
  });
  data.sort((a, b) => {
    return dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix();
  });
  return data;
}
