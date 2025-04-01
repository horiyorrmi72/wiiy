import { useRef, useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { DOCTYPE, TemplateAccess } from '@prisma/client';
import {
  Alert,
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  Select,
  Tooltip,
} from 'antd';
import { useNavigate } from 'react-router';

import TiptapEditor from '../../../common/components/TiptapEditor';
import { GenerationMinimumCredit } from '../../../common/constants';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import trackEvent from '../../../trackingClient';
import DocumentToolbar from '../../documents/components/DocumentToolbar';
import { DocTypeOptionsSelection } from '../../documents/types/documentTypes';
import { UserTemplateDocumentsPath } from '../../nav/paths';
import { useTemplateDocumentMutation } from '../hooks/useTemplateDocumentMutation';

import './AddTemplateDocument.scss';

type AddTemplateDocumentProps = Readonly<{
  teamId?: string;
  templateCreated?: () => void;
  onSuccess?: () => void;
}>;

type FormValues = {
  name: string;
  description: string;
  access: TemplateAccess;
  type: DOCTYPE;
  promptText: string;
  outputFormat: string;
  sampleInputText: string;
  sampleOutputText: string;
};

export default function AddTemplateDocument({
  templateCreated,
  onSuccess,
}: AddTemplateDocumentProps) {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { user, organization } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const isGenerationLocked =
    (organization?.credits ?? 0) <= GenerationMinimumCredit;

  const chatSessionId = useRef('');
  const docId = useRef('');

  const { addTemplateDocumentMutation } = useTemplateDocumentMutation({
    onSuccess: (templateDocument) => {
      console.log('Successfully created Template Document ', templateDocument);
      setIsSaving(false);
      onSuccess?.();
      templateCreated?.();
      navigate(`/template-documents/${templateDocument.id}`);
    },
    onError: () => {
      console.error('error');
      setIsSaving(false);
    },
  });

  const { createTemplatePromptMutation } = useTemplateDocumentMutation({
    onSuccess: (data) => {
      console.log('Successfully created Template prompt ', data);
      setIsSaving(false);
      form.setFieldValue('promptText', data.promptText as string);
    },
    onError: () => {
      console.error('error');
      setIsSaving(false);
    },
  });

  const { createTemplateSampleOutputMutation } = useTemplateDocumentMutation({
    onSuccess: (data) => {
      console.log('Successfully created Template prompt ', data);
      setIsSaving(false);
      form.setFieldValue('sampleOutputText', data.sampleOutputText as string);
      chatSessionId.current = data.chatSessionId as string;
      docId.current = data.docId as string;
    },
    onError: () => {
      console.error('error');
      setIsSaving(false);
    },
  });

  async function generateTemplatePrompt() {
    try {
      const values = await form.validateFields();
      console.log('Success:', values);
    } catch (error) {
      console.log('Failed:', error);
      return;
    }

    const { name, description, type } = form.getFieldsValue();
    setIsSaving(true);
    console.log('name,desc,type:', name, description, type);
    createTemplatePromptMutation.mutate({
      name,
      description,
      type,
    });

    // track event
    trackEvent('New Template Prompt', {
      distinct_id: user.email,
      payload: JSON.stringify({
        templateType: type,
        templateName: name,
        description,
      }),
    });
  }

  function generateSampleOutput() {
    const { sampleInputText, promptText, type, name } = form.getFieldsValue();
    setIsSaving(true);
    console.log(
      'generateSampleOutput.input:',
      promptText,
      type,
      sampleInputText
    );
    createTemplateSampleOutputMutation.mutate({
      sampleInputText,
      promptText,
      type,
      chatSessionId: chatSessionId.current,
    });

    // track event
    trackEvent('New Template Sample Output', {
      distinct_id: user.email,
      payload: JSON.stringify({
        templateType: type,
        name,
        sampleInputText,
      }),
    });
  }

  function generateTemplate() {
    const {
      sampleInputText,
      promptText,
      type,
      name,
      sampleOutputText,
      description,
    } = form.getFieldsValue();

    setIsSaving(true);
    addTemplateDocumentMutation.mutate({
      name,
      description,
      access: TemplateAccess.SELF, // default set to self
      type,
      promptText,
      sampleOutputText,
      sampleInputText,
      id: docId.current,
    });
    // track event
    trackEvent('New Template Creation', {
      distinct_id: user.email,
      payload: JSON.stringify({
        templateType: type,
        templateName: name,
        description,
        promptText,
        sampleInputText,
      }),
    });
  }

  function onSubmit(formValues: FormValues) {
    console.log(formValues);
    const {
      name,
      description,
      type,
      promptText,
      sampleOutputText,
      sampleInputText,
    } = formValues;

    setIsSaving(true);
    addTemplateDocumentMutation.mutate({
      name,
      description,
      access: TemplateAccess.SELF, // default set to self
      type,
      promptText,
      sampleOutputText,
      sampleInputText,
      id: docId.current,
    });
    // track event
    trackEvent('New Template Creation', {
      distinct_id: user.email,
      payload: JSON.stringify({
        templateType: type,
        templateName: name,
        description,
        promptText,
        sampleInputText,
      }),
    });
  }

  const breadcrumbItems = [
    {
      key: 'templates',
      label: 'Document Templates',
      link: `/${UserTemplateDocumentsPath}`,
    },
    {
      key: 'create',
      label: 'Create',
    },
  ];
  return (
    <>
      <DocumentToolbar breadcrumbItems={breadcrumbItems} docActions={[]} />
      <Flex className="add-template-container" vertical>
        <Form
          labelCol={{
            sm: { span: 7 },
            lg: { span: 5 },
          }}
          wrapperCol={{
            sm: { span: 15 },
            lg: { span: 17 },
          }}
          onFinish={onSubmit}
          form={form}
          size="large"
          initialValues={{
            type: DOCTYPE.PRD,
            access: TemplateAccess.SELF,
            name: '',
            description: '',
            promptText: '',
            sampleInputText: '',
            sampleOutputText: '',
          }}
          className="add-template-document-form"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Please specify a template name' },
            ]}
          >
            <Input placeholder="Enter template name" />
          </Form.Item>
          <Form.Item
            label="Type:"
            name="type"
            rules={[
              { required: true, message: 'Please choose a document type' },
            ]}
          >
            <Select
              style={{ width: 200 }}
              allowClear
              options={DocTypeOptionsSelection.slice(1).filter(
                (item) =>
                  item.value !== DOCTYPE.UI_DESIGN &&
                  item.value !== DOCTYPE.DEVELOPMENT_PLAN
              )}
            />
          </Form.Item>
          <Form.Item
            label="Description"
            name="description"
            tooltip="The purpose of the template and its intended use"
            rules={[
              {
                required: true,
                message: 'Please describe the purpose of the template',
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={
                'Please specify the purpose of the template, for example, a standard PRD template for new products development'
              }
            />
          </Form.Item>
          <Flex justify="center" align="center">
            <Flex
              justify="center"
              gap={32}
              align="flex-start"
              style={{ width: '250px' }}
            >
              {isGenerationLocked && (
                <Tooltip title="Insufficient credits. Please buy more credits or upgrade.">
                  <InfoCircleOutlined style={{ color: 'orange' }} />
                  &nbsp;&nbsp;
                </Tooltip>
              )}
              <Button
                type="primary"
                block
                style={{ flex: 1, padding: '0', marginBottom: '20px' }}
                onClick={generateTemplatePrompt}
                loading={isSaving}
                disabled={isSaving}
              >
                {form.getFieldValue('promptText')
                  ? 'Regenerate Template Prompt'
                  : 'Generate Template Prompt'}
              </Button>
            </Flex>
          </Flex>
          <>
            <Form.Item
              label="Template Prompt"
              name="promptText"
              tooltip="The instructions are used as the context for the AI to generate the output document"
              rules={[
                {
                  message: 'Please specify the user instructions',
                },
              ]}
            >
              <TiptapEditor toolbarHelperText="Want to make changes to the prompt? You can directly edit below OR modify the description above to generate." />
            </Form.Item>
            <Flex justify="center" align="center">
              <Flex
                justify="center"
                align="flex-start"
                style={{ width: '450px', marginBottom: '40px' }}
                className="buttons-row"
              >
                <Button
                  type="primary"
                  block
                  style={{ padding: '0 4px' }}
                  onClick={() => setOpen(true)}
                  disabled={isSaving || !form.getFieldValue('promptText')}
                >
                  Check Template Output
                </Button>
                <Button
                  type="primary"
                  block
                  style={{ padding: '0 4px' }}
                  onClick={generateTemplate}
                  disabled={isSaving || !form.getFieldValue('promptText')}
                >
                  Save Template
                </Button>
              </Flex>
            </Flex>
          </>
          <Drawer
            title="Check Template Output"
            placement="right"
            size="large"
            onClose={() => setOpen(false)}
            open={open}
            className="create-template-drawer"
          >
            {!form.getFieldValue('promptText') && (
              <Alert
                type="error"
                message="Please generate the template prompt first in the main screen"
                style={{ marginBottom: '20px' }}
              />
            )}
            <Form.Item
              label="Sample Input"
              name="sampleInputText"
              tooltip="Enter a sample user input that will be used with the prompt to generate the output"
              rules={[
                {
                  message: 'Please provide a sample user input',
                },
              ]}
            >
              <Input.TextArea
                rows={6}
                style={{ fontSize: '12px' }}
                placeholder={`Please include the context, problem, or user's requirements for the generation. Example below for Omniflow PRD input:
- "we want to build an app that automate the entire product development lifecycle. Through a brief description of the product, Omniflow will generate a comprehensive PRD, UIUX design, technical design, development, and more."`}
              />
            </Form.Item>
            <Form.Item
              label="Output Doc"
              name="sampleOutputText"
              tooltip="After you enter the sample input, press the 'Generate Sample Output' button to get the output."
              rules={[
                {
                  message:
                    'Please provide input above to generate this sample output',
                },
              ]}
            >
              <TiptapEditor toolbarHelperText="You can directly edit content below." />
            </Form.Item>
            <Flex justify="center" align="center">
              <Flex
                justify="center"
                gap={32}
                align="flex-start"
                style={{ width: '250px' }}
              >
                {isGenerationLocked && (
                  <Tooltip title="Insufficient credits. Please buy more credits or upgrade.">
                    <InfoCircleOutlined style={{ color: 'orange' }} />
                    &nbsp;&nbsp;
                  </Tooltip>
                )}
                <Button
                  type="primary"
                  style={{ flex: 1, padding: '0' }}
                  loading={isSaving}
                  disabled={isSaving || !form.getFieldValue('promptText')}
                  onClick={generateSampleOutput}
                >
                  Generate Sample Output
                </Button>
              </Flex>
            </Flex>
          </Drawer>
        </Form>
      </Flex>
    </>
  );
}
