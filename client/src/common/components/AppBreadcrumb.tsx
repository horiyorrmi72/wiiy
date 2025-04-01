import { useCallback } from 'react';
import { Breadcrumb } from 'antd';
import { useNavigate } from 'react-router-dom';

export interface BreadCrumbItem {
  label: string;
  key: string;
  link?: string;
}

interface ComponentProps {
  items: ReadonlyArray<BreadCrumbItem>;
}

export default function AppBreadcrumb({ items }: ComponentProps) {
  const navigate = useNavigate();
  const onItemClick = useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      let link = e.currentTarget.getAttribute('href');
      console.log('onItemClick:');
      e.preventDefault();
      navigate(link as string);
    },
    [navigate]
  );
  const breadcrumbItems: any[] = items.map((item) => {
    return {
      href: item.link,
      title: item.label,
      onClick: onItemClick,
    };
  });

  return (
    <Breadcrumb
      style={{ marginBottom: '0px', flexGrow: '1' }}
      items={breadcrumbItems}
    />
  );
}
