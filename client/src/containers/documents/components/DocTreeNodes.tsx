import { useEffect, useState } from 'react';
import { PaperClipOutlined } from '@ant-design/icons';
import { DOCTYPE } from '@prisma/client';
import {
  Flex,
  Input,
  Popover,
  Space,
  Tag,
  Tooltip,
  Tree,
  TreeDataNode,
  Typography,
} from 'antd';
import debounce from 'lodash/debounce';

import { COLORS } from '../../../lib/constants';
import { DevPlanOutput } from '../../devPlans/types/devPlanTypes';
import {
  DocumentOutput,
  DocumentTypeNameMapping,
} from '../types/documentTypes';

type DocTreeNodesProps = Readonly<{
  docTreeData?: TreeDataNode[];
  docs?: DocumentOutput[];
  selectedDocNodes?: TreeDataNode[];
  currentDoc?: DocumentOutput | DevPlanOutput;
  setSelectedDocNodes?: (nodes: TreeDataNode[]) => void;
  linkIcon?: boolean;
}>;

export default function DocTreeNodes({
  docs,
  selectedDocNodes = [],
  currentDoc,
  setSelectedDocNodes,
  linkIcon = false,
}: DocTreeNodesProps) {
  const [docTreeData, setDocTreeData] = useState<TreeDataNode[]>([]);
  const [latestChosenDocumentIds, setLatestChosenDocumentIds] = useState('');
  const [defaultSelectedKeys, setDefaultSelectedKeys] = useState(['']);
  const [isMobile, setIsMobile] = useState(false);

  const [keyword, setKeyword] = useState('');

  const onSearch = (e: any) => {
    console.log(e, e.target.value);
    setKeyword(e.target.value);
  };

  const debounceSearch = debounce(onSearch, 800);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 575);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    const treeData: TreeDataNode[] = [];
    docs
      ?.filter(
        (doc) =>
          doc.id !== currentDoc?.id &&
          !!doc.name &&
          doc.name.toLowerCase().includes(keyword.toLowerCase())
      )
      .forEach((doc) => {
        const existingNode = treeData.find(
          (node) => node.key === doc.project?.id
        );
        if (!existingNode) {
          if (doc.project) {
            treeData.push({
              key: String(doc.project.id),
              title: `Project: ${doc.project.name}`,
              disableCheckbox: true,
              children: [
                {
                  key: doc.id,
                  title: (
                    <span>
                      <a
                        target="_blank"
                        href={
                          doc.type === DOCTYPE.DEVELOPMENT_PLAN
                            ? `/devplan/${doc.id}`
                            : `/docs/${doc.id}`
                        }
                        rel="noreferrer"
                      >
                        {doc.name}
                      </a>
                    </span>
                  ),
                },
              ],
            });
          } else {
            treeData.push({
              key: String(doc.id),
              title: (
                <span>
                  {DocumentTypeNameMapping[doc.type]?.name}:&nbsp;
                  <a
                    target="_blank"
                    href={
                      doc.type === DOCTYPE.DEVELOPMENT_PLAN
                        ? `/devplan/${doc.id}`
                        : `/docs/${doc.id}`
                    }
                    rel="noreferrer"
                  >
                    {doc.name}
                  </a>
                </span>
              ),
            });
          }
        } else {
          const node = {
            key: String(doc.id),
            title: (
              <span>
                <a
                  target="_blank"
                  href={
                    doc.type === DOCTYPE.DEVELOPMENT_PLAN
                      ? `/devplan/${doc.id}`
                      : `/docs/${doc.id}`
                  }
                  rel="noreferrer"
                >
                  {doc.name}
                </a>
              </span>
            ),
          };
          existingNode?.children?.push(node);
        }
        if (
          doc.type === DOCTYPE.PRD &&
          doc.projectId &&
          currentDoc?.projectId === doc.projectId &&
          currentDoc?.type !== DOCTYPE.PRD &&
          !latestChosenDocumentIds
        ) {
          setDefaultSelectedKeys([String(doc.id)]);
          setSelectedDocNodes &&
            setSelectedDocNodes([
              {
                key: String(doc.id),
                title: doc.name,
              },
            ]);
        }
      });
    setDocTreeData(treeData);
  }, [docs, setSelectedDocNodes, currentDoc, latestChosenDocumentIds, keyword]);

  useEffect(() => {
    if (currentDoc?.meta?.history && docs) {
      const chosenDocumentIds = String(
        (JSON.parse(currentDoc?.meta?.history) || [])[0]?.chosenDocumentIds
      );

      if (chosenDocumentIds && !latestChosenDocumentIds) {
        const chosenDocIdArr = chosenDocumentIds.split(',');
        setLatestChosenDocumentIds(chosenDocumentIds);
        setDefaultSelectedKeys(chosenDocIdArr);

        const selectedNodes =
          docs
            ?.filter((doc) => chosenDocIdArr.indexOf(doc.id) > -1)
            .map((doc) => ({
              key: String(doc.id),
              title: doc.name,
            })) || [];
        setSelectedDocNodes && setSelectedDocNodes(selectedNodes);
      }
    }
  }, [
    docs,
    currentDoc?.meta?.history,
    setSelectedDocNodes,
    latestChosenDocumentIds,
  ]);

  return (
    <Flex wrap>
      <Popover
        content={
          docTreeData.length ? (
            <Tree
              style={{
                height: '400px',
                width: '400px',
                overflow: 'auto',
              }}
              checkable
              defaultExpandedKeys={docTreeData.map((node) => node.key)}
              defaultCheckedKeys={defaultSelectedKeys}
              checkedKeys={selectedDocNodes.map((node) => node.key)}
              treeData={docTreeData}
              onCheck={(checkedKeys) => {
                setSelectedDocNodes &&
                  setSelectedDocNodes(
                    docs
                      ?.filter((doc) =>
                        (checkedKeys as React.Key[]).includes(doc.id)
                      )
                      .map((doc) => ({
                        key: String(doc.id),
                        title: doc.name,
                      })) || []
                  );
              }}
            />
          ) : (
            <Space
              style={{
                height: '400px',
                width: '400px',
              }}
            >
              no document found
            </Space>
          )
        }
        title={
          <Flex justify="center" gap={20}>
            Documents
            <Input
              placeholder="Search by file name"
              onChange={debounceSearch}
              size="small"
            />
          </Flex>
        }
      >
        <Tag
          className="file-tag prd-tag"
          style={{
            backgroundColor:
              isMobile && linkIcon ? 'transparent' : COLORS.LIGHT_PINK,
            border:
              isMobile && linkIcon ? 'none' : `solid 1px ${COLORS.PURPLE}`,
            borderRadius: '6px',
            margin: isMobile && linkIcon ? '0' : '0 0 5px 5px',
          }}
          closeIcon
        >
          <Tooltip>
            {isMobile && linkIcon ? (
              <Typography.Text
                ellipsis
                style={{
                  padding: '0px',
                  fontSize: '12px',
                }}
              >
                <>
                  {selectedDocNodes?.length ? (
                    selectedDocNodes[0].title
                  ) : (
                    <PaperClipOutlined style={{ fontSize: '16px' }} />
                  )}
                </>
              </Typography.Text>
            ) : (
              <Typography.Text
                ellipsis
                className="file-label"
                style={{
                  color: COLORS.PURPLE,
                  padding: '0px',
                  fontSize: '12px',
                }}
              >
                <>
                  {selectedDocNodes?.length
                    ? selectedDocNodes[0].title
                    : 'Link document'}
                </>
              </Typography.Text>
            )}
          </Tooltip>
        </Tag>
      </Popover>
      {selectedDocNodes.length > 1 && (
        <Tag
          className="plus-tag"
          style={{
            backgroundColor: COLORS.LIGHT_PINK,
            border: `solid 1px ${COLORS.PURPLE}`,
            borderRadius: '6px',
            color: COLORS.PURPLE,
          }}
          closeIcon
        >
          +{selectedDocNodes.length - 1}
        </Tag>
      )}
    </Flex>
  );
}
