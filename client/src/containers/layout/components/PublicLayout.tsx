import { Layout } from 'antd';
import { Outlet } from 'react-router';

import { ModalProvider } from '../../../common/components/AppModal';
import TopNavBarPublic from './TopNavBarPublic';

import '../styles/PublicLayout.scss';

export function PublicLayout() {
  return (
    <div className="app-container--public">
      <ModalProvider>
        <Layout style={{ height: '100%' }}>
          <Layout.Header className="app-header--public">
            <TopNavBarPublic />
          </Layout.Header>
          <Layout.Content className="app-main-area--public">
            <Outlet />
          </Layout.Content>
        </Layout>
      </ModalProvider>
    </div>
  );
}
