import { FC } from 'react';
import { Col, Pagination, Row, Spin } from 'antd';

import { PaginationInfo } from '../../../../../shared/types';
import { TemplateDocumentItemType } from '../types/templateDocumentTypes';
import { TemplateDocumentItem } from './TemplateDocumentItem';

export interface TemplateDocumentListProps {
  isLoading?: Boolean;
  items: ReadonlyArray<TemplateDocumentItemType>;
  pagination: PaginationInfo;
  xl?: number;
  xxl?: number;
  selectedTemplateId?: string;
  onPaginationChange?: (page: number, limit: number) => void;
  onItemClick?: (itemData: TemplateDocumentItemType) => void;
}

export const TemplateDocumentList: FC<TemplateDocumentListProps> = (props) => {
  const {
    isLoading = false,
    items,
    pagination,
    selectedTemplateId,
    onPaginationChange,
    onItemClick,
  } = props;
  const handleClickItem = (itemData: TemplateDocumentItemType) => {
    onItemClick && onItemClick(itemData);
  };

  return (
    <Spin spinning={isLoading ? true : false}>
      <Row gutter={[16, 16]} style={{ width: '100%', minHeight: 300 }}>
        {items &&
          items.map((item, index) => {
            return (
              <Col
                className="gutter-row"
                xs={24}
                md={12}
                xl={8}
                xxl={4}
                key={index}
              >
                <TemplateDocumentItem
                  item={item}
                  onClick={() => {
                    handleClickItem(item);
                  }}
                  isInUse={selectedTemplateId === item.id}
                />
              </Col>
            );
          })}
      </Row>
      <Pagination
        align="end"
        style={{ textAlign: 'center', margin: 16 }}
        current={pagination.page}
        pageSize={pagination.limit}
        total={pagination.total}
        onChange={onPaginationChange}
      />
    </Spin>
  );
};
