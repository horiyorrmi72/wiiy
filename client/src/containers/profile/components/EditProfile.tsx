import { useEffect, useState } from 'react';
import { Prisma } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Typography,
} from 'antd';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import trackEvent from '../../../trackingClient';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import { useUpdateOrganizationMutation } from '../../organization/api/getOrganizationUsersApi';
import { useOrganization } from '../../organization/hooks/useOrganization';
import { useSpecialties } from '../../organization/hooks/useSpecialties';
import { getCompanyInfo } from '../api/profileApi';
import { useUpdateProfileMutation } from '../hooks/useUpdateProfileMutation';
import useUserProfileQuery from '../hooks/useUserProfileQuery';

import './Profile.scss';

const COMPANY_SIZES = [
  { value: '<50', label: '<50 employees' },
  { value: '50-300', label: '50-300 employees' },
  { value: '300-500', label: '300-500 employees' },
  { value: '>500', label: '>500 employees' },
];

type FormValues = {
  email?: string;
  firstname?: string;
  lastname?: string;
  specialty?: string;
  velocity?: number;
  enableProposalGen?: boolean;
  companyName?: string;
  companySize?: string;
  companyIndustry?: string;
  companyWebsite?: string;
};

interface EditProfileProps {
  requireCompanyData: boolean;
  requireProfileData: boolean;
  closeModal?: () => void;
}

const industryOptionsMap = [
  { value: 'Agriculture' },
  { value: 'Automotive' },
  { value: 'Banking' },
  { value: 'Construction' },
  { value: 'Consumer Goods' },
  { value: 'Education' },
  { value: 'Energy' },
  { value: 'Entertainment' },
  { value: 'Financial Services' },
  { value: 'Food & Beverage' },
  { value: 'Healthcare' },
  { value: 'Hospitality' },
  { value: 'Insurance' },
  { value: 'Manufacturing' },
  { value: 'Media & Advertising' },
  { value: 'Real Estate' },
  { value: 'Retail' },
  { value: 'Technology' },
  { value: 'Telecommunications' },
  { value: 'Transportation & Logistics' },
];

