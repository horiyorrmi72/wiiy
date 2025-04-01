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

import './ProfilePopUp.scss';

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
  referalSource?: string;
  companyName?: string;
  companySize?: string;
  companyIndustry?: string;
  companyWebsite?: string;
};
type LayoutType = Parameters<typeof Form>[0]['layout'];
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

export default function EditProfilePopUp({
  requireCompanyData,
  requireProfileData,
  closeModal,
}: EditProfileProps) {
  const { user: currentUserProfile } = useCurrentUser();
  const { data: specialties } = useSpecialties();
  const userId = currentUserProfile.id;
  const [industryOptions] =
    useState<Array<{ value: string }>>(industryOptionsMap);

  const navigator = useNavigate();

  if (!userId) {
    throw new Error('userId is required');
  }

  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [spinning, setSpinning] = useState(false);
  const [hideForm, setHideForm] = useState(true);
  const [formLayout] = useState<LayoutType>('vertical');

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
      message.success('Your information has been saved successfully');
      setErrorMsg(undefined);
      // message.success('Your profile has been updated successfully');
    },
    onError: (error) => setErrorMsg(error.toString()),
  });

  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    const meta = (existingProfile?.meta as Prisma.JsonObject) ?? {};
    const orgMeta = (companyData?.meta as Prisma.JsonObject) ?? {};
    form.setFieldsValue({
      email: existingProfile?.email as string,
      firstname: existingProfile?.firstname as string,
      lastname: existingProfile?.lastname as string,
      specialty: existingProfile?.specialty as string,
      companyWebsite: companyData?.website as string,
      referalSource: meta?.referalSource as string,
      companyName: orgMeta?.name as string,
      companySize: orgMeta?.size as string,
      companyIndustry: orgMeta?.industry as string,
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
      referalSource,
      companyName,
      companySize,
      companyIndustry,
      companyWebsite,
    } = formValues;
    const { email, organizationId } = existingProfile || {};
    const profileReqsIsEmpty =
      !email || !organizationId || !firstname || !lastname;
    const companyReqsIsEmpty =
      !companyData?.id &&
      (!companyName || !companySize || !companyIndustry || !companyWebsite);
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
        referalSource,
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
    if (website?.startsWith('http://') || website?.startsWith('https://')) {
      setSpinning(true);
      setHideForm(true);
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
          setSpinning(false);
          setHideForm(false);
        })
        .catch((err) => {
          console.log(err);
          setSpinning(false);
        });
    } else {
      setErrorMsg(
        'Please enter a valid website url starting with http:// or https://'
      );
    }
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
    <Spin spinning={spinning}>
      <Form
        form={form}
        layout={formLayout}
        name="UserProfile"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        onFieldsChange={onFormValueChanged}
        onFinish={onSubmit}
        autoComplete="off"
        disabled={isLoading || !isSuccess}
      >
        <Form.Item label="Email" name="email">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Name" required>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name="firstname"
                noStyle
                rules={getValidationRules('first name', requireProfileData)}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col span={12}>
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
          label="How did you hear about us?"
          name="referalSource"
          rules={getValidationRules('referral source', requireCompanyData)}
        >
          <Select placeholder="Please select how you heard about us">
            <Select.Option value="search_engine">
              Search Engine (e.g., Google)
            </Select.Option>
            <Select.Option value="social_media">
              Social Media (e.g., LinkedIn, Twitter)
            </Select.Option>
            <Select.Option value="friend">Friend or Colleague</Select.Option>
            <Select.Option value="advertisement">Advertisement</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Company website"
          name="companyWebsite"
          rules={getValidationRules('website', requireCompanyData)}
        >
          <Input
            type="url"
            placeholder="Begin with http:// or https://"
            disabled={isLoading}
            onInput={debounce(inputHandle, 1000)}
          />
        </Form.Item>
        {!hideForm && (
          <>
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
                <Select.Option value={''}>{'Select a role'}</Select.Option>
                {industryOptions.map((sp, index) => (
                  <Select.Option key={index} value={sp.value}>
                    {sp.value}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {errorMsg && (
          <Form.Item wrapperCol={{ offset: 1, span: 18 }}>
            <Alert type="error" message={errorMsg} />
          </Form.Item>
        )}
        <Form.Item
          wrapperCol={{ offset: 1, span: 24 }}
          style={{ textAlign: 'center' }}
        >
          <Button
            type="primary"
            htmlType="submit"
            disabled={submitDisabled}
            loading={updateProfileMutation.isLoading}
          >
            Confirm
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
}
