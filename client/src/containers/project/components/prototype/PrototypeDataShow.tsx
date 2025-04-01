import { useState } from 'react';
import { Flex, List, message, Modal, Spin, Table } from 'antd';

import { getTableData } from '../../api/databaseApi';
import { TableInfo } from './PrototypeDataBaseHandler';

interface ProtoTypeDataShowProps {
  onClose: () => void;
  data: TableInfo[];
  documentId: string;
}

interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
}

interface TableRecord {
  id?: string | number;
  [key: string]: any;
}

export default function PrototypeDataShow({
  onClose,
  data,
  documentId,
}: ProtoTypeDataShowProps) {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableRecord[]>([]);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  const [isLoadingCrud, setIsLoadingCrud] = useState(false);

  const handleTableSelect = async (tableName: string) => {
    if (!documentId) return;

    setIsLoadingTableData(true);
    setSelectedTable(tableName);
    setTableData([]);
    setTableColumns([]);

    try {
      const result = await getTableData(documentId, tableName, ['*']);
      if (result.rows) {
        setTableData(result.rows);
        // Find the selected table's columns
        const selectedTableInfo = data.find(
          (t: TableInfo) => t.table === tableName
        );
        if (selectedTableInfo) {
          setTableColumns(
            selectedTableInfo.columns.map((col: string) => ({
              title: col,
              dataIndex: col,
              key: col,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      message.error('Failed to fetch table data');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  return (
    <Modal
      title="Database View"
      open={true}
      onCancel={onClose}
      width={1200}
      footer={null}
    >
      <Flex style={{ height: '600px' }}>
        <div
          style={{
            width: '250px',
            borderRight: '1px solid #f0f0f0',
            padding: '16px',
          }}
        >
          <List
            size="small"
            header={<div style={{ fontWeight: 'bold' }}>Tables</div>}
            bordered
            dataSource={data}
            renderItem={(tableInfo: TableInfo) => (
              <List.Item
                onClick={() => handleTableSelect(tableInfo.table)}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedTable === tableInfo.table
                      ? '#e6f7ff'
                      : 'transparent',
                }}
              >
                <div>
                  <div>{tableInfo.table.split('_').pop()}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {tableInfo.columns.length} columns
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>

        <div style={{ flex: 1, padding: '16px' }}>
          {selectedTable ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <Flex justify="space-between" align="center">
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {selectedTable.split('_').pop()}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Columns:{' '}
                      {data
                        .find((t: TableInfo) => t.table === selectedTable)
                        ?.columns.join(', ')}
                    </div>
                  </div>
                </Flex>
              </div>
              <Spin spinning={isLoadingTableData}>
                <Table
                  columns={tableColumns}
                  dataSource={tableData}
                  scroll={{ y: 400 }}
                  size="small"
                  rowKey={(record) =>
                    record.id?.toString() || Math.random().toString()
                  }
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} items`,
                  }}
                />
              </Spin>
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: '#999',
                marginTop: '100px',
              }}
            >
              Select a table to view its data
            </div>
          )}
        </div>
      </Flex>
    </Modal>
  );
}
