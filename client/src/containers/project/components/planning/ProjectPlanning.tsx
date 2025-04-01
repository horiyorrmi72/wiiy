import { Outlet, redirect, useLocation } from 'react-router';

import SecondaryMenu from '../../../../common/components/SecondaryMenu';
import { BuilderPath, InfoPath } from '../../../nav/paths';
import { useProject } from '../Project';

const MenuItems = [
  {
    key: BuilderPath,
    label: 'Project Workflow',
    link: BuilderPath,
  },
  {
    key: InfoPath,
    label: 'Project Info',
    link: InfoPath,
  },
];

function useActiveMenuKey(): string {
  const location = useLocation();
  const pathComponents = location.pathname.split('/');
  // Note: the pathname starts with a / so the first pathComponent will be empty
  return pathComponents.length >= 5 ? pathComponents[4] : MenuItems[0].key;
}

export function ProjectPlanningIndex() {
  return redirect(BuilderPath);
}

export function ProjectPlanning() {
  const { project } = useProject();
  const activeKey = useActiveMenuKey();

  return (
    <>
      <SecondaryMenu items={MenuItems} activeKey={activeKey} />
      {/* <ActionGroup items={actionGroup} /> */}
      <Outlet context={{ project }} />
    </>
  );
}
