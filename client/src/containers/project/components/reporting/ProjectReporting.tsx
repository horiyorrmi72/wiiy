import { Outlet, redirect, useLocation } from 'react-router';

import SecondaryMenu, {
  SecondaryMenuItem,
} from '../../../../common/components/SecondaryMenu';
import { SnapshotPath } from '../../../nav/paths';
import { useProject } from '../Project';

import './ProjectReporting.scss';

const MenuItems: ReadonlyArray<SecondaryMenuItem> = [
  {
    key: SnapshotPath,
    label: 'Insights',
    link: SnapshotPath,
  },
  // {
  //   key: WeeklyPath,
  //   label: 'Weekly Report',
  //   link: WeeklyPath,
  // },
];

function useActiveMenuKey(): string {
  const location = useLocation();
  const pathComponents = location.pathname.split('/');
  // Note: the pathname starts with a / so the first pathComponent will be empty
  return pathComponents.length >= 5 ? pathComponents[4] : MenuItems[0].key;
}

export function ProjectReportingIndex() {
  return redirect(SnapshotPath);
}

export function ProjectReporting() {
  const { project } = useProject();
  const activeKey = useActiveMenuKey();

  return (
    <>
      <SecondaryMenu items={MenuItems} activeKey={activeKey} />
      <Outlet context={{ project }} />
    </>
  );
}