export default function EditProfile({
  requireCompanyData,
  requireProfileData,
  closeModal,
}: EditProfileProps) {
  const { user: currentUserProfile } = useCurrentUser();
  const { data: specialties } = useSpecialties();
  const userId = currentUserProfile.id;
  const [industryOptions, setIndustryOptions] =
    useState<Array<{ value: string }>>(industryOptionsMap);

  const navigator = useNavigate();

  const handleSearch = (value: string) => {
    if (!value) {
      setIndustryOptions(industryOptionsMap);

      return;
    }

    const filteredOptions = industryOptions.filter((option) =>
      option.value.toLowerCase().includes(value.toLowerCase())
    );
    setIndustryOptions(filteredOptions);
  };

  if (!userId) {
    throw new Error('userId is required');
  }

  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [spinning, setSpinning] = useState(false);

  const {
    data: existingProfile,
    isLoading,
    isError,
    isSuccess,
    error,
  } = useUserProfileQuery(userId);
  const { data: companyData } = useOrganization();
  const updateOrgMutation = useUpdateOrganizationMutation({
    onSuccess: () => {
      setErrorMsg(undefined);
    },
  });

  const updateProfileMutation = useUpdateProfileMutation({
    onSuccess: () => {
      setErrorMsg(undefined);
      message.success('Your profile has been updated successfully');
      if (!currentUserProfile.specialty) {
        navigator('/issues');
      }
    },
    onError: (error) => setErrorMsg(error.toString()),
  });

  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    let meta = companyData?.meta as Prisma.JsonObject;
    form.setFieldsValue({
      email: existingProfile?.email as string,
      firstname: existingProfile?.firstname as string,
      lastname: existingProfile?.lastname as string,
      specialty: existingProfile?.specialty as string,
      companyWebsite: companyData?.website as string,
      companyName: companyData?.name as string,
      companySize: meta?.size as string,
      companyIndustry: meta?.industry as string,
    });
  }, [companyData, form, existingProfile]);

  if (isError) {
    setErrorMsg(
      'An error occurred while loading the existing profile: ' +
        (error || 'unknown error').toString()
    );
  }

  const onFormValueChanged = () => {
    const hasErrors = form.getFieldsError().some(({ errors }) => errors.length);
    const isDirty = form.isFieldsTouched();
    setSubmitDisabled(!isDirty || hasErrors);
  };

  const onSubmit = (formValues: FormValues) => {
    console.log(
      'updating profile with these values',
      formValues,
      existingProfile
    );
    const {
      firstname,
      lastname,
      specialty,
      velocity,
      enableProposalGen,
      companyName,
      companySize,
      companyIndustry,
      companyWebsite,
    } = formValues;
    const { email, organizationId } = existingProfile || {};
    const profileReqsIsEmpty =
      !email || !organizationId || !firstname || !lastname;
    const companyReqsIsEmpty =
      !companyName || !companySize || !companyIndustry || !companyWebsite;

    if (
      (requireProfileData && profileReqsIsEmpty) ||
      (requireCompanyData && companyReqsIsEmpty)
    ) {
      setErrorMsg('Please fill in all required values');
    } else {
      updateProfileMutation.mutate({
        id: userId,
        organizationId: organizationId!,
        email: email!,
        username: `${firstname} ${lastname}`,
        firstname: firstname!,
        lastname: lastname!,
        specialty,
        velocity,
        enableProposalGen,
      });

      updateOrgMutation.mutate({
        id: organizationId!,
        industry: companyIndustry!,
        name: companyName!,
        size: companySize!,
        website: companyWebsite!,
      });

      // track user profile update
      const updates = Object.keys(formValues).reduce((acc, key: string) => {
        if (
          formValues[key as keyof typeof formValues] !==
          (existingProfile || {})[key as keyof typeof existingProfile]
        ) {
          acc[key] = formValues[key as keyof typeof formValues];
        }
        return acc;
      }, {} as JsonObject);

      trackEvent('updateProfile', {
        distinct_id: email,
        payload: JSON.stringify({
          userId: userId,
          updates: JSON.stringify(updates),
        }),
      });
    }
  };

  const inputHandle = () => {
    let website = form.getFieldValue('companyWebsite')?.toLowerCase();
    setSpinning(true);
    setErrorMsg('');
    getCompanyInfo(website)
      .then((res) => {
        let { name, size, industry } = res;
        if (name) form.setFieldValue('companyName', name);
        if (size) {
          let sizeList = ['no ', 'small', 'medium', 'thousands'];
          let sizeIdx = Math.max(
            0,
            sizeList.findIndex((i) => size.toLowerCase().includes(i))
          );
          form.setFieldValue('companySize', COMPANY_SIZES[sizeIdx].value);
        }
        if (industry)
          form.setFieldValue(
            'companyIndustry',
            industryOptionsMap.find((i) =>
              industry.toLowerCase().includes(i.value.toLowerCase())
            )?.value
          );
      })
      .catch((err) => {
        console.log(err);
        setErrorMsg(err);
      })
      .finally(() => {
        setSpinning(false);
      });
  };

  const getValidationRules = (fieldName: string, isRequired: boolean) => {
    const baseRules = [
      { required: isRequired, message: `Please enter your ${fieldName}` },
    ];

    return baseRules;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="profile-form">
      <Spin spinning={spinning}>
        <Typography.Title level={4} className="main-heading">
          {currentUserProfile.specialty
            ? 'Update your profile'
            : 'Complete your profile'}
        </Typography.Title>
        <Form
          form={form}
          name="UserProfile"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFieldsChange={onFormValueChanged}
          onFinish={onSubmit}
          autoComplete="off"
          disabled={isLoading || !isSuccess}
          className="user-profile-form"
        >
          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Name" required>
            <Row>
              <Col span={12} style={{ paddingRight: '4px' }}>
                <Form.Item
                  name="firstname"
                  noStyle
                  rules={getValidationRules('first name', requireProfileData)}
                >
                  <Input placeholder="First Name" />
                </Form.Item>
              </Col>
              <Col span={12} style={{ paddingLeft: '4px' }}>
                <Form.Item
                  name="lastname"
                  noStyle
                  rules={getValidationRules('last name', requireProfileData)}
                >
                  <Input placeholder="Last Name" />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            label="Role"
            name="specialty"
            tooltip="Your main job function or title in your team"
            rules={getValidationRules('role', requireProfileData)}
          >
            <Select>
              <Select.Option value={''}>{'Select a role'}</Select.Option>
              {specialties
                ?.filter((item) => item.name !== '' && item.displayName !== '')
                .map((sp, index) => (
                  <Select.Option key={index} value={sp.name}>
                    {sp.displayName}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Website"
            name="companyWebsite"
            rules={getValidationRules('website', requireCompanyData)}
          >
            <Input
              placeholder="please enter your website"
              onInput={debounce(inputHandle, 2000)}
            />
          </Form.Item>
          <Form.Item
            label="Organization Name"
            name="companyName"
            rules={getValidationRules('company name', requireCompanyData)}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Organization Size"
            name="companySize"
            rules={getValidationRules('company size', requireCompanyData)}
          >
            <Select options={COMPANY_SIZES} />
          </Form.Item>
          <Form.Item
            label="Industry"
            name="companyIndustry"
            rules={getValidationRules('industry', requireCompanyData)}
          >
            <Select>
              <Select.Option value={''}>{'Select an industry'}</Select.Option>
              {industryOptions.map((sp, index) => (
                <Select.Option key={index} value={sp.value}>
                  {sp.value}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {/* <Form.Item
          label="Velocity"
          name="velocity"
          tooltip="Story points you can complete every 2 weeks"
        >
          <Input placeholder="Usually a number between 5-15" type="number" />
        </Form.Item> */}
          {errorMsg && (
            <Form.Item
              wrapperCol={{
                xs: { offset: 0, span: 24 },
                sm: { offset: 8, span: 16 },
              }}
            >
              <Alert type="error" message={errorMsg} />
            </Form.Item>
          )}
          <Form.Item
            wrapperCol={{
              xs: { offset: 0, span: 24 },
              sm: { offset: 8, span: 16 },
            }}
          >
            <Button
              type="primary"
              htmlType="submit"
              disabled={submitDisabled}
              loading={updateProfileMutation.isLoading}
            >
              Save
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
}
