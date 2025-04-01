import { useState } from 'react';
import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Document, Prisma } from '@prisma/client';
import { Drawer, Flex, List, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';

import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../common/util/app';
import { COLORS } from '../../../lib/constants';
import { DocHistoryItem } from './DocumentEditor';
import FeedbackRating from './FeedbackRating';

import './DocumentHistory.scss';

type DocumentHistoryProps = Readonly<{
  onRefetchDocument?: () => void;
  onHandleHistoryChange: (item: DocHistoryItem, versionNumber: number) => void;
  document: Partial<Document>;
}>;

export default function DocumentHistory({
  document,
  onRefetchDocument,
  onHandleHistoryChange,
}: DocumentHistoryProps) {
  const { showAppModal } = useAppModal();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocHistoryItem | null>(null);
  const isDocHistoryLocked = isFeatureLocked(
    subscriptionStatus,
    subscriptionTier
  );

  const docHistory: DocHistoryItem[] = (() => {
    if ('meta' in document && document.meta) {
      const metaObj = document.meta as Prisma.JsonObject;
      const history: Array<DocHistoryItem> = JSON.parse(
        (metaObj.history as string) ?? '[]'
      );

      return history;
    }
    return [];
  })();

  const onSelectDoc = (item: DocHistoryItem, versionNumber: number) => {
    setSelectedDoc(item);
    onHandleHistoryChange(item, versionNumber);
  };

  return (
    <>
      <ClockCircleOutlined
        title="View document history"
        style={{
          fontSize: '20px',
          position: 'absolute',
          top: '12px',
          right: '10px',
        }}
        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
      />
      <Drawer
        title="Document history"
        onClose={() => setIsHistoryOpen(false)}
        open={isHistoryOpen}
        className="app-drawer"
      >
        <Flex vertical>
          {isDocHistoryLocked && docHistory.length > 1 && (
            <Typography.Title level={5} style={{ margin: '5px 0' }}>
              <Tooltip title="Upgrade plan for full history">
                <InfoCircleOutlined
                  style={{ color: 'orange' }}
                  onClick={() => {
                    showAppModal({
                      type: 'updateSubscription',
                      payload: {
                        email: user.email,
                        source: 'docHistory',
                        destination: 'docHistory',
                      },
                    });
                  }}
                />
              </Tooltip>
              &nbsp;Upgrade plan for full version history
            </Typography.Title>
          )}
          <div
            style={{
              flex: 1,
              width: '100%',
              marginBottom: 40,
            }}
          >
            <List
              itemLayout="horizontal"
              dataSource={(isDocHistoryLocked
                ? docHistory.slice(0, 1)
                : docHistory
              ).sort(
                (x, y) =>
                  new Date(y.date).getTime() - new Date(x.date).getTime()
              )}
              renderItem={(item, index) => {
                const isSelected =
                  selectedDoc?.date === item.date ||
                  (!selectedDoc && index === 0);
                const versionNumber = docHistory.length - index;
                const existingRating = (item?.rating ?? []).find(
                  (x) => x.userId === user.id
                );
                const isLastGenerated = index === 0;
                const customStyle = isLastGenerated
                  ? {
                      paddingTop: '0.5em',
                      width: '98%',
                    }
                  : { padding: '6px 0', width: '98%' };

                return (
                  <List.Item style={customStyle}>
                    <Flex
                      vertical
                      onClick={() => onSelectDoc(item, versionNumber)}
                      className={`doc-history-item ${
                        isSelected ? 'selected' : ''
                      }`}
                    >
                      {isLastGenerated && existingRating == null && (
                        <FeedbackRating
                          refresh={onRefetchDocument}
                          disabled={!isLastGenerated}
                          docData={document}
                          existingRating={(item.rating ?? []).find(
                            ({ userId }) => userId === user.id
                          )}
                          historyData={item}
                          userId={user.id}
                        />
                      )}
                      <Flex
                        gap={2}
                        align="center"
                        justify="space-between"
                        style={{ fontSize: '10px !important' }}
                      >
                        <Typography.Text strong style={{ fontSize: 11 }}>
                          <Tag color={COLORS.PRIMARY} style={{ fontSize: 10 }}>
                            V{versionNumber}
                          </Tag>
                          {dayjs(item.date).format('MM/DD/YYYY h:mm A')}
                        </Typography.Text>
                        {(existingRating != null || !isLastGenerated) && (
                          <FeedbackRating
                            refresh={onRefetchDocument}
                            disabled={true}
                            docData={document}
                            existingRating={(item.rating ?? []).find(
                              ({ userId }) => userId === user.id
                            )}
                            historyData={item}
                            userId={user.id}
                          />
                        )}
                      </Flex>
                      <Typography.Paragraph
                        copyable
                        style={{
                          marginBottom: 0,
                          fontSize: 12,
                          maxWidth: '95%',
                        }}
                        ellipsis={
                          isSelected
                            ? false
                            : { rows: 2, expandable: true, symbol: '' }
                        }
                      >
                        {item.description}
                      </Typography.Paragraph>
                    </Flex>
                  </List.Item>
                );
              }}
            />
          </div>
        </Flex>
      </Drawer>
    </>
  );
}
