import { Alert, Spin } from 'antd';

export function LoadingScreen() {
  return (
    <Alert
      message="Loading"
      description="Please wait a moment..."
      type="info"
      showIcon
      icon={<Spin />}
      style={{ zIndex: 999 }}
    />
  );
}
