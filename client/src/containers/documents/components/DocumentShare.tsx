import { useEffect, useState } from 'react';
import { DOCTYPE, DocumentPermissionTypes } from '@prisma/client';
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  FormProps,
  Input,
  Tabs,
  Tree,
  Typography,
} from 'antd';
import { RuleObject } from 'antd/es/form';
import { StoreValue } from 'antd/es/form/interface';
import { random } from 'lodash';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import HtmlPreview from '../../../common/components/HtmlPreview';
import { DevPlan } from '../../devPlans/types/devPlanTypes';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import {
  DevPlansPath,
  DocumentsPath,
  SharedDocumentPath,
} from '../../nav/paths';
import { getSharedDocumentApi } from '../api/getDocumentApi';
import { DocumentOutput } from '../types/documentTypes';

function useDocumentIdParam(): string {
  const { docId } = useParams();
  if (!docId) {
    throw new Error('You must specify a document ID parameter');
  }
  return docId;
}

export function DocumentShare() {
  const documentId = useDocumentIdParam();
  const navigate = useNavigate();
  const { docId } = useParams();
  const [searchParams] = useSearchParams();
  const [doc, setDoc] = useState<
    | (DocumentOutput & {
        currentUserId: string | null;
        documentPermission: DocumentPermissionTypes;
      })
    | null
  >(null);
  const [devPlan, setDevPlan] = useState<DevPlan>();
  const [email, setEmail] = useState(searchParams.get('email'));
  const [errMsg, setErrMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isPreview = searchParams.get('isPreview');

  const [form] = Form.useForm();

  useEffect(() => {
    setErrMsg('');
    setIsLoading(true);
    getSharedDocumentApi(documentId, email)
      .then((data) => {
        setErrMsg('');
        setIsLoading(false);
        // User is Login and has edit access
        const { id, documentPermission, type } = data;
        if (
          documentPermission === DocumentPermissionTypes.EDIT &&
          isPreview !== '1'
        ) {
          let path =
            type === DOCTYPE.DEVELOPMENT_PLAN ? DevPlansPath : DocumentsPath;
          navigate(`/${path}/${id}`, { replace: true });
          return;
        }
        // handle document data
        setDoc(data);
        // parse devplan data
        if (type === DOCTYPE.DEVELOPMENT_PLAN) {
          let treeData = JSON.parse(data.contents as string);
          // 将treeData中的key值转换为string类型, 并保留children, title, key
          treeData = treeData.epics.map((epic: any) => ({
            ...epic,
            title: 'Epic: ' + epic.name,
            key: epic.key as string,
            children: epic.children.map((story: any) => ({
              ...story,
              title: 'Story: ' + story.name,
              key: story.key as string,
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
                key: task.key as string,
              })),
            })),
          }));
          setDevPlan({ epics: treeData, milestones: [], sprints: [] });
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setErrMsg(err.message);
      });
  }, [email, documentId, isPreview, navigate]);

  type FormValue = {
    inputEmail: string;
  };

  const validateEmail = (
    rule: RuleObject,
    value: StoreValue,
    callback: (error?: string) => void
  ): Promise<void | any> | void => {
    const emailRegex =
      /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    if (!value) {
      callback('Enter your email');
    } else if (!emailRegex.test(value)) {
      callback('Invalid email address');
    } else {
      callback();
    }
  };

  const onFinish: FormProps<FormValue>['onFinish'] = (values) => {
    console.log('Success:', values);
    const { inputEmail } = values;
    if (!inputEmail) {
      setErrMsg('Please input your email.');
      return;
    }
    setEmail(inputEmail);
  };

  function handleTry(e: React.MouseEvent<HTMLButtonElement>) {
    let path =
      doc?.type === DOCTYPE.DEVELOPMENT_PLAN ? DevPlansPath : DocumentsPath;
    if (doc?.documentPermission === DocumentPermissionTypes.EDIT) {
      navigate(`/${path}/${docId}`, { replace: true });
    } else {
      navigate(`/redirect?url=/${SharedDocumentPath}/${docId}`);
    }
  }

  console.log('in containers.project.components.DocumentShare:', doc);

  const getTabData = function () {
    let treeData = JSON.parse(doc?.contents as string);
    // 将treeData中的key值转换为string类型, 并保留children, title, key
    let epicsData = treeData.epics.map((epic: any) => ({
      ...epic,
      title: 'Epic: ' + epic.name,
      key: epic.key as string,
      children: epic.children.map((story: any) => ({
        ...story,
        title: 'Story: ' + story.name,
        key: story.key as string,
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
          key: task.key as string,
        })),
      })),
    }));
    // build milestone data
    let miledstoneData = treeData.milestones.map((m: any) => ({
      ...m,
      title: `${m.name}: ${m.storyPoint} pts, ${m.startDate}-${m.endDate}`,
      key: m.key as string,
      children: m.children.map((s: any) => ({
        ...s,
        title: `${s.name}: ${s.storyPoint} pts, ${s.startDate}-${s.endDate}`,
        key: s.key as string,
        // 将children中的key值转换为string类型
        children: s.children.map((st: any) => ({
          ...st,
          title: `Story: ${st.name}, ${st.storyPoint} pts, ${st.startDate}-${st.endDate}`,
          key: (st.key as string) + random(1, 100),
          children: st.children.map((t: any) => ({
            ...t,
            title: (
              <Flex vertical>
                <div>
                  {t.name}, {t.storyPoint} pts, {t.startDate}-{t.endDate}
                </div>
                <div
                  style={{
                    marginLeft: 20,
                    padding: 3,
                  }}
                >
                  {t.description}
                </div>
              </Flex>
            ),
            key: t.key as string,
          })),
        })),
      })),
    }));
    return [
      {
        label: 'Task Breakdown',
        key: 'task-breakdown',
        children: (
          <Tree
            className="draggable-tree"
            defaultExpandAll={true}
            treeData={epicsData}
          />
        ),
      },
      {
        label: 'Work Schedule',
        key: 'working-schedule',
        children: (
          <Tree
            className="draggable-tree"
            defaultExpandAll={true}
            treeData={miledstoneData}
          />
        ),
      },
    ];
  };

  if (!doc && !devPlan) {
    return (
      <Flex justify="center" align="center" style={{ height: '60%' }}>
        <div style={{ width: '30rem' }}>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '2em' }}>
                <Typography.Title level={1}>Omniflow AI</Typography.Title>
                <Typography.Title level={4}>
                  Enter Email to continue
                </Typography.Title>
              </div>
              <Card
                style={{ boxShadow: '0px 2px 6px hsla(210, 50%, 10%, 0.15)' }}
              >
                <Form
                  form={form}
                  size="large"
                  layout="vertical"
                  autoComplete="off"
                  style={{ width: '100%' }}
                  onFinish={onFinish}
                >
                  <Form.Item
                    label="Email"
                    name="inputEmail"
                    rules={[{ validator: validateEmail }]}
                  >
                    <Input
                      placeholder="Enter your email"
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  {errMsg && (
                    <Alert
                      message={errMsg}
                      type="error"
                      closable
                      style={{ margin: '16px 0' }}
                    />
                  )}
                  <Button
                    type="primary"
                    block
                    htmlType="submit"
                    loading={isLoading}
                  >
                    {isLoading ? 'Submiting' : 'Submit'}
                  </Button>
                </Form>
              </Card>
            </>
          )}
        </div>
      </Flex>
    );
  }

  return (
    <div className="app-share-container">
      <Flex
        justify="space-between"
        align="center"
        style={{ borderBottom: '1px solid #0000001a', padding: '16px' }}
      >
        <Typography.Text
          style={{ flex: '1 1', fontSize: '1.8em', fontWeight: 700 }}
        >
          Omniflow
        </Typography.Text>
        <Button type="primary" size="large" onClick={handleTry}>
          Try Omniflow
        </Button>
      </Flex>
      <Flex vertical style={{ width: '90%', height: '100%', margin: '0 auto' }}>
        <Typography.Title level={4} style={{ textAlign: 'center' }}>
          {doc?.name}
        </Typography.Title>
        <Flex>
          {doc?.type !== DOCTYPE.DEVELOPMENT_PLAN ? (
            <HtmlPreview content={doc?.contents} />
          ) : (
            <Tabs
              defaultActiveKey="task-breakdown"
              hideAdd={true}
              items={getTabData()}
            />
          )}
        </Flex>
      </Flex>
    </div>
  );
}
