import { useEffect, useState } from 'react';
import { DOCTYPE } from '@prisma/client';
import { Spin, Table, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useNavigate } from 'react-router';

import { DocumentTypeNameMapping } from '../../documents/types/documentTypes';
import {
  DevPlansPath,
  DocumentsPath,
  IdeasPath,
  TemplateDocumentPath,
} from '../../nav/paths';
import { useCredits } from '../hooks/useCredits';

export default function CreditList() {
  console.log('in containers.setting.components.CreditList');
  const navigate = useNavigate();
  const { data, isLoading } = useCredits();
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  );

  const credits = data
    ?.map((it) => {
      return { ...it, key: it.id };
    })
    .sort((a, b) => {
      return dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix();
    });

  let cols = getCreditListTableColumns(navigate);

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
      ['action', 'amount', 'status', 'docId'].includes(col.key)
    );
  } else if (screenSize === 'mobile') {
    cols = cols.filter((col) => ['action', 'docId'].includes(col.key));
  }

  return (
    <Spin spinning={isLoading}>
      <Table className="credit-list" columns={cols} dataSource={credits} />
    </Spin>
  );
}

function getCreditListTableColumns(navigate: (id: string) => void) {
  const creditColumns = [
    {
      title: 'Action Name',
      key: 'action',
      flex: 1,
      ellipsis: {
        showTitle: false,
      },
      render: (record: any) => {
        return (
          <Tooltip
            placement="topLeft"
            title={_.capitalize(record.action).replace('_', ' ')}
          >
            <Typography.Text>
              {_.capitalize(record.action).replace('_', ' ')}
            </Typography.Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Amount',
      key: 'amount',
      flex: 1,
      ellipsis: true,
      render: (rec: any) => {
        return <Typography.Text>{rec.amount}</Typography.Text>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      flex: 1,
      ellipsis: true,
      render: (rec: any) => {
        return <Typography.Text>{rec.status}</Typography.Text>;
      },
    },
    {
      title: 'Document',
      key: 'docId',
      ellipsis: true,
      render: (rec: any) => {
        return rec.meta?.docId || rec.meta?.templateDocId ? (
          <div style={{ width: '100%', gap: '4px' }}>
            <Typography.Text
              style={{
                color: '#5345f3',
                textAlign: 'left',
                maxWidth: '100%',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                display: 'block',
                cursor: 'pointer',
              }}
              onClick={() => {
                let docType = rec.meta?.docType;
                let path =
                  docType === DOCTYPE.DEVELOPMENT_PLAN
                    ? DevPlansPath
                    : docType === 'CHAT'
                      ? IdeasPath
                      : rec.meta?.docId
                        ? DocumentsPath
                        : TemplateDocumentPath;
                navigate(
                  `/${path}/${rec.meta?.docId || rec.meta?.templateDocId}`
                );
              }}
            >
              {rec.meta?.docName ||
                DocumentTypeNameMapping[rec.meta?.docType].name}
            </Typography.Text>
            <div
              style={{
                fontSize: '12px',
                background: '#a4a4a4',
                color: 'white',
                height: '18px',
                borderRadius: '8px',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '18px',
                marginTop: '2px',
                padding: '0 4px',
                width: 'fit-content',
              }}
              className="document-badge"
            >
              {rec.amount}
            </div>
          </div>
        ) : (
          <Typography.Text type="secondary" style={{ padding: '4px 15px' }}>
            N.A.
          </Typography.Text>
        );
      },
    },
    {
      title: 'User',
      key: 'user',
      flex: 1,
      ellipsis: true,
      render: (rec: any) => {
        return <Typography.Text>{rec.meta?.email || ''}</Typography.Text>;
      },
    },
    {
      title: 'Created At',
      key: 'createdAt',
      flex: 1,
      ellipsis: true,
      sorter: (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      render: (rec: any) => {
        return (
          <Typography.Text>
            {dayjs(rec.createdAt).format('MM/DD/YYYY h:mm A')}
          </Typography.Text>
        );
      },
    },
  ];

  return creditColumns;
}
