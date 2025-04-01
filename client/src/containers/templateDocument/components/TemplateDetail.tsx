import { FC } from 'react';
import { DOCTYPE } from '@prisma/client';
import { Button, Flex, Tree, Typography } from 'antd';

import TiptapEditor from '../../../common/components/TiptapEditor';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import trackEvent from '../../../trackingClient';
import { TemplateDocumentItemType } from '../types/templateDocumentTypes';

import './TemplateDetail.scss';

export interface TemplateDetailProps {
  templateData: TemplateDocumentItemType;
  onUse?: (data: TemplateDocumentItemType) => void;
}

export const TemplateDetail: FC<TemplateDetailProps> = (props) => {
  const { templateData: template, onUse } = props;
  const { user } = useCurrentUser();
  // track event
  trackEvent('TemplateDetail View', {
    distinct_id: user.email,
    payload: JSON.stringify({
      templateType: template.type,
      templateName: template.name,
      templateId: template.id,
      orgName: template.organization?.name,
    }),
  });
  let treeData;
  if (template.type === DOCTYPE.DEVELOPMENT_PLAN) {
    treeData = JSON.parse(template.sampleOutputText as string);
    // 将treeData中的key值转换为string类型, 并保留children, title, key
    treeData = treeData.epics.map((epic: any) => ({
      ...epic,
      title: 'Epic: ' + epic.name,
      key: epic.key.toString(),
      children: epic.children.map((story: any) => ({
        ...story,
        title: 'Story: ' + story.name,
        key: story.key.toString(),
        // 将children中的key值转换为string类型
        children: story.children.map((task: any) => ({
          ...task,
          title: (
            <Flex vertical>
              <div>{task.name}</div>
              <div
                style={{
                  marginLeft: 20,
                  padding: 3,
                }}
              >
                {task.description}
              </div>
            </Flex>
          ),
          key: task.key.toString(),
        })),
      })),
    }));
  }
  const handleUseTemplate = function () {
    onUse && onUse(template);
    // track event
    trackEvent('TemplateDetail Use', {
      distinct_id: user.email,
      payload: JSON.stringify({
        templateType: template.type,
        templateName: template.name,
        templateId: template.id,
        orgName: template.organization?.name,
      }),
    });
  };
  return (
    <>
      <div>
        <Flex style={{ flexWrap: 'wrap', marginBottom: '10px', gap: '12px' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {template.name}
          </Typography.Title>
          {onUse && (
            <Button
              type="primary"
              onClick={handleUseTemplate}
              style={{ marginLeft: 'auto' }}
            >
              Use Template
            </Button>
          )}
        </Flex>
        <Typography.Text
          type="secondary"
          style={{ fontSize: '12px', margin: '5px 0 10px' }}
        >
          by {template.organization?.name}
        </Typography.Text>
        <Typography.Paragraph style={{ margin: '10px 0', fontSize: 16 }}>
          {template.description}
        </Typography.Paragraph>
      </div>
      <Flex vertical className="template-detail">
        <div style={{ display: 'none' }}>
          <Typography.Title level={5} style={{ margin: '8px 0' }}>
            Template Prompt
            <br />
            <Typography.Text type="secondary">
              This auto-generated prompt text will be used to create documents
              based on this template.
            </Typography.Text>
          </Typography.Title>
          <div className="template-prompt-editor">
            <TiptapEditor
              value={template.promptText as string}
              showToolbar={false}
              editable={false}
            />
          </div>
        </div>
        <Typography.Title level={5} style={{ margin: '8px 0' }}>
          Sample Input <br />
          <Typography.Text type="secondary" style={{ display: 'none' }}>
            You may copy and edit this sample input to generate a document
            similar to the sample output below.
          </Typography.Text>
        </Typography.Title>
        <Typography.Paragraph
          copyable
          style={{
            backgroundColor: 'rgba(83,69,243,0.09)',
            border: '1px solid rgba(83,69,243,0.26)',
            padding: 16,
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            whiteSpace: 'pre-wrap',
            margin: '10px 0',
          }}
        >
          {template.sampleInputText}
        </Typography.Paragraph>
        <Typography.Title level={5} style={{ margin: '8px 0' }}>
          Sample Output
          <br />
          <Typography.Text type="secondary" style={{ display: 'none' }}>
            This sample output text is generated using the sample input and the
            template prompt above.
          </Typography.Text>
        </Typography.Title>
        <div
          className="sample-output-editor"
          style={{ margin: '10px 0 20px 0' }}
        >
          {template.type !== DOCTYPE.DEVELOPMENT_PLAN ? (
            <TiptapEditor
              value={template.sampleOutputText as string}
              showToolbar={false}
              editable={false}
            />
          ) : (
            <Tree
              className="draggable-tree"
              defaultExpandAll={true}
              treeData={treeData}
            />
          )}
        </div>
      </Flex>
    </>
  );
};
